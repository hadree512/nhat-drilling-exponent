"""
Loaders for the Equinor Volve open dataset (F-1 family) into the 1-ft-style
depth table used by N-hat (field units, sampled every 1 m of MD).

Source: Equinor ASA, Volve field data (Equinor Open Data Licence).
Expected layout (as organised locally):  <root>/wells/<wellbore>/<category>/...
"""
import glob
import os

import numpy as np
import pandas as pd

M2FT = 3.28084
T2KLBF = 2.20462          # metric tonne-force to klbf
SG2PPG = 8.3454
LPM2GPM = 0.264172
BAR2PSI = 14.5038
NULLS = [-999.25, -9999.0, -999.0]


def _dlis_frame(path, frame_index=0):
    from dlisio import dlis
    with dlis.load(path) as files:
        fr = files[0].frames[frame_index]
        c = fr.curves()
        df = pd.DataFrame({k: c[k] for k in c.dtype.names if c[k].ndim == 1})
    return df.replace(NULLS, np.nan)


def load_mudlog(root, wellbore):
    """Surface-logging DLIS -> depth table (one row per metre of MD)."""
    paths = sorted(glob.glob(os.path.join(root, "wells", wellbore, "mud_log", "MUD_LOG_*.DLIS")))
    if not paths:
        raise FileNotFoundError(f"no mud log for {wellbore}")
    df = pd.concat([_dlis_frame(p) for p in paths]).sort_values("TDEP")
    df = df.drop_duplicates("TDEP", keep="last").reset_index(drop=True)
    out = pd.DataFrame({
        "MD_m": df["TDEP"],
        "TVD_m": df.get("DVER"),
        "MD_ft": df["TDEP"] * M2FT,
        "TVD_ft": df.get("DVER") * M2FT,
        "Bit_in": df["BDIA"],
        "ROP_fph": df["ROPA"] * M2FT,
        "WOB_klbf": df["WOBA"] * T2KLBF,
        "RPM_surface": df["RPMA"],
        "RPM_bit_reported": df["RPMB"],
        "Torque": df["TQA"],
        "SPP_psi": df["SPPA"] * BAR2PSI,
        "Flow_gpm": df["MFIA"] * LPM2GPM,
        "MW_ppg": df["MDIA"] * SG2PPG,
        "ECD_surface_ppg": df["ECDT"] * SG2PPG if "ECDT" in df else np.nan,
        "Bit_revs": df["BRVC"],
        "Bit_dist_m": df["BDDI"],
        "Dxc_vendor": df["DXC"],
        "Gas_total": df.get("GASA"),
        "C1": df.get("MTHA"), "C2": df.get("ETHA"), "C3": df.get("PRPA"),
        "iC4": df.get("IBTA"), "nC4": df.get("NBTA"),
        "iC5": df.get("IPNA"), "nC5": df.get("NPNA"),
        "LITH_code": df.get("LITH"),
    })
    # bit runs: a new run starts when bit-drilled distance or total bit
    # revolutions drop, or when the bit size changes
    new = (out["Bit_dist_m"].diff() < -1) | (out["Bit_revs"].diff() < -100) | \
          (out["Bit_in"].diff().abs() > 0.1)
    out["Run"] = new.cumsum().astype(int)
    out["Wellbore"] = wellbore
    return out


def load_mwd(root, wellbore):
    """MWD/LWD composite DLIS: GR, density, downhole ECD and drilling dynamics,
    resampled to 1 m MD with the median."""
    paths = sorted(glob.glob(os.path.join(root, "wells", wellbore, "mwd_lwd", "WLC_RAW*.DLIS")))
    if not paths:
        return None
    df = _dlis_frame(paths[0])
    gr = next((c for c in ("GRCFM", "GRAFM", "GR1CFM") if c in df), None)
    sel = pd.DataFrame({"MD_m": df["TDEP"]})
    sel["GR"] = df[gr] if gr else np.nan
    sel["RHOB"] = df.get("BDCFM")
    sel["ECD_dh_ppg"] = df["ACTECDM"] * SG2PPG if "ACTECDM" in df else np.nan
    sel["APWD_psi"] = df["APRESM"] * BAR2PSI if "APRESM" in df else np.nan
    if {"SSRPMAXM", "SSRPMINM", "SSRPMAVM"}.issubset(df.columns):
        avg = df["SSRPMAVM"].where(df["SSRPMAVM"] > 5)
        sel["SS_dh"] = ((df["SSRPMAXM"] - df["SSRPMINM"]) / (2 * avg)).clip(0, 2)
        sel["RPM_dh_avg"] = df["SSRPMAVM"]
    sel["Lat_sev"] = df.get("V2SEVXYM")
    sel["Ax_sev"] = df.get("V2SEVZM")
    sel["MD_m"] = sel["MD_m"].round(0)
    return sel.groupby("MD_m").median().reset_index()


