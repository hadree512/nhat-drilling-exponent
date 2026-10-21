"""
Bootstrap confidence intervals for the blind Volve errors and for the paired
difference between N-hat and every other predictor (tests resampled with
replacement, 5,000 draws).

usage:  python scripts/volve_bootstrap.py --comp results/volve/pressure_comparison.csv
"""
import argparse
import json

import numpy as np
import pandas as pd

PREDICTORS = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat", "offset_mean"]


def main(comp_path, out_path, draws=5000, seed=7):
    comp = pd.read_csv(comp_path)
    b = comp[comp.blind].dropna(subset=[f"{p}_pred" for p in PREDICTORS])
    err = {p: (b[f"{p}_pred"] - b["measured_sg"]).to_numpy() for p in PREDICTORS}
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(b), size=(draws, len(b)))
    rmse = {p: np.sqrt((err[p][idx] ** 2).mean(axis=1)) for p in PREDICTORS}
    out = {"n_blind_tests": int(len(b))}
    for p in PREDICTORS:
        lo, hi = np.percentile(rmse[p], [2.5, 97.5])
        out[p] = {"rmse": round(float(np.sqrt((err[p] ** 2).mean())), 4),
                  "ci95": [round(float(lo), 4), round(float(hi), 4)]}
        if p != "N_hat":
            diff = rmse["N_hat"] - rmse[p]
            out[p]["nhat_minus_this_ci95"] = [round(float(x), 4) for x in np.percentile(diff, [2.5, 97.5])]
            out[p]["p_nhat_better"] = round(float((diff < 0).mean()), 3)
    with open(out_path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--comp", default="results/volve/pressure_comparison.csv")
    ap.add_argument("--out", default="results/volve/bootstrap.json")
    a = ap.parse_args()
    main(a.comp, a.out)
