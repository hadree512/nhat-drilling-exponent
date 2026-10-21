"""
Core N-hat (normalized drilling exponent) calculations.

Field units are used throughout:
    ROP ft/h, rotary speed rev/min, WOB klbf, bit diameter in,
    mud weight / ECD lbm/gal, flow gal/min, pressure psi, TFA in^2, depth ft.

The method in short
-------------------
1.  The classic d-exponent (Jorden and Shirley 1966) and its mud-weight
    corrected form Dxc (Rehm and McClendon 1971).
2.  The ROP is mapped to reference drilling conditions before the exponent is
    formed:

        R* = R * (N_ref / N_bit)^alpha            rotary-speed response
               * (min(HSI/HSI_ref, 1))^(-beta)    insufficient bit hydraulics
               * exp(-g_ss*SSI - g_wh*WI)          vibration (torque / WOB CV)
               * exp(-k_run * n_rev)               bit wear within each run

    alpha, beta, g_ss and g_wh are fitted on a calibration interval with a
    robust (Huber) regression of ln R; k_run is fitted run by run from the
    residual drift against cumulative bit revolutions.
3.  N-hat = log10(R*/(60 N_ref)) / log10(12 W / (1e3 D_b)) * (rho_n / ECD)
4.  The normal trend N-hat_0 is a median (quantile) regression of ln N-hat on
    TVD over the calibration interval; the 10th/90th residual quantiles give an
    uncertainty band that is carried through Eaton's equation to P10/P90 pore
    pressure.
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.linear_model import HuberRegressor, QuantileRegressor


@dataclass
class NHatConfig:
    rho_normal_ppg: float = 8.6        # normal pore-fluid gradient as mud weight
    rpm_ref: float = 100.0             # reference bit speed
    hsi_ref: float = 2.5               # hydraulics above this are taken as sufficient
    nozzle_cd: float = 0.95            # nozzle discharge coefficient
    eaton_n: float = 1.2               # Eaton exponent for drilling exponents
    obg_psi_ft: float = 1.0            # overburden gradient if no density log
    alpha_bounds: tuple = (0.3, 1.2)
    dyn_window_ft: int = 30            # rolling window for vibration indices
    min_run_points: int = 40           # minimum feet per bit run to fit wear drift
    band_quantiles: tuple = (0.10, 0.90)
    warn_ratio: float = 0.85
    severe_ratio: float = 0.70
    persistence_ft: int = 30           # an alarm must persist this many feet
    # switches for ablation studies (all on = full N-hat)
    use_bit_rpm: bool = True           # surface + motor speed instead of surface only
    use_alpha: bool = True             # fitted rotary-speed exponent (off = 1, as in d)
    use_hydraulics: bool = True
    use_dynamics: bool = True
    use_wear: bool = True
    fitted: dict = field(default_factory=dict)


# ---------------------------------------------------------------- classic
def d_exponent(rop, rpm, wob_klbf, bit_in):
    """Jorden & Shirley (1966): d = log10(R/60N) / log10(12W/10^6 D), W in lbf."""
    rop, rpm, wob, bit = (np.asarray(x, float) for x in (rop, rpm, wob_klbf, bit_in))
    with np.errstate(divide="ignore", invalid="ignore"):
        num = np.log10(rop / (60.0 * rpm))
        den = np.log10(12.0 * wob / (1000.0 * bit))
        d = num / den
    bad = (rop <= 0) | (rpm <= 0) | (wob <= 0) | (den > -0.05) | ~np.isfinite(d)
    return np.where(bad, np.nan, d)


def dxc(d, ecd_ppg, rho_normal_ppg):
    """Rehm & McClendon (1971) mud-weight correction."""
    return np.asarray(d) * rho_normal_ppg / np.asarray(ecd_ppg, float)


# ---------------------------------------------------------- bit quantities
def bit_rpm(surface_rpm, motor_rpm=None):
    """Bit speed = surface rotation + positive-displacement motor output."""
    s = np.nan_to_num(np.asarray(surface_rpm, float))
    if motor_rpm is None:
        return s
    return s + np.nan_to_num(np.asarray(motor_rpm, float))


def bit_hydraulics(mw_ppg, flow_gpm, tfa_in2, bit_in, cd=0.95):
    """Bit pressure drop (psi) and hydraulic horsepower per square inch.

    dP_bit = rho Q^2 / (12031 Cd^2 A^2)   (Bourgoyne et al. 1986, Eq. 4.84)
    HSI    = dP_bit Q / 1714 / (pi D^2 / 4)
    """
    rho, q, a, d = (np.asarray(x, float) for x in (mw_ppg, flow_gpm, tfa_in2, bit_in))
    with np.errstate(divide="ignore", invalid="ignore"):
        dp = rho * q ** 2 / (12031.0 * cd ** 2 * a ** 2)
        hsi = dp * q / 1714.0 / (np.pi * d ** 2 / 4.0)
    return dp, hsi


def run_revolutions(depth_ft, rop_fph, bit_rpm_, run_id):
    """Cumulative bit revolutions inside each bit run (time = depth / ROP)."""
    df = pd.DataFrame({"z": depth_ft, "r": rop_fph, "n": bit_rpm_, "run": run_id})
    dz = df["z"].diff().clip(lower=0).fillna(0)
    minutes = 60.0 * dz / df["r"].where(df["r"] > 0)
    revs = (df["n"] * minutes).fillna(0)
    return revs.groupby(df["run"]).cumsum().to_numpy()


def vibration_indices(torque, wob, window):
    """Rolling coefficient of variation of surface torque (stick-slip proxy)
    and of WOB (axial / whirl proxy)."""
    t = pd.Series(np.asarray(torque, float))
    w = pd.Series(np.asarray(wob, float))
    ssi = t.rolling(window, center=True, min_periods=5).std() / t.rolling(
        window, center=True, min_periods=5).mean().abs()
    wi = w.rolling(window, center=True, min_periods=5).std() / w.rolling(
        window, center=True, min_periods=5).mean().abs()
    return ssi.clip(0, 1).fillna(0).to_numpy(), wi.clip(0, 1).fillna(0).to_numpy()


# ------------------------------------------------------------- the method
class NHat:
    """Fit-and-apply implementation of the N-hat exponent.

    Required columns: MD_ft, TVD_ft, ROP_fph, RPM_surface, WOB_klbf, Bit_in,
    MW_ppg.  Optional: Motor_rpm, ECD_ppg, Flow_gpm, TFA_in2, Torque, Run.
    """

    def __init__(self, config=None):
        self.cfg = config or NHatConfig()

    # .................................................. feature building
    def prepare(self, df):
        c = self.cfg
        df = df.copy()
        motor = df.get("Motor_rpm") if c.use_bit_rpm else None
        df["N_bit"] = bit_rpm(df["RPM_surface"], motor)
        ecd = df["ECD_ppg"] if "ECD_ppg" in df else df["MW_ppg"]
        df["d"] = d_exponent(df["ROP_fph"], df["N_bit"], df["WOB_klbf"], df["Bit_in"])
        df["d_surface_rpm"] = d_exponent(df["ROP_fph"], df["RPM_surface"].clip(lower=1),
                                         df["WOB_klbf"], df["Bit_in"])
        df["Dxc"] = dxc(df["d"], ecd, c.rho_normal_ppg)

        if {"Flow_gpm", "TFA_in2"}.issubset(df.columns):
            df["dP_bit_psi"], df["HSI"] = bit_hydraulics(
                df["MW_ppg"], df["Flow_gpm"], df["TFA_in2"], df["Bit_in"], c.nozzle_cd)
        else:
            df["dP_bit_psi"], df["HSI"] = np.nan, c.hsi_ref
        df["hyd_term"] = np.log(np.clip(df["HSI"].fillna(c.hsi_ref) / c.hsi_ref, 0.05, 1.0))

        if "Torque" in df:
            df["SSI"], df["WI"] = vibration_indices(df["Torque"], df["WOB_klbf"], c.dyn_window_ft)
        else:
            df["SSI"], df["WI"] = 0.0, vibration_indices(df["WOB_klbf"], df["WOB_klbf"],
                                                         c.dyn_window_ft)[1]
        run = df["Run"] if "Run" in df else pd.Series(0, index=df.index)
        df["n_rev"] = run_revolutions(df["MD_ft"], df["ROP_fph"], df["N_bit"], run)
        df["Run"] = run
        return df

    # ............................................................ fitting
    def fit(self, df, calib_mask):
        """Fit the response coefficients on the calibration interval."""
        c = self.cfg
        ok = calib_mask & np.isfinite(df["d"]) & (df["N_bit"] > 0)
        X = np.column_stack([
            df["TVD_ft"] / 1e4,
            np.log(12 * df["WOB_klbf"] / (1000 * df["Bit_in"])),
            np.log(df["N_bit"].clip(lower=1) / c.rpm_ref),
            df["hyd_term"],
            df["SSI"],
            df["WI"],
        ])[ok]
        y = np.log(df["ROP_fph"])[ok]
        names = ["depth", "ln_w", "alpha", "beta", "g_ss", "g_wh"]
        active = list(range(len(names)))
        for _ in range(len(names)):
            hub = HuberRegressor(max_iter=2000).fit(X[:, active], y)
            coef = dict(zip([names[i] for i in active], hub.coef_))
            # physical sign checks: drop terms that come out with the wrong sign
            drop = [n for n in ("beta",) if n in coef and coef[n] < 0]
            drop += [n for n in ("g_ss", "g_wh") if n in coef and coef[n] > 0]
            if not drop:
                break
            active = [i for i in active if names[i] not in drop]
        fitted = {n: float(coef.get(n, 0.0)) for n in names}
        fitted["alpha"] = float(np.clip(fitted["alpha"], *c.alpha_bounds))
        fitted["n_calib"] = int(ok.sum())
        fitted["r2_calib"] = float(hub.score(X[:, active], y))

        # run-wise wear drift from residuals against cumulative revolutions
        pred = hub.predict(np.column_stack([df[["TVD_ft"]].to_numpy()[:, 0] / 1e4,
                                            np.log(12 * df["WOB_klbf"] / (1000 * df["Bit_in"])),
                                            np.log(df["N_bit"].clip(lower=1) / c.rpm_ref),
                                            df["hyd_term"], df["SSI"], df["WI"]])[:, active])
        resid = np.log(df["ROP_fph"].clip(lower=0.1)) - pred
        k = {}
        for rid, g in df.assign(res=resid).groupby("Run"):
            g = g[np.isfinite(g["res"]) & np.isfinite(g["d"])]
            if len(g) >= c.min_run_points and g["n_rev"].max() > 0:
                slope = np.polyfit(g["n_rev"] / 1e6, g["res"], 1)[0]
                k[rid] = float(min(slope, 0.0))          # only slowing counts as wear
            else:
                k[rid] = 0.0
        fitted["k_run_per_Mrev"] = k
        c.fitted = fitted
        return fitted

    # ........................................................... applying
    def transform(self, df):
        c, f = self.cfg, self.cfg.fitted
        df = df.copy()
        k = df["Run"].map(f["k_run_per_Mrev"]).fillna(0.0) if c.use_wear else 0.0
        alpha = f["alpha"] if c.use_alpha else 1.0
        beta = f["beta"] if c.use_hydraulics else 0.0
        g_ss, g_wh = (f["g_ss"], f["g_wh"]) if c.use_dynamics else (0.0, 0.0)
        ln_rstar = (np.log(df["ROP_fph"].clip(lower=0.1))
                    - alpha * np.log(df["N_bit"].clip(lower=1) / c.rpm_ref)
                    - beta * df["hyd_term"]
                    - g_ss * df["SSI"] - g_wh * df["WI"]
                    - k * df["n_rev"] / 1e6)
        df["ROP_star"] = np.exp(ln_rstar)
        ecd = df["ECD_ppg"] if "ECD_ppg" in df else df["MW_ppg"]
        df["N_hat"] = d_exponent(df["ROP_star"], c.rpm_ref, df["WOB_klbf"],
                                 df["Bit_in"]) * c.rho_normal_ppg / ecd
        # individual correction factors as multipliers on Dxc (for reporting)
        df["f_total"] = df["N_hat"] / df["Dxc"]
        return df

    # ................................................ trend and pressure
    def baseline(self, df, calib_mask, col="N_hat", x="TVD_ft"):
        """Median regression of ln(col) on depth plus a residual-quantile band."""
        c = self.cfg
        ok = calib_mask & np.isfinite(df[col]) & (df[col] > 0)
        X = df.loc[ok, [x]].to_numpy() / 1e4
        y = np.log(df.loc[ok, col].to_numpy())
        qr = QuantileRegressor(quantile=0.5, alpha=0.0, solver="highs").fit(X, y)
        base = np.exp(qr.predict(df[[x]].to_numpy() / 1e4))
        res = y - qr.predict(X)
        lo, hi = np.quantile(res, c.band_quantiles)
        out = {f"{col}_0": base, f"{col}_0_lo": base * np.exp(lo), f"{col}_0_hi": base * np.exp(hi)}
        return out, {"intercept": float(qr.intercept_), "slope_per_10kft": float(qr.coef_[0]),
                     "res_lo": float(lo), "res_hi": float(hi)}

    def eaton(self, ratio, tvd_ft, obg_psi_ft=None):
        """Eaton (1975): Pp = S - (S - Pn) (x/x_n)^n, returned as ppg EMW."""
        c = self.cfg
        obg = c.obg_psi_ft if obg_psi_ft is None else obg_psi_ft
        s = obg / 0.052
        return s - (s - c.rho_normal_ppg) * np.clip(ratio, 0.2, 2.0) ** c.eaton_n

    def alarms(self, ratio):
        """Warning flag that must persist `persistence_ft` consecutive samples."""
        c = self.cfg
        raw = pd.Series(np.asarray(ratio) < c.warn_ratio)
        grp = (raw != raw.shift()).cumsum()
        length = raw.groupby(grp).transform("size")
        return (raw & (length >= c.persistence_ft)).to_numpy()
