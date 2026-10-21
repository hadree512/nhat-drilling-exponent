"""
Utah FORGE 16A(78)-32 case study (normally pressured control well).

Two questions are asked of each exponent:
  1. Basin-fill sediments (single 12.25 in bit run): calibrate the normal trend
     on the upper part and count the (false) overpressure alarms below it.
  2. Granite (many bit runs): how large are the jumps of the exponent at bit
     changes, and how much does it drift inside a run?  Neither should happen
     in a homogeneous, normally pressured rock if the normalisation is right.

usage:  python scripts/forge_case.py --data D:/build/nhat-work/forge --out results/forge
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from nhat.core import NHat, NHatConfig  # noqa: E402
from nhat.io_forge import build_depth_table  # noqa: E402

HERE = os.path.dirname(__file__)
GRANITE_TOP_MD = 4460.0          # ft, daily reports: weathered granite at 4,441-4,460 ft
SED_CAL_TVD = (1700.0, 3400.0)   # ft, calibration part of the sediment run
GRANITE_CAL_MD = (4470.0, 7390.0)  # ft, bit runs 5-23 calibrate, runs 29-38 test
METHODS = ["d_surface_rpm", "d", "Dxc", "N_hat"]
CORE_RUNS = [11, 45]             # coring runs are not drilling


def load(data_dir):
    df, runs, mud = build_depth_table(
        os.path.join(data_dir, "mudlog.las"), os.path.join(data_dir, "txt"),
        os.path.join(data_dir, "survey.xlsx"),
        os.path.join(HERE, "..", "data", "forge_16a", "motor_rpg.csv"))
    ok = ((df.ROP_fph > 0.5) & (df.ROP_fph < 500) & (df.WOB_klbf > 1) & (df.Flow_gpm > 100)
          & (df.Run > 0) & ~df.Run.isin(CORE_RUNS) & df.Bit_in.notna())
    return df[ok].reset_index(drop=True), runs, mud


def run_steps(t, col, edge_ft=30):
    """Absolute jump of ln(col) across each bit change (median of the last and
    first `edge_ft` feet of adjacent runs)."""
    jumps = []
    runs = t.groupby("Run")["MD_ft"].agg(["min", "max"]).sort_values("min")
    ids = list(runs.index)
    for a, b in zip(ids[:-1], ids[1:]):
        ga = t[(t.Run == a) & (t.MD_ft > runs.loc[a, "max"] - edge_ft)][col]
        gb = t[(t.Run == b) & (t.MD_ft < runs.loc[b, "min"] + edge_ft)][col]
        if len(ga) > 5 and len(gb) > 5 and runs.loc[b, "min"] - runs.loc[a, "max"] < 50:
            ga, gb = ga[ga > 0], gb[gb > 0]
            if len(ga) > 5 and len(gb) > 5:
                jumps.append(abs(np.log(gb.median()) - np.log(ga.median())))
    return float(np.median(jumps)) if jumps else np.nan, len(jumps)


def within_run_drift(t, col):
    """Median |slope| of ln(col) against cumulative bit revolutions (per 10^5 rev)."""
    s = []
    for _, g in t.groupby("Run"):
        g = g[np.isfinite(g[col]) & (g[col] > 0)]  # d is undefined when the bit is not rotated
        if len(g) > 40 and g["n_rev"].max() > 0:
            s.append(abs(np.polyfit(g["n_rev"] / 1e5, np.log(g[col]), 1)[0]))
    return float(np.median(s)) if s else np.nan


def section_metrics(model, t, cal_mask, test_mask):
    out = {}
    for col in METHODS:
        b, par = model.baseline(t, cal_mask & t[col].notna(), col=col, x="TVD_ft")
        r = t[col] / b[f"{col}_0"]
        t[f"{col}_ratio"] = r
        t[f"{col}_0"], t[f"{col}_0_lo"], t[f"{col}_0_hi"] = b[f"{col}_0"], b[f"{col}_0_lo"], b[f"{col}_0_hi"]
        alarm = model.alarms(r.where(test_mask & (r > 0), 1.0).fillna(1.0))
        t[f"{col}_alarm"] = alarm
        rr = r[test_mask & np.isfinite(r) & (r > 0)]
        lr = np.log(rr)
        out[col] = {"false_alarm_pct": round(100 * float(alarm[test_mask.to_numpy()].mean()), 1),
                    "test_median_abs_log_dev": round(float(np.median(np.abs(lr))), 4),
                    "cal_band_width_log": round(par["res_hi"] - par["res_lo"], 4),
                    "trend_slope_per_10kft": round(par["slope_per_10kft"], 4)}
    return out


def analyse(df, flags=None):
    flags = flags or {}
    cfg = NHatConfig(rho_normal_ppg=8.6, persistence_ft=30, **flags)
    res = {}
    # ---------------- sediments: one bit run (run 4)
    sed = df[(df.MD_ft < GRANITE_TOP_MD - 20) & (df.Run == 4)].reset_index(drop=True)
    m = NHat(cfg)
    sed = m.prepare(sed)
    cal = sed.TVD_ft.between(*SED_CAL_TVD)
    fit_sed = m.fit(sed, cal)
    sed = m.transform(sed)
    res["sediment"] = section_metrics(m, sed, cal, ~cal & (sed.TVD_ft > SED_CAL_TVD[1]))
    res["sediment_fit"] = {k: v for k, v in fit_sed.items() if k != "k_run_per_Mrev"}
    # ---------------- granite: many runs
    gr = df[df.MD_ft >= GRANITE_TOP_MD + 10].reset_index(drop=True)
    m2 = NHat(NHatConfig(rho_normal_ppg=8.6, persistence_ft=30, **flags))
    gr = m2.prepare(gr)
    gcal = gr.MD_ft.between(*GRANITE_CAL_MD)
    fit_gr = m2.fit(gr, gcal)
    gr = m2.transform(gr)
    gtest = gr.MD_ft > GRANITE_CAL_MD[1]
    res["granite"] = section_metrics(m2, gr, gcal, gtest)
    for col in METHODS:
        step, n = run_steps(gr[gtest], col)
        step_all, n_all = run_steps(gr, col)
        res["granite"][col]["bit_change_jump_log_all_runs"] = round(step_all, 4)
        res["granite"][col]["n_bit_changes_all_runs"] = n_all
        res["granite"][col]["bit_change_jump_log"] = round(step, 4)
        res["granite"][col]["n_bit_changes"] = n
        res["granite"][col]["within_run_drift"] = round(within_run_drift(gr[gtest], col), 4)
        x = gr.loc[gtest, col]
        lx = np.log(x[np.isfinite(x) & (x > 0)])
        res["granite"][col]["test_scatter_mad_log"] = round(float(np.median(np.abs(lx - lx.median()))), 4)
    res["granite_fit"] = {k: v for k, v in fit_gr.items() if k != "k_run_per_Mrev"}
    res["granite_k_run_per_Mrev"] = {str(k): round(v, 4) for k, v in fit_gr["k_run_per_Mrev"].items()}
    return res, sed, gr


ABLATIONS = {
    "full N-hat": {},
    "surface RPM only": {"use_bit_rpm": False},
    "alpha = 1": {"use_alpha": False},
    "no hydraulics term": {"use_hydraulics": False},
    "no vibration term": {"use_dynamics": False},
    "no wear term": {"use_wear": False},
}


def main(data_dir, out):
    os.makedirs(out, exist_ok=True)
    df, runs, mud = load(data_dir)
    df.to_csv(os.path.join(HERE, "..", "data", "forge_16a", "forge16a_depth_table.csv"),
              index=False, float_format="%.4g")
    runs.to_csv(os.path.join(HERE, "..", "data", "forge_16a", "bit_runs.csv"), index=False)
    res, sed, gr = analyse(df)
    sed.to_csv(os.path.join(out, "forge_sediment_nhat.csv"), index=False)
    gr.to_csv(os.path.join(out, "forge_granite_nhat.csv"), index=False)
    abl = {}
    for name, flags in ABLATIONS.items():
        r, _, _ = analyse(df, flags)
        abl[name] = {"sediment_false_alarm_pct": r["sediment"]["N_hat"]["false_alarm_pct"],
                     "sediment_test_dev": r["sediment"]["N_hat"]["test_median_abs_log_dev"],
                     "granite_bit_change_jump": r["granite"]["N_hat"]["bit_change_jump_log"],
                     "granite_within_run_drift": r["granite"]["N_hat"]["within_run_drift"],
                     "granite_scatter": r["granite"]["N_hat"]["test_scatter_mad_log"],
                     "granite_false_alarm_pct": r["granite"]["N_hat"]["false_alarm_pct"]}
    res["ablation"] = abl
    res["data"] = {"rows_used": int(len(df)), "bit_runs_used": int(df.Run.nunique()),
                   "surface_rpm_median": float(df.RPM_surface.median()),
                   "bit_rpm_median": float((df.RPM_surface + df.Motor_rpm).median()),
                   "mw_ppg_range": [float(df.MW_ppg.min()), float(df.MW_ppg.max())]}
    with open(os.path.join(out, "summary.json"), "w") as fh:
        json.dump(res, fh, indent=2, default=float)
    print(json.dumps(res, indent=1, default=float))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="D:/build/nhat-work/forge")
    ap.add_argument("--out", default="results/forge")
    a = ap.parse_args()
    main(a.data, a.out)
