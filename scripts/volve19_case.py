"""
Second blind test: the 1998 exploration sidetrack 15/9-19 BT2.

Everything (drilling-response coefficients, normal trends, Eaton exponents) is
taken unchanged from the 15/9-F-1 calibration of volve_case.py and applied to
a well drilled sixteen years earlier, with another rig, mud system and logging
contractor.  The predictions are compared with the 17 formation-multi-tester
pressures in the Hugin reservoir and with the pore-pressure curve the logging
contractor produced in real time (FPPG).  The six tests in the Ty sand, which
was already depleted by production when BT2 was drilled, are reported apart.

usage:  python scripts/volve19_case.py --root D:/datasets/volve --lis D:/build/nhat-work/lis --out results/volve19
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import volve_case as vc  # noqa: E402
from nhat.core import NHatConfig  # noqa: E402
from nhat.io_volve import M2FT, SG2PPG, T2KLBF, LPM2GPM, BAR2PSI  # noqa: E402

HERE = os.path.dirname(__file__)
METHODS = ["d", "Dxc_vendor", "Dxc", "N_hat"]


def load_bt2(lis_dir):
    m = pd.read_csv(os.path.join(lis_dir, "19BT2_mud_f0_s1.csv"))
    t = pd.DataFrame({
        "MD_m": m["DEPT"], "TVD_m": m["DVER"], "MD_ft": m["DEPT"] * M2FT, "TVD_ft": m["DVER"] * M2FT,
        "Bit_in": m["BDIA"], "ROP_fph": m["ROPA"] * M2FT, "WOB_klbf": m["WOBA"] * T2KLBF,
        "RPM_surface": m["RPMB"], "RPM_bit_reported": m["RPMB"], "Torque": m["TQA"],
        "SPP_psi": m["SPPA"] * BAR2PSI, "Flow_gpm": m["MFIA"] * LPM2GPM, "MW_ppg": m["MDIA"] * SG2PPG,
        "ECD_ppg": m["ECDT"] * SG2PPG, "Bit_revs": m["BRVC"], "Bit_dist_m": m["BDDI"],
        "Dxc_vendor": m["DXC"], "FPPG_sg": m["FPPG"], "LITH_code": m["LITH"],
        "C1": m["MTHA"], "C2": m["ETHA"], "C3": m["PRPA"], "iC4": m["IBTA"], "nC4": m["NBTA"],
        "Gas_total": m["GASX"]})
    new = (t["Bit_dist_m"].diff() < -1) | (t["Bit_in"].diff().abs() > 0.1)
    t["Run"] = 1000 + new.cumsum().astype(int)       # run ids that do not exist in F-1
    g = pd.read_csv(os.path.join(lis_dir, "19BT2_raw_f0_s0.csv"))[["DEPT", "GR"]].dropna()
    g = g.assign(MD_m=g["DEPT"].round(0)).groupby("MD_m")["GR"].median()
    t["GR"] = t["MD_m"].round(0).map(g)
    t["Wellbore"] = "15_9-19_BT2"
    return t


def lith_code_check(lis_dir):
    """Median gamma ray per contractor lithology code in 15/9-19 A, where both
    exist; used to justify code 62x as the claystone (shale) flag in BT2."""
    m = pd.read_csv(os.path.join(lis_dir, "19A_mud_f0_s1.csv"))
    g = pd.read_csv(os.path.join(lis_dir, "19A_cmp_f1_s0.csv"))[["DEPT", "GR"]].dropna()
    g = g.assign(D=g["DEPT"].round(0)).groupby("D")["GR"].median()
    m["GR"] = m["DEPT"].round(0).map(g)
    m["code_group"] = (np.floor(m["LITH"] / 10) * 10).astype("Int64")
    t = m.groupby("code_group").agg(samples=("GR", "size"), median_GR=("GR", "median")).reset_index()
    return t[t.samples >= 20].sort_values("median_GR", ascending=False)


def main(root, lis_dir, out):
    os.makedirs(out, exist_ok=True)
    lith_code_check(lis_dir).to_csv(os.path.join(out, "lith_code_gr_19A.csv"), index=False)
    # ---- calibration on the F-1 family exactly as in volve_case.py
    raw = {w: vc.build_wellbore(root, w) for w in vc.WELLS}
    ob_par, ob_tvd, ob_sg = vc.fit_overburden(raw.values())
    cfg = NHatConfig(rho_normal_ppg=vc.RHO_N_SG * SG2PPG, persistence_ft=10)
    model, tabs, fitted = vc.analyse(raw, ob_tvd, ob_sg, cfg)
    fits, _ = vc.calibrate_all(root, raw, tabs, vc.CAL_WELL, vc.NORMAL_INTERVAL)

    # ---- BT2 with the F-1 model: no downhole stick-slip or wear history, so
    # those terms are zero; WOB variability, speed exponent and ECD apply
    bt = load_bt2(lis_dir)
    bt = bt[(bt.ROP_fph > 3) & (bt.WOB_klbf > 1) & (bt.RPM_bit_reported > 10)].copy()
    has_gr = bt["GR"].notna()
    lo, hi = bt.loc[has_gr, "GR"].quantile([0.05, 0.95])
    bt["Vsh"] = ((bt["GR"] - lo) / (hi - lo)).clip(0, 1)
    lith_shale = np.floor(bt["LITH_code"] / 10) == 62         # code 62x: high-GR claystone (Section S6)
    bt["is_shale"] = np.where(has_gr, bt["Vsh"] >= 0.5, lith_shale)
    bt["Motor_rpm"] = 0.0
    bt = model.prepare(bt)
    bt["SSI"] = 0.0
    bt = model.transform(bt)
    bt["OBG_sg"] = np.interp(bt["TVD_m"], ob_tvd, ob_sg)
    for col in ("Dxc", "N_hat"):                 # sample-by-sample pore pressure for the plots
        f = fits[col]
        base = np.exp(f["qr"].predict(bt[["TVD_m"]] / 1000))
        bt[f"{col}_PP_sg"] = vc.eaton_sg(f["n"], bt[col] / base, bt["OBG_sg"])
    bt.to_csv(os.path.join(out, "15_9-19_BT2_nhat.csv"), index=False)

    fmt = pd.read_csv(os.path.join(HERE, "..", "data", "volve_15_9_19", "fmt_15_9_19BT2.csv"))
    fmt["measured_sg"] = fmt["sand_face_kPa"] / (9.80665 * fmt["TVD_m"])
    fmt["zone"] = np.where(fmt["TVD_m"] > 3000, "Hugin", "Ty (depleted)")
    rows = []
    for _, p in fmt.iterrows():
        win = vc.seal_window(bt, p.TVD_m)
        obg = float(np.interp(p.TVD_m, ob_tvd, ob_sg))
        row = {"test_no": int(p.test_no), "MD_m": p.MD_m, "TVD_m": p.TVD_m, "zone": p.zone,
               "measured_sg": round(p.measured_sg, 4), "n_shale": len(win), "OBG_sg": obg,
               "mud_weight_sg": round(p.hydrostatic_before_kPa / (9.80665 * p.TVD_m), 3),
               "FPPG_contractor_pred": float(win["FPPG_sg"].median()) if len(win) else np.nan}
        for col in METHODS:
            f = fits[col]
            if f is None or not len(win):
                row[f"{col}_pred"] = np.nan
                continue
            pr = predict_safe(f, win, obg)
            row[f"{col}_pred"], row[f"{col}_P10"], row[f"{col}_P90"], row[f"{col}_ratio"] = pr
        rows.append(row)
    comp = pd.DataFrame(rows)
    offs = [r for r in vc.test_windows(root, raw, tabs) if r["wellbore"] in (vc.CAL_WELL, "15_9-F-1_A")]
    comp["offset_mean_pred"] = float(np.mean([r["measured_sg"] for r in offs]))
    comp["hydrostatic_pred"] = vc.RHO_N_SG
    comp.to_csv(os.path.join(out, "bt2_pressure_comparison.csv"), index=False)

    metrics = {}
    for zone in ["Hugin", "Ty (depleted)"]:
        z = comp[comp.zone == zone]
        metrics[zone] = {}
        for col in METHODS + ["FPPG_contractor", "offset_mean", "hydrostatic"]:
            e = (z[f"{col}_pred"] - z["measured_sg"]).dropna()
            if len(e):
                metrics[zone][col] = {"n": int(len(e)), "rmse_sg": round(float(np.sqrt((e ** 2).mean())), 4),
                                      "bias_sg": round(float(e.mean()), 4)}
    summary = {"n_tests": int(len(comp)), "n_hugin": int((comp.zone == "Hugin").sum()),
               "measured_hugin_sg": [round(comp.loc[comp.zone == "Hugin", "measured_sg"].min(), 3),
                                     round(comp.loc[comp.zone == "Hugin", "measured_sg"].max(), 3)],
               "measured_ty_sg": [round(comp.loc[comp.zone != "Hugin", "measured_sg"].min(), 3),
                                  round(comp.loc[comp.zone != "Hugin", "measured_sg"].max(), 3)],
               "eaton_n_from_F1": {c: (round(fits[c]["n"], 3) if fits[c] else None) for c in METHODS},
               "bt2_rows": int(len(bt)), "bt2_md_range_m": [float(bt.MD_m.min()), float(bt.MD_m.max())],
               "bt2_mw_range_sg": [round(float(bt.MW_ppg.min() / SG2PPG), 2), round(float(bt.MW_ppg.max() / SG2PPG), 2)],
               "bt2_bit_rpm_median": float(bt.RPM_bit_reported.median()),
               "trends_from_F1": {c: ({"intercept": float(fits[c]["qr"].intercept_),
                                       "slope_per_km": float(fits[c]["qr"].coef_[0])} if fits[c] else None)
                                  for c in METHODS},
               "metrics": metrics}
    with open(os.path.join(out, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2, default=float)
    print(json.dumps(summary, indent=1, default=float))
    print(comp[["test_no", "TVD_m", "zone", "measured_sg", "n_shale", "FPPG_contractor_pred"] +
               [f"{c}_pred" for c in METHODS]].round(3).to_string())


def predict_safe(fit, win, obg):
    p = vc.predict(fit, win, obg)
    return tuple(float(x) for x in p)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="D:/datasets/volve")
    ap.add_argument("--lis", default="D:/build/nhat-work/lis")
    ap.add_argument("--out", default="results/volve19")
    a = ap.parse_args()
    main(a.root, a.lis, a.out)
