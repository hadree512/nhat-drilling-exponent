"""
Figures 12-15 of the paper (15/9-19 BT2 blind test, mud gas, sonic evidence,
mechanical specific energy).  Style and palette as in make_figures.py.

usage:  python scripts/make_figures_addenda.py --results results --lis D:/build/nhat-work/lis --out figures
"""
import argparse
import json
import os

import numpy as np
import pandas as pd

import make_figures as mf
from make_figures import C, GRID, INK, LABEL, MUTED, SG2PPG, plt, save


def fig_bt2(res, out):
    t = pd.read_csv(os.path.join(res, "volve19", "15_9-19_BT2_nhat.csv"))
    comp = pd.read_csv(os.path.join(res, "volve19", "bt2_pressure_comparison.csv"))
    sh = t["is_shale"].astype(bool)
    fig, axs = plt.subplots(1, 4, figsize=(7.4, 6.0), sharey=True)
    y = t["TVD_m"]
    axs[0].plot(t["GR"], y, color=MUTED, lw=0.4)
    axs[0].plot(t["GR"].where(sh), y, color=C["d"], lw=0.6)
    axs[0].set_xlabel("GR (gAPI)")
    axs[1].plot(t["MW_ppg"] / SG2PPG, y, color=MUTED, lw=0.8, label="MW")
    axs[1].plot(t["ECD_ppg"] / SG2PPG, y, color=INK, lw=0.6, label="ECD")
    axs[1].set_xlabel("Mud (sg)")
    axs[1].legend(fontsize=6.5, loc="lower left")
    for c in ["Dxc", "N_hat"]:
        axs[2].plot(t[c].where(sh), y, ".", ms=1.4, color=C[c], label=LABEL[c])
    axs[2].plot(t["Dxc_vendor"], y, color=C["Dxc_vendor"], lw=0.4, alpha=0.7, label=LABEL["Dxc_vendor"])
    axs[2].set_xlim(0.2, 2.0)
    axs[2].set_xlabel("Exponent")
    axs[2].legend(fontsize=6, loc="lower right", markerscale=5)
    a = axs[3]
    a.plot(t["FPPG_sg"], y, color=C["Dxc_vendor"], lw=1.0, label="Contractor real-time PP (1998)")
    a.plot(t["N_hat_PP_sg"].where(sh).rolling(15, min_periods=3, center=True).median(), y, color=C["N_hat"],
           lw=1.0, label=f"{LABEL['N_hat']}, F-1 calibration")
    a.plot(t["Dxc_PP_sg"].where(sh).rolling(15, min_periods=3, center=True).median(), y, color=C["Dxc"],
           lw=0.8, ls="--", label=f"{LABEL['Dxc']}, F-1 calibration")
    hug, ty = comp[comp.zone == "Hugin"], comp[comp.zone != "Hugin"]
    a.plot(hug.measured_sg, hug.TVD_m, "*", ms=7, color=INK, label="FMT, Hugin")
    a.plot(ty.measured_sg, ty.TVD_m, "*", ms=7, color="#e34948", label="FMT, Ty (depleted)")
    a.axvline(1.03, color=MUTED, ls=":", lw=0.8)
    a.set_xlim(0.85, 1.45)
    a.set_xlabel("Pore pressure (sg EMW)")
    a.legend(fontsize=5.8, loc="upper left")
    axs[0].set_ylabel("TVD (m)")
    axs[0].invert_yaxis()
    fig.suptitle("15/9-19 BT2 (1998): blind application of the F-1 calibration", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig12_bt2_blind.png")


def fig_gas(res, out):
    t = pd.read_csv(os.path.join(res, "addenda", "15_9-F-1_C_addenda.csv"))
    comp = pd.read_csv(os.path.join(res, "volve", "pressure_comparison.csv"))
    tests = comp[comp.wellbore == "15_9-F-1_C"]
    t = t[t.TVD_m > 2300]
    sh = t["is_shale"].astype(bool)
    fig, axs = plt.subplots(1, 4, figsize=(7.4, 5.4), sharey=True)
    y = t["TVD_m"]
    axs[0].plot(t["Gas_norm"].clip(lower=1e-2), y, color=C["d"], lw=0.5)
    axs[0].set_xscale("log")
    axs[0].set_xlabel("Volume-normalised gas")
    axs[1].plot(t["Wh"], y, color=C["Dxc"], lw=0.5, label="Wh")
    axs[1].plot(t["Bh"], y, color=C["N_hat"], lw=0.5, label="Bh")
    axs[1].set_xlim(0, 60)
    axs[1].set_xlabel("Wetness / balance")
    axs[1].legend(fontsize=6.5, loc="lower right")
    axs[2].plot(t["Ch"], y, color=C["offset_mean"], lw=0.5)
    axs[2].set_xlim(0, 2)
    axs[2].set_xlabel("Character Ch")
    axs[3].plot(t["N_hat"].where(sh), y, ".", ms=1.6, color=C["N_hat"])
    axs[3].set_xlim(0.3, 1.6)
    axs[3].set_xlabel(f"{LABEL['N_hat']} (shales)")
    for a in axs:
        for tv in tests.TVD_m:
            a.axhline(tv, color="#e34948", lw=0.4, alpha=0.6, zorder=0)
    axs[0].set_ylabel("TVD (m)")
    axs[0].invert_yaxis()
    fig.suptitle("15/9-F-1 C: mud gas and N\u0302 (red lines: formation-pressure tests)", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig14_gas.png")


def fig_sonic(res, lis, out):
    c = pd.read_csv(os.path.join(res, "addenda", "sonic_19A_trend_samples.csv"))
    s = json.load(open(os.path.join(res, "addenda", "summary.json")))["sonic"]
    sh = c["is_shale"].astype(bool)
    fig, axs = plt.subplots(1, 2, figsize=(6.4, 4.6), sharey=True)
    axs[0].plot(c["GR"], c["TVD_m"], color=MUTED, lw=0.4)
    axs[0].set_xlabel("GR (gAPI)")
    axs[1].plot(c["AC"].where(sh), c["TVD_m"], ".", ms=1.5, color=C["d"], label="shale samples")
    zz = np.linspace(c.TVD_m.min(), c.TVD_m.max(), 50)
    tr = s["trend"]
    axs[1].plot(np.exp(tr["intercept"] + tr["slope_per_km"] * zz / 1000), zz, color=INK, lw=1.2,
                label="median trend, upper 300 m")
    lo, hi = tr["normal_tvd_m"]
    axs[1].axhspan(lo, hi, color=C["d"], alpha=0.08, lw=0)
    axs[1].set_xlabel("Compressional slowness (\u00b5s/ft)")
    axs[1].set_xlim(60, 180)
    axs[1].legend(fontsize=6.5, loc="lower left", markerscale=4)
    axs[0].set_ylabel("TVD (m)")
    axs[0].invert_yaxis()
    fig.suptitle("15/9-19 A: shale slowness increases with depth below 1.6 km", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig13_sonic_19A.png")


def fig_mse(res, out):
    fig, ax = plt.subplots(figsize=(3.9, 3.4))
    for w, col in [("15_9-F-1", C["d"]), ("15_9-F-1_B", C["Dxc"]), ("15_9-F-1_C", C["N_hat"])]:
        t = pd.read_csv(os.path.join(res, "addenda", f"{w}_addenda.csv"))
        t = t[t.is_shale.astype(bool) & (t.TVD_m > 1300)]
        ax.plot(t["MSE_psi"] / 1000, t["N_hat"], ".", ms=2, alpha=0.5, color=col,
                label=w.replace("15_9-", "15/9-").replace("_", " "))
    ax.set_xscale("log")
    ax.set_xlabel("Mechanical specific energy (ksi)")
    ax.set_ylabel(f"{LABEL['N_hat']}")
    ax.legend(fontsize=6.5, markerscale=4)
    ax.set_title("Shale samples below 1,300 m TVD", fontsize=8.5)
    fig.tight_layout()
    save(fig, out, "fig15_mse.png")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default="results")
    ap.add_argument("--lis", default="D:/build/nhat-work/lis")
    ap.add_argument("--out", default="figures")
    a = ap.parse_args()
    fig_bt2(a.results, a.out)
    fig_gas(a.results, a.out)
    fig_sonic(a.results, a.lis, a.out)
    fig_mse(a.results, a.out)
    print("figures 12-15 written")
