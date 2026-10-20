"""
Volve F-1 family case study.

Calibrate on the normally pressured shales of the 15/9-F-1 pilot, then predict
pore pressure blind in 15/9-F-1 B and 15/9-F-1 C and compare with the measured
formation pressure tests of all four wellbores.

usage:  python scripts/volve_case.py --root D:/datasets/volve --out results/volve
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from nhat.core import NHat, NHatConfig, d_exponent  # noqa: E402
from nhat.io_volve import (SG2PPG, build_wellbore, load_pressures)  # noqa: E402

WELLS = ["15_9-F-1", "15_9-F-1_B", "15_9-F-1_C"]
PRESSURE_WELLS = ["15_9-F-1", "15_9-F-1_A", "15_9-F-1_B", "15_9-F-1_C"]
WATER_DEPTH, AIR_GAP = 91.0, 54.9          # m, from the daily drilling reports
RHO_N_SG = 1.03                            # normal (sea-water) pore gradient
NORMAL_INTERVAL = (350, 950)               # m TVD, 26 in section, sea-water mud
FIT_INTERVAL = (350, 2300)                 # m TVD, response coefficients


def fit_overburden(tables):
    """Pooled exponential compaction fit of bulk density against depth below
    mud line, used to build one overburden curve for the whole pad."""
    z, r = [], []
    for t in tables:
        ok = t["RHOB"].between(1.7, 2.9) & t["TVD_m"].notna()
        z.append(t.loc[ok, "TVD_m"] - AIR_GAP - WATER_DEPTH)
        r.append(t.loc[ok, "RHOB"])
    z, r = np.concatenate(z), np.concatenate(r)
    f = lambda zb, rml, k: 2.65 - (2.65 - rml) * np.exp(-k * zb)       # noqa: E731
    # the logged density only covers the deeper sections, so the mud-line
    # density is bounded to values typical of unconsolidated North Sea muds
    (rml, k), _ = curve_fit(f, z, r, p0=(1.85, 5e-4), bounds=([1.70, 1e-5], [2.00, 5e-3]))
    zz = np.arange(0, 4000.0, 1.0)
    rho = f(zz, rml, k)
    sv_bar = 1.03 * WATER_DEPTH * 0.0980665 + np.cumsum(rho) * 0.0980665
    tvd = zz + AIR_GAP + WATER_DEPTH
    obg_sg = sv_bar / (0.0980665 * tvd)
    return {"rho_mudline": float(rml), "k_per_m": float(k)}, tvd, obg_sg


def shale_mask(t, cutoff=0.5):
    gr = t["GR"]
    lo, hi = gr.quantile(0.05), gr.quantile(0.95)
    t["Vsh"] = ((gr - lo) / (hi - lo)).clip(0, 1)
    return t["Vsh"] >= cutoff


def prep(t):
    t = t[(t.ROP_fph > 3) & (t.WOB_klbf > 1) & (t.RPM_bit_reported > 10) &
          t.GR.notna()].copy()
    t["Motor_rpm"] = (t["RPM_bit_reported"] - t["RPM_surface"]).clip(lower=0)
    # downhole dynamics: measured stick-slip index replaces the surface proxy
    t["Torque"] = t["Torque"]
    return t


METHODS = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat"]


def test_windows(root, raw, tabs):
    """Formation pressure tests with the shale samples in the 50 m (TVD) above
    each test: the pressure is read in the sand, the exponent in the seal."""
    rows = []
    for w in PRESSURE_WELLS:
        fp = load_pressures(root, w)
        host = tabs.get(w, tabs["15_9-F-1"])      # F-1 A has no mud log: use the pilot
        ref = raw.get(w, raw["15_9-F-1"])
        fp["TVD_m"] = np.interp(fp["MD_m"], ref["MD_m"], ref["TVD_m"])
        fp["EMW_sg"] = fp["P_bar"] / (0.0980665 * fp["TVD_m"])
        for _, p in fp.iterrows():
            win = host[host["is_shale"] & host["TVD_m"].between(p.TVD_m - 50, p.TVD_m)]
            rows.append({"wellbore": w, "test_no": int(p.PRES_TST_NO), "MD_m": p.MD_m,
                         "TVD_m": p.TVD_m, "measured_sg": p.EMW_sg, "quality": p.Quality,
                         "win": win, "OBG_sg": float(np.interp(p.TVD_m, host.TVD_m, host.OBG_sg))})
    return rows


def evaluate(root, raw, tabs, model, cal_w, normal=(350, 950)):
    """Normal trend from the shallow shales of the calibration well; Eaton
    exponent fitted on the offset wells (F-1, F-1 A); blind on F-1 B, F-1 C."""
    from scipy.optimize import minimize_scalar
    from sklearn.linear_model import QuantileRegressor
    cal = tabs[cal_w]
    rows = test_windows(root, raw, tabs)
    out = pd.DataFrame([{k: v for k, v in r.items() if k != "win"} for r in rows])
    out["blind"] = ~out["wellbore"].isin([cal_w, "15_9-F-1_A"])
    out["n_shale"] = [len(r["win"]) for r in rows]
    for col in METHODS:
        m = cal["is_shale"] & cal["TVD_m"].between(*normal) & (cal[col] > 0.05)
        if m.sum() < 30:                      # e.g. vendor Dxc is blank over 580-1350 m
            for suf in ("ratio", "n", "pred", "P10", "P90", "pred_n12", "slope_per_km"):
                out[f"{col}_{suf}"] = np.nan
            continue
        qr = QuantileRegressor(quantile=0.5, alpha=0.0, solver="highs").fit(
            cal.loc[m, ["TVD_m"]] / 1000, np.log(cal.loc[m, col]))
        res = np.log(cal.loc[m, col]) - qr.predict(cal.loc[m, ["TVD_m"]] / 1000)
        q10, q90 = np.quantile(res, [0.10, 0.90])
        ratio = np.array([np.median(r["win"][col] / np.exp(qr.predict(r["win"][["TVD_m"]] / 1000)))
                          if len(r["win"]) else np.nan for r in rows])
        out[f"{col}_ratio"] = ratio
        pp = lambda n, rr, ob: ob - (ob - RHO_N_SG) * np.clip(rr, 0.05, 3) ** n   # noqa: E731
        off = (~out["blind"]) & np.isfinite(ratio)
        fit = minimize_scalar(lambda n: np.mean((pp(n, ratio[off], out.OBG_sg[off]) -
                                                 out.measured_sg[off]) ** 2),
                              bounds=(0.05, 6), method="bounded")
        n = fit.x
        out[f"{col}_n"] = n
        out[f"{col}_pred"] = pp(n, ratio, out.OBG_sg)
        out[f"{col}_P10"] = pp(n, ratio * np.exp(-q10), out.OBG_sg)
        out[f"{col}_P90"] = pp(n, ratio * np.exp(-q90), out.OBG_sg)
        out[f"{col}_pred_n12"] = pp(1.2, ratio, out.OBG_sg)
        out[f"{col}_slope_per_km"] = qr.coef_[0]
    # reference (null) predictors
    off_mean = out.loc[~out.blind, "measured_sg"].mean()
    out["offset_mean_pred"] = off_mean
    out["hydrostatic_pred"] = RHO_N_SG
    return out


def score(comp):
    metrics = {}
    names = METHODS + ["offset_mean", "hydrostatic"]
    for col in names:
        key = f"{col}_pred"
        e = (comp[key] - comp["measured_sg"])[comp.blind].dropna()
        metrics[col] = {"n_blind": int(len(e)), "bias_sg": round(float(e.mean()), 4),
                        "rmse_sg": round(float(np.sqrt((e ** 2).mean())), 4),
                        "mae_sg": round(float(e.abs().mean()), 4)}
        if col in METHODS and comp[f"{col}_n"].notna().any():
            metrics[col]["eaton_n"] = round(float(comp[f"{col}_n"].iloc[0]), 3)
            metrics[col]["trend_slope_per_km"] = round(float(comp[f"{col}_slope_per_km"].iloc[0]), 4)
            e12 = (comp[f"{col}_pred_n12"] - comp["measured_sg"])[comp.blind].dropna()
            metrics[col]["rmse_sg_eaton_1p2"] = round(float(np.sqrt((e12 ** 2).mean())), 4)
            b = comp[comp.blind].dropna(subset=[f"{col}_P10"])
            lo = b[[f"{col}_P10", f"{col}_P90"]].min(axis=1)
            hi = b[[f"{col}_P10", f"{col}_P90"]].max(axis=1)
            metrics[col]["p10_p90_coverage"] = round(float(((b.measured_sg >= lo) &
                                                            (b.measured_sg <= hi)).mean()), 3)
            metrics[col]["band_width_sg"] = round(float((hi - lo).median()), 4)
    return metrics


def main(root, out):
    os.makedirs(out, exist_ok=True)
    raw = {w: build_wellbore(root, w) for w in WELLS}
    ob_par, ob_tvd, ob_sg = fit_overburden(raw.values())

    cfg = NHatConfig(rho_normal_ppg=RHO_N_SG * SG2PPG, persistence_ft=10)
    model = NHat(cfg)
    tabs = {}
    for w, t in raw.items():
        t = prep(t)
        t["is_shale"] = shale_mask(t)
        t = model.prepare(t)
        if "SS_dh" in t:                       # measured downhole stick-slip
            t["SSI"] = t["SS_dh"].fillna(0).clip(0, 1.5)
        t["OBG_sg"] = np.interp(t["TVD_m"], ob_tvd, ob_sg)
        tabs[w] = t

    cal_w = "15_9-F-1"
    c = tabs[cal_w]
    # drilling-response coefficients: shales of the pilot above the reservoir
    # section; normal compaction trend: shallow sea-water-drilled shales
    cal = c["is_shale"] & c["TVD_m"].between(*FIT_INTERVAL)
    fitted = model.fit(c, cal)
    for w, t in tabs.items():
        tabs[w] = model.transform(t)
        tabs[w].to_csv(os.path.join(out, f"{w}_nhat.csv"), index=False)

    comp = evaluate(root, raw, tabs, model, cal_w, normal=NORMAL_INTERVAL)
    comp.to_csv(os.path.join(out, "pressure_comparison.csv"), index=False)
    metrics = score(comp)
    sens = {}
    for lo, hi in [(350, 700), (350, 950), (600, 950), (350, 1350), (350, 2300)]:
        sens[f"{lo}-{hi}"] = {k: v["rmse_sg"] for k, v in
                              score(evaluate(root, raw, tabs, model, cal_w, (lo, hi))).items()}
    summary = {"overburden": ob_par,
               "fitted": {k: v for k, v in fitted.items() if k != "k_run_per_Mrev"},
               "k_run_per_Mrev": {str(k): v for k, v in fitted["k_run_per_Mrev"].items()},
               "normal_interval_m": NORMAL_INTERVAL, "fit_interval_m": FIT_INTERVAL,
               "metrics": metrics, "sensitivity_rmse_by_normal_interval": sens}
    with open(os.path.join(out, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2, default=float)
    print(json.dumps(summary, indent=2, default=float))
    print(comp[["wellbore", "TVD_m", "measured_sg", "n_shale"] +
               [f"{c}_pred" for c in METHODS]].round(3).to_string())
    return tabs, comp, summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="D:/datasets/volve")
    ap.add_argument("--out", default="results/volve")
    a = ap.parse_args()
    main(a.root, a.out)