def load_pressures(root, wellbore):
    """Formation pressure tests (computed LAS), pressure in psi."""
    import lasio
    p = os.path.join(root, "wells", wellbore, "formation_pressure", "FM_PRESS_COMPUTED_MWD_1.LAS")
    if not os.path.exists(p):
        return None
    las = lasio.read(p).df().reset_index()
    las = las.rename(columns={"DEPTH": "MD_m", "PRES_FORM": "P_bar",
                              "PRES_MOBL": "Mobility_mD_cP", "PRES_QUAL": "Quality"})
    las["P_psi"] = las["P_bar"] * BAR2PSI
    las["Wellbore"] = wellbore
    return las


def build_wellbore(root, wellbore):
    """Mud log + MWD merged on MD (1 m)."""
    ml = load_mudlog(root, wellbore)
    ml["MD_m"] = ml["MD_m"].round(0)
    mwd = load_mwd(root, wellbore)
    if mwd is not None:
        ml = ml.merge(mwd, on="MD_m", how="left")
    # downhole ECD where measured, otherwise the surface value, otherwise MW
    ecd = ml.get("ECD_dh_ppg")
    ml["ECD_ppg"] = ecd.where(ecd > 7) if ecd is not None else np.nan
    if "ECD_surface_ppg" in ml:
        ml["ECD_ppg"] = ml["ECD_ppg"].fillna(ml["ECD_surface_ppg"].where(ml["ECD_surface_ppg"] > 7))
    ml["ECD_ppg"] = ml["ECD_ppg"].fillna(ml["MW_ppg"])
    return ml


def overburden_ppg(tvd_m, rhob, water_depth_m=91.0, air_gap_m=54.0,
                   rho_mudline=1.85, rho_matrix=2.60):
    """Overburden gradient (ppg EMW) by integrating density over TVD.

    Where density is missing, an exponential compaction curve
    rho(z) = rho_ma - (rho_ma - rho_ml) exp(-k z_bml) is used, with k fitted
    to the logged density.  Sea water (1.03 g/cc) and the air gap are included.
    """
    z = np.asarray(tvd_m, float)
    rho = np.asarray(rhob, float)
    zb = np.clip(z - air_gap_m - water_depth_m, 0, None)
    ok = np.isfinite(rho) & (rho > 1.6) & (zb > 0)
    k = 5e-4
    if ok.sum() > 50:
        y = np.log((rho_matrix - np.clip(rho[ok], None, rho_matrix - 0.01)) /
                   (rho_matrix - rho_mudline))
        k = max(float(-np.polyfit(zb[ok], y, 1)[0]), 1e-5)
    trend = rho_matrix - (rho_matrix - rho_mudline) * np.exp(-k * zb)
    rho_f = np.where(ok, rho, trend)
    order = np.argsort(z)
    zs, rs = z[order], rho_f[order]
    sv = np.zeros_like(zs)  # bar
    base = 1.03 * water_depth_m * 0.0980665
    zprev, acc = air_gap_m + water_depth_m, base
    for i, (zi, ri) in enumerate(zip(zs, rs)):
        if zi > zprev:
            acc += ri * (zi - zprev) * 0.0980665
            zprev = zi
        sv[i] = acc
    out = np.empty_like(sv)
    out[order] = sv
    with np.errstate(divide="ignore", invalid="ignore"):
        grad_sg = out / (0.0980665 * z)
    return grad_sg * SG2PPG, k
