"""
Three extensions on the Volve wells and FORGE:

A. Log-based benchmark: Eaton's sonic method with a normal compaction trend
   taken from the shallow shales of the exploration well 15/9-19 SR and the
   exponent fitted on the F-1 / F-1 A tests; blind on F-1 B.
B. Mud gas: light-hydrocarbon ratios (wetness, balance, character; Haworth
   et al. 1985), volume-normalised gas, and their relation to N-hat.
C. Mechanical specific energy (Teale 1965) as a drilling-efficiency filter:
   does removing inefficient-drilling samples change the exponent results?

usage:  python scripts/addenda.py --root D:/datasets/volve --lis D:/build/nhat-work/lis --out results/addenda
"""
import argparse
import glob
import json
import os
import sys

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import volve_case as vc  # noqa: E402
from nhat.core import NHatConfig  # noqa: E402
from nhat.io_volve import SG2PPG, _dlis_frame  # noqa: E402

KNM2FTLB = 737.562


# ------------------------------------------------------------------ helpers
def teale_mse_psi(wob_klbf, bit_in, rpm, torque_ftlb, rop_fph):
    """Mechanical specific energy (psi), Teale (1965), field units."""
    area = np.pi * bit_in ** 2 / 4.0
    with np.errstate(divide="ignore", invalid="ignore"):
        return wob_klbf * 1000.0 / area + 120.0 * np.pi * rpm * torque_ftlb / (area * rop_fph)


def dysfunction_flag(mse, window=101, factor=2.5):
    """Samples whose MSE exceeds `factor` times the running median: drilling
    energy is being lost to vibration, balling or a worn bit rather than to
    cutting rock."""
    s = pd.Series(np.asarray(mse, float))
    med = s.rolling(window, center=True, min_periods=15).median()
    return (s > factor * med).to_numpy()


def gas_ratios(c1, c2, c3, c4, c5):
    """Wetness, balance and character ratios (Haworth et al. 1985)."""
    tot = c1 + c2 + c3 + c4 + c5
    with np.errstate(divide="ignore", invalid="ignore"):
        wh = 100.0 * (c2 + c3 + c4 + c5) / tot
        bh = (c1 + c2) / (c3 + c4 + c5)
        ch = (c4 + c5) / c3
    return wh, bh, ch


def haworth_class(wh, bh):
    """Fluid character after Haworth et al. (1985)."""
    if not np.isfinite(wh) or not np.isfinite(bh):
        return "n/a"
    if wh < 0.5:
        return "very light, dry gas"
    if wh < 17.5:
        return "gas" if bh > wh else "gas condensate / light oil"
    if wh < 40:
        return "oil" if bh < wh else "gas condensate"
    return "residual / heavy oil"


# ------------------------------------------------------------------ A. sonic
def load_dtc(root, wellbore):
    out = []
    for p in sorted(glob.glob(os.path.join(root, "wells", wellbore, "mwd_lwd", "WL_RAW_AAC_MWD_*.DLIS"))):
        try:
            f = _dlis_frame(p)
        except Exception:                      # noqa: BLE001
            continue
        if "DTC" in f:
            d = f[["TDEP", "DTC"]].copy()
            d = d[(d.DTC > 40) & (d.DTC < 200)]
            out.append(d)
    if not out:
        return None
    d = pd.concat(out)
    d["MD_m"] = d["TDEP"].round(0)
    return d.groupby("MD_m")["DTC"].median().reset_index()


def sonic_benchmark(root, lis_dir, raw, tabs, ob_tvd, ob_sg):
    from scipy.optimize import minimize_scalar
    from sklearn.linear_model import QuantileRegressor
    # No open Volve well has sonic in the shallow, clearly normal section.  The
    # shallowest sonic is in the exploration well 15/9-19 A (from 2,119 m MD);
    # its upper 300 m of shale (Hordaland Group) is ASSUMED normally pressured.
    c = pd.read_csv(os.path.join(lis_dir, "19A_cmp_f1_s0.csv"))[["DEPT", "HAC", "GR"]].dropna()
    c = c.rename(columns={"HAC": "AC"})
    tv = pd.read_csv(os.path.join(lis_dir, "19A_mud_f0_s1.csv"))[["DEPT", "DVER"]].dropna()
    c = c[c.DEPT >= tv.DEPT.min()]
    c["TVD_m"] = np.interp(c["DEPT"], tv["DEPT"], tv["DVER"])
    c = c[(c.AC > 40) & (c.AC < 200)]
    lo, hi = c.GR.quantile([0.05, 0.95])
    sh = ((c.GR - lo) / (hi - lo)) >= 0.5
    top = c.loc[sh, "TVD_m"].min()
    normal = (top, top + 300.0)
    m = sh & c.TVD_m.between(*normal)
    qr = QuantileRegressor(quantile=0.5, alpha=0.0, solver="highs").fit(c.loc[m, ["TVD_m"]] / 1000,
                                                                         np.log(c.loc[m, "AC"]))
    res = np.log(c.loc[m, "AC"]) - qr.predict(c.loc[m, ["TVD_m"]] / 1000)
    q10, q90 = np.quantile(res, [0.10, 0.90])
    trend = {"well": "15/9-19 A", "normal_tvd_m": [float(normal[0]), float(normal[1])],
             "intercept": float(qr.intercept_), "slope_per_km": float(qr.coef_[0]),
             "n_samples": int(m.sum()), "dt_at_3km_us_ft": float(np.exp(qr.intercept_ + 3 * qr.coef_[0]))}

    rows = []
    for w in ["15_9-F-1", "15_9-F-1_A", "15_9-F-1_B"]:
        # F-1 A has no mud log; as in the exponent study its tests are read
        # against the pilot's shales (and sonic) at the same TVD
        hw = w if w in tabs else "15_9-F-1"
        dt = load_dtc(root, hw)
        h = tabs[hw][["MD_m", "TVD_m", "is_shale"]].merge(dt, on="MD_m", how="inner")
        fp = vc.load_pressures(root, w)
        ref = raw.get(w, raw["15_9-F-1"])
        fp["TVD_m"] = np.interp(fp["MD_m"], ref["MD_m"], ref["TVD_m"])
        fp["EMW"] = fp["P_bar"] / (0.0980665 * fp["TVD_m"])
        for _, p in fp.iterrows():
            win = vc.seal_window(h, p.TVD_m)
            if not len(win):
                continue
            dtn = np.exp(qr.predict(win[["TVD_m"]] / 1000))
            ratio = float(np.median(dtn / win["DTC"]))
            rows.append({"wellbore": w, "TVD_m": p.TVD_m, "measured_sg": p.EMW, "ratio": ratio,
                         "OBG_sg": float(np.interp(p.TVD_m, ob_tvd, ob_sg)), "n_shale": len(win)})
    r = pd.DataFrame(rows)
    pp = lambda n, rr, ob: ob - (ob - vc.RHO_N_SG) * np.clip(rr, 0.05, 3) ** n   # noqa: E731
    off = r.wellbore.isin(["15_9-F-1", "15_9-F-1_A"])
    n = minimize_scalar(lambda n: np.mean((pp(n, r.ratio[off], r.OBG_sg[off]) - r.measured_sg[off]) ** 2),
                        bounds=(0.05, 8), method="bounded").x
    r["sonic_pred"] = pp(n, r.ratio, r.OBG_sg)
    r["sonic_pred_n3"] = pp(3.0, r.ratio, r.OBG_sg)
    b = r[~off]
    e, e3 = b.sonic_pred - b.measured_sg, b.sonic_pred_n3 - b.measured_sg
    out = {"trend": trend, "q10": float(q10), "q90": float(q90), "eaton_n_fitted": float(n),
           "n_offset": int(off.sum()), "n_blind": int(len(b)),
           "blind_rmse_sg": float(np.sqrt((e ** 2).mean())) if len(b) else None,
           "blind_bias_sg": float(e.mean()) if len(b) else None,
           "blind_rmse_sg_n3": float(np.sqrt((e3 ** 2).mean())) if len(b) else None,
           "ratio_median_blind": float(b.ratio.median()) if len(b) else None}
    return out, r, c.assign(is_shale=sh), qr


# ------------------------------------------------------------------ B. gas
def gas_study(raw, tabs, root):
    rows, per = [], {}
    for w in vc.WELLS:
        t = tabs[w].copy()
        c5 = (t["iC5"].fillna(0) + t["nC5"].fillna(0)).to_numpy() if "iC5" in t else np.zeros(len(t))
        c4 = (t["iC4"].fillna(0) + t["nC4"].fillna(0)).to_numpy()
        wh, bh, ch = gas_ratios(t["C1"].to_numpy(float), t["C2"].to_numpy(float), t["C3"].to_numpy(float), c4, c5)
        t["Wh"], t["Bh"], t["Ch"] = wh, bh, ch
        hole_area = np.pi * (t["Bit_in"] * 0.0254) ** 2 / 4.0                 # m2
        rock_m3_per_min = (t["ROP_fph"] / 3.28084 / 60.0) * hole_area
        flow_m3_per_min = t["Flow_gpm"] / 264.172
        t["Gas_norm"] = t["Gas_total"] * flow_m3_per_min / rock_m3_per_min.where(rock_m3_per_min > 0)
        tabs[w] = t
        deep = t[t.TVD_m > 2500]
        res = deep[deep.is_shale & np.isfinite(deep.N_hat) & np.isfinite(deep.Gas_norm) & (deep.Gas_norm > 0)]
        rho = spearmanr(res.N_hat, res.Gas_norm).statistic if len(res) > 30 else np.nan
        fp = vc.load_pressures(root, w)
        z = None
        if fp is not None:
            top, base = fp.MD_m.min() - 10, fp.MD_m.max() + 10
            z = t[t.MD_m.between(top, base) & ~t.is_shale]
        per[w] = {"spearman_nhat_vs_normgas_deep_shale": round(float(rho), 3) if rho == rho else None,
                  "n_deep_shale": int(len(res)),
                  "reservoir_Wh_median": round(float(np.nanmedian(z.Wh)), 2) if z is not None and len(z) else None,
                  "reservoir_Bh_median": round(float(np.nanmedian(z.Bh)), 2) if z is not None and len(z) else None,
                  "reservoir_Ch_median": round(float(np.nanmedian(z.Ch)), 3) if z is not None and len(z) else None,
                  "shale_Wh_median_deep": round(float(np.nanmedian(res.Wh)), 2) if len(res) else None}
        if z is not None and len(z):
            per[w]["reservoir_class"] = haworth_class(per[w]["reservoir_Wh_median"], per[w]["reservoir_Bh_median"])
    return per, tabs


# ------------------------------------------------------------------ C. MSE
def mse_study(root, raw, tabs, model):
    out = {}
    for w, t in tabs.items():
        tq = t["Torque"].astype(float) * KNM2FTLB
        t["MSE_psi"] = teale_mse_psi(t["WOB_klbf"], t["Bit_in"], t["RPM_surface"].clip(lower=1), tq, t["ROP_fph"])
        t["dysfunction"] = dysfunction_flag(t["MSE_psi"])
        tabs[w] = t
        out[w] = {"mse_median_ksi": round(float(np.nanmedian(t.MSE_psi)) / 1000, 1),
                  "dysfunction_pct": round(100 * float(np.mean(t.dysfunction)), 1),
                  "spearman_mse_vs_nhat_shale": round(float(spearmanr(
                      t.loc[t.is_shale, "MSE_psi"], t.loc[t.is_shale, "N_hat"], nan_policy="omit").statistic), 3)}
    filt = {w: t.assign(is_shale=t["is_shale"] & ~t["dysfunction"]) for w, t in tabs.items()}
    comp = vc.evaluate(root, raw, filt, model, vc.CAL_WELL, vc.NORMAL_INTERVAL)
    sc = vc.score(comp)
    out["blind_rmse_with_mse_filter"] = {k: sc[k]["rmse_sg"] for k in ("d", "Dxc", "N_hat", "Dxc_vendor")}
    return out, tabs


def main(root, lis_dir, out):
    os.makedirs(out, exist_ok=True)
    raw = {w: vc.build_wellbore(root, w) for w in vc.WELLS}
    ob_par, ob_tvd, ob_sg = vc.fit_overburden(raw.values())
    cfg = NHatConfig(rho_normal_ppg=vc.RHO_N_SG * SG2PPG, persistence_ft=10)
    model, tabs, fitted = vc.analyse(raw, ob_tvd, ob_sg, cfg)

    sonic, sonic_rows, sr, _ = sonic_benchmark(root, lis_dir, raw, tabs, ob_tvd, ob_sg)
    sonic_rows.to_csv(os.path.join(out, "sonic_comparison.csv"), index=False)
    sr[["DEPT", "TVD_m", "AC", "GR", "is_shale"]].iloc[::5].to_csv(os.path.join(out, "sonic_19A_trend_samples.csv"), index=False)
    gas, tabs = gas_study(raw, tabs, root)
    mse, tabs = mse_study(root, raw, tabs, model)
    for w, t in tabs.items():
        t[["MD_m", "TVD_m", "is_shale", "N_hat", "Dxc", "Gas_total", "Gas_norm", "Wh", "Bh", "Ch", "MSE_psi",
           "dysfunction", "GR", "C1", "C2", "C3"]].to_csv(os.path.join(out, f"{w}_addenda.csv"), index=False)
    summary = {"sonic": sonic, "gas": gas, "mse": mse}
    with open(os.path.join(out, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2, default=float)
    print(json.dumps(summary, indent=1, default=float))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="D:/datasets/volve")
    ap.add_argument("--lis", default="D:/build/nhat-work/lis")
    ap.add_argument("--out", default="results/addenda")
    a = ap.parse_args()
    main(a.root, a.lis, a.out)
