"""
All figures of the paper, drawn from the files written by forge_case.py,
volve_case.py and volve_bootstrap.py.

usage:  python scripts/make_figures.py --results results --out figures
"""
import argparse
import json
import os

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402

# fixed categorical order (validated palette, light mode)
C = {"N_hat": "#2a78d6", "Dxc": "#eb6834", "d": "#1baf7a", "Dxc_vendor": "#eda100",
     "d_surface_rpm": "#e87ba4", "offset_mean": "#6250d6", "measured": "#0b0b0b"}
LABEL = {"N_hat": "N̂ (this work)", "Dxc": "Dxc, downhole ECD", "d": "d, bit RPM",
         "Dxc_vendor": "Dxc, service company", "d_surface_rpm": "d, surface RPM",
         "offset_mean": "Offset-well mean"}
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#e4e3df"
SG2PPG = 8.3454

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 9, "axes.titlesize": 9.5,
    "axes.labelsize": 9, "axes.edgecolor": MUTED, "axes.labelcolor": INK,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.6, "axes.spines.top": False,
    "axes.spines.right": False, "legend.frameon": False, "figure.dpi": 100,
    "savefig.dpi": 300, "lines.linewidth": 1.0})


def save(fig, out, name):
    fig.savefig(os.path.join(out, name), bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ Fig. 1
def fig_workflow(out):
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.set_axis_off()
    boxes = [
        (0.02, 0.62, "Surface and\ndownhole data\nROP, WOB, RPM, motor,\nflow, TFA, torque,\nECD, GR"),
        (0.27, 0.62, "Bit-level quantities\nN_bit = N_s + RPG·Q\nΔP_bit, HSI\nrevs per bit run\nSSI, WI"),
        (0.52, 0.62, "Robust ROP-response fit\n(calibration shales)\nln R ~ depth, ln W/D,\nα ln N, β ln HSI, γ SSI;\nwear k per bit run"),
        (0.77, 0.62, "Reference-state ROP R*\nN̂ = log(R*/60N_ref) /\nlog(12W/10³D) · ρn/ECD"),
        (0.77, 0.12, "Normal trend N̂₀(TVD)\nmedian regression +\nP10/P90 band"),
        (0.52, 0.12, "Eaton, exponent n\nfitted on offset wells;\nPP with P10–P90;\npersistent alarms"),
        (0.27, 0.12, "Blind validation\nagainst pressure tests;\nbootstrap CI,\nablation"),
    ]
    for x, y, t in boxes:
        ax.add_patch(FancyBboxPatch((x, y), 0.21, 0.30, boxstyle="round,pad=0.008,rounding_size=0.015",
                                    fc="#f3f6fb", ec=C["N_hat"], lw=1.0))
        ax.text(x + 0.105, y + 0.15, t, ha="center", va="center", fontsize=6.9, color=INK)
    arrows = [((0.23, 0.77), (0.27, 0.77)), ((0.48, 0.77), (0.52, 0.77)), ((0.73, 0.77), (0.77, 0.77)),
              ((0.875, 0.62), (0.875, 0.42)), ((0.77, 0.27), (0.73, 0.27)), ((0.52, 0.27), (0.48, 0.27))]
    for a, b in arrows:
        ax.annotate("", xy=b, xytext=a, arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.0))
    ax.text(0.125, 0.27, "Public data:\nUtah FORGE 16A(78)-32\nVolve 15/9-F-1, A, B, C\nVolve 15/9-19 BT2", ha="center",
            va="center", fontsize=7.4, color=MUTED, style="italic")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    save(fig, out, "fig01_workflow.png")


# ------------------------------------------------------------------ FORGE
def fig_forge_overview(res, out):
    sed = pd.read_csv(os.path.join(res, "forge", "forge_sediment_nhat.csv"))
    gr = pd.read_csv(os.path.join(res, "forge", "forge_granite_nhat.csv"))
    t = pd.concat([sed, gr]).sort_values("MD_ft").reset_index(drop=True)
    gap = t["MD_ft"].diff().fillna(1) > 20          # no drilling data: break the curves
    t = pd.concat([t, t[gap].assign(MD_ft=t["MD_ft"][gap] - 1, ROP_fph=np.nan, WOB_klbf=np.nan,
                                    RPM_surface=np.nan, N_bit=np.nan, HSI=np.nan)]).sort_values("MD_ft")
    fig, axs = plt.subplots(1, 5, figsize=(7.4, 6.2), sharey=True)
    y = t["MD_ft"]
    axs[0].plot(t["ROP_fph"], y, color=C["d"], lw=0.4)
    axs[0].set_xlabel("ROP (ft/h)")
    axs[0].set_xlim(0, 300)
    axs[1].plot(t["WOB_klbf"], y, color=C["Dxc"], lw=0.4)
    axs[1].set_xlabel("WOB (klbf)")
    axs[1].set_xlim(0, 70)
    axs[2].plot(t["RPM_surface"], y, color=C["d_surface_rpm"], lw=0.5, label="surface")
    axs[2].plot(t["N_bit"], y, color=C["N_hat"], lw=0.5, label="bit")
    axs[2].set_xlabel("Rotary speed (rpm)")
    axs[2].legend(loc="lower left", fontsize=7)
    axs[3].plot(t["MW_ppg"], y, color=INK, lw=0.8)
    axs[3].set_xlabel("Mud weight (ppg)")
    axs[3].set_xlim(8.5, 9.5)
    axs[4].plot(t["HSI"], y, color=C["Dxc_vendor"], lw=0.4)
    axs[4].set_xlabel("Bit HSI (hp/in²)")
    for a in axs:
        a.axhline(4460, color=MUTED, ls="--", lw=0.7)
        for md in t.groupby("Run")["MD_ft"].min():
            a.axhline(md, color=GRID, lw=0.5, zorder=0)
    axs[0].text(5, 4400, "granite top", fontsize=7, color=MUTED, va="bottom")
    axs[0].set_ylabel("Measured depth (ft)")
    axs[0].invert_yaxis()
    fig.suptitle("Utah FORGE 16A(78)-32: drilling data (thin grey lines mark bit runs)", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig02_forge_overview.png")


def fig_forge_exponents(res, out):
    gr = pd.read_csv(os.path.join(res, "forge", "forge_granite_nhat.csv"))
    gr = gr[gr.MD_ft > 4470]
    cols = ["d_surface_rpm", "d", "Dxc", "N_hat"]
    fig, axs = plt.subplots(1, 4, figsize=(7.4, 6.0), sharey=True)
    for a, c in zip(axs, cols):
        v = gr[c].where(gr[c] > 0)
        v = v.where(gr.MD_ft.diff().fillna(1) < 20)      # break the line across gaps
        a.plot(v, gr.MD_ft, color=C[c], lw=0.35)
        if f"{c}_0" in gr:
            a.plot(gr[f"{c}_0"], gr.MD_ft, color=INK, lw=0.9)
            a.fill_betweenx(gr.MD_ft, gr[f"{c}_0_lo"], gr[f"{c}_0_hi"], color=INK, alpha=0.08, lw=0)
            al = gr[f"{c}_alarm"].astype(bool) if f"{c}_alarm" in gr else None
            if al is not None and al.any():
                a.plot(np.full(al.sum(), 0.12), gr.MD_ft[al], "|", color="#e34948", ms=3)
        a.set_title(LABEL[c], fontsize=8.5)
        a.set_xlim(0, 3.2)
        for md in gr.groupby("Run")["MD_ft"].min():
            a.axhline(md, color=GRID, lw=0.6, zorder=0)
        a.axhline(7390, color=MUTED, ls="--", lw=0.7)
    axs[0].text(0.05, 7340, "calibration above,\ntest below", fontsize=6.3, color=MUTED, va="bottom")
    axs[0].set_ylabel("Measured depth (ft)")
    axs[0].invert_yaxis()
    fig.suptitle("FORGE granite: exponents, normal trend with P10–P90 band and alarms (red ticks)",
                 fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig05_forge_granite_exponents.png")


def fig_forge_metrics(res, out):
    s = json.load(open(os.path.join(res, "forge", "summary.json")))
    cols = ["d_surface_rpm", "d", "Dxc", "N_hat"]
    keys = [("bit_change_jump_log_all_runs", "Jump at bit changes\n(|Δ ln|, all runs)"),
            ("within_run_drift", "Drift within a run\n(|d ln / 10⁵ rev|)"),
            ("false_alarm_pct", "False alarms in test\nsection (%)")]
    fig, axs = plt.subplots(1, 3, figsize=(7.4, 2.8))
    for a, (k, lab) in zip(axs, keys):
        vals = [s["granite"][c][k] for c in cols]
        a.bar(range(4), vals, color=[C[c] for c in cols], width=0.7, edgecolor="white", linewidth=2)
        for i, v in enumerate(vals):
            a.text(i, v, f"{v:.2f}" if k != "false_alarm_pct" else f"{v:.0f}", ha="center",
                   va="bottom", fontsize=7, color=INK)
        a.set_xticks(range(4), ["d surf.", "d bit", "Dxc", "N̂"], fontsize=7.5)
        a.set_title(lab, fontsize=8.5)
        a.grid(axis="x", visible=False)
    fig.tight_layout()
    save(fig, out, "fig06_forge_metrics.png")


# ------------------------------------------------------------------ Volve
def fig_volve_logs(res, out):
    t = pd.read_csv(os.path.join(res, "volve", "15_9-F-1_nhat.csv"))
    s = json.load(open(os.path.join(res, "volve", "summary.json")))
    fig, axs = plt.subplots(1, 6, figsize=(8.2, 6.6), sharey=True)
    y = t["TVD_m"]
    sh = t["is_shale"].astype(bool)
    axs[0].plot(t["GR"], y, color=MUTED, lw=0.4)
    axs[0].plot(t["GR"].where(sh), y, color=C["d"], lw=0.6)
    axs[0].set_xlabel("GR (gAPI)")
    axs[0].set_xlim(0, 160)
    axs[1].plot(t["ROP_fph"] / 3.28084, y, color=C["Dxc"], lw=0.4)
    axs[1].set_xlabel("ROP (m/h)")
    axs[1].set_xlim(0, 80)
    axs[2].plot(t["RPM_surface"], y, color=C["d_surface_rpm"], lw=0.4, label="surface")
    axs[2].plot(t["N_bit"], y, color=C["N_hat"], lw=0.4, label="bit")
    axs[2].set_xlabel("RPM")
    axs[2].legend(fontsize=6.3, loc="lower right")
    axs[3].plot(t["MW_ppg"] / SG2PPG, y, color=MUTED, lw=0.8, label="MW")
    axs[3].plot(t["ECD_ppg"] / SG2PPG, y, color=INK, lw=0.6, label="ECD")
    axs[3].plot(t["OBG_sg"], y, color=C["Dxc_vendor"], lw=1.0, label="OBG")
    axs[3].set_xlabel("Gradient (sg)")
    axs[3].legend(fontsize=6.3, loc="upper right")
    axs[4].plot(t["SSI"], y, color=C["offset_mean"], lw=0.4)
    axs[4].set_xlabel("Stick-slip\n(downhole)")
    axs[4].set_xlim(0, 1)
    lo, hi = s["normal_interval_m"]
    for c in ["Dxc", "N_hat"]:
        axs[5].plot(t[c].where(sh), y, ".", ms=1.0, color=C[c], label=LABEL[c])
    axs[5].axhspan(lo, hi, color=C["d"], alpha=0.08, lw=0)
    axs[5].text(1.12, (lo + hi) / 2, "normal-\ntrend\ninterval", fontsize=6.3, color=MUTED, va="center")
    axs[5].set_xlim(0.3, 1.6)
    axs[5].set_xlabel("Exponent\n(shale samples)")
    axs[5].legend(fontsize=6.0, loc="upper center", bbox_to_anchor=(0.3, -0.13), markerscale=6)
    axs[0].set_ylabel("TVD (m)")
    axs[0].invert_yaxis()
    fig.suptitle("Volve 15/9-F-1 (calibration well)", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig03_volve_f1_logs.png")


def fig_volve_pressure(res, out):
    comp = pd.read_csv(os.path.join(res, "volve", "pressure_comparison.csv"))
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 4.2), sharey=True)
    for a, w in zip(axs, ["15_9-F-1_B", "15_9-F-1_C"]):
        g = comp[comp.wellbore == w].sort_values("TVD_m")
        a.axvline(1.03, color=MUTED, ls=":", lw=0.8)
        a.text(1.031, g.TVD_m.min() - 8, "hydrostatic", fontsize=6.5, color=MUTED)
        for c, mk in [("d_surface_rpm", "v"), ("Dxc_vendor", "s"), ("Dxc", "D"), ("N_hat", "o")]:
            a.plot(g[f"{c}_pred"], g.TVD_m, mk, ms=4.5, color=C[c], label=LABEL[c],
                   markeredgecolor="white", markeredgewidth=0.6)
        gg = g.dropna(subset=["N_hat_P10"])
        a.hlines(gg.TVD_m, gg[["N_hat_P10", "N_hat_P90"]].min(axis=1),
                 gg[["N_hat_P10", "N_hat_P90"]].max(axis=1), color=C["N_hat"], lw=0.8, alpha=0.6)
        a.plot(g.measured_sg, g.TVD_m, "*", ms=8, color=INK, label="Measured (pressure test)")
        a.set_title(w.replace("_", " ").replace("15 9", "15/9"), fontsize=9)
        a.set_xlabel("Pore pressure gradient (sg EMW)")
        a.set_xlim(1.0, 1.22)
    axs[0].set_ylabel("TVD (m)")
    axs[0].invert_yaxis()
    axs[1].legend(fontsize=6.8, loc="lower left")
    fig.suptitle("Blind pore-pressure prediction against formation pressure tests "
                 "(N̂ bars: P10–P90)", fontsize=9.5)
    fig.tight_layout()
    save(fig, out, "fig07_volve_blind_profiles.png")


def fig_volve_crossplot(res, out):
    comp = pd.read_csv(os.path.join(res, "volve", "pressure_comparison.csv"))
    b = comp[comp.blind]
    fig, ax = plt.subplots(figsize=(3.8, 3.6))
    for c, mk in [("d_surface_rpm", "v"), ("d", "^"), ("Dxc_vendor", "s"), ("Dxc", "D"), ("N_hat", "o")]:
        ax.plot(b.measured_sg, b[f"{c}_pred"], mk, ms=4.5, color=C[c], label=LABEL[c],
                markeredgecolor="white", markeredgewidth=0.6)
    lim = (1.10, 1.18)
    ax.plot(lim, lim, color=MUTED, lw=0.8)
    ax.fill_between(lim, np.array(lim) - 0.02, np.array(lim) + 0.02, color=GRID, alpha=0.6, lw=0)
    ax.set_xlim(lim)
    ax.set_ylim(lim)
    ax.set_xlabel("Measured (sg EMW)")
    ax.set_ylabel("Predicted (sg EMW)")
    ax.set_title("Blind wells F-1 B and F-1 C (±0.02 sg shaded)", fontsize=8.5)
    ax.legend(fontsize=6.3, loc="upper left")
    fig.tight_layout()
    save(fig, out, "fig08_volve_crossplot.png")


def fig_volve_skill(res, out):
    bs = json.load(open(os.path.join(res, "volve", "bootstrap.json")))
    s = json.load(open(os.path.join(res, "volve", "summary.json")))
    order = ["d_surface_rpm", "d", "Dxc_vendor", "offset_mean", "Dxc", "N_hat"]
    fig, axs = plt.subplots(1, 2, figsize=(7.4, 3.0))
    a = axs[0]
    for i, c in enumerate(order):
        r, (lo, hi) = bs[c]["rmse"], bs[c]["ci95"]
        a.barh(i, r, color=C[c], height=0.62, edgecolor="white", linewidth=2)
        a.errorbar(r, i, xerr=[[r - lo], [hi - r]], color=INK, capsize=2, lw=0.8)
        a.text(hi + 0.0008, i, f"{r:.3f}", va="center", fontsize=7)
    a.set_yticks(range(len(order)), [LABEL[c] for c in order], fontsize=7.5)
    a.set_xlabel("Blind RMSE (sg), 95% bootstrap CI")
    a.grid(axis="y", visible=False)
    a = axs[1]
    m = s["metrics"]
    meth = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat"]
    x = np.arange(len(meth))
    a.bar(x - 0.18, [m[c]["rmse_sg"] for c in meth], 0.36, color=[C[c] for c in meth],
          edgecolor="white", linewidth=1.5, label="Eaton n fitted on offset wells")
    a.bar(x + 0.18, [m[c]["rmse_sg_eaton_1p2"] for c in meth], 0.36, color="white",
          edgecolor=[C[c] for c in meth], linewidth=1.2, hatch="////", label="Textbook n = 1.2")
    a.set_yscale("log")
    a.set_ylim(0.01, 1.0)
    a.set_yticks([0.01, 0.03, 0.1, 0.3, 1.0], ["0.01", "0.03", "0.1", "0.3", "1"])
    a.minorticks_off()
    a.set_xticks(x, ["d surf.", "d bit", "Dxc serv.", "Dxc", "N̂"], fontsize=7.5)
    a.set_ylabel("Blind RMSE (sg, log scale)")
    a.legend(fontsize=6.8, loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=2)
    a.grid(axis="x", visible=False)
    fig.tight_layout()
    save(fig, out, "fig09_volve_skill.png")


def fig_sensitivity(res, out):
    s = json.load(open(os.path.join(res, "volve", "summary.json")))["sensitivity_rmse_by_normal_interval"]
    ints = list(s.keys())
    meth = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat"]
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    w = 0.16
    for j, c in enumerate(meth):
        vals = [s[i][c] if s[i][c] == s[i][c] else np.nan for i in ints]
        ax.bar(np.arange(len(ints)) + (j - 2) * w, vals, w, color=C[c], label=LABEL[c],
               edgecolor="white", linewidth=1)
    ax.axhline(s[ints[0]]["offset_mean"], color=C["offset_mean"], ls="--", lw=1.0,
               label="Offset-well mean")
    ax.set_xticks(range(len(ints)), [f"{i} m" for i in ints], fontsize=7.5)
    ax.set_xlabel("TVD interval used for the normal trend (calibration well)")
    ax.set_ylabel("Blind RMSE (sg)")
    ax.set_yscale("log")
    ax.set_yticks([0.01, 0.02, 0.05, 0.1, 0.2], ["0.01", "0.02", "0.05", "0.1", "0.2"])
    ax.minorticks_off()
    ax.legend(fontsize=6.5, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.2))
    ax.grid(axis="x", visible=False)
    fig.tight_layout()
    save(fig, out, "fig10_volve_sensitivity.png")


def fig_ablation(res, out):
    v = json.load(open(os.path.join(res, "volve", "summary.json")))["ablation"]
    f = json.load(open(os.path.join(res, "forge", "summary.json")))["ablation"]
    fig, axs = plt.subplots(1, 3, figsize=(7.4, 2.9), sharey=True)
    names = ["full N-hat", "surface RPM only", "alpha = 1", "no vibration term", "no wear term"]
    lab = ["Full N̂", "Surface RPM only", "α = 1", "No vibration term", "No wear term"]
    vals = [[v[n]["blind_rmse_sg"] for n in names] + [v["mud weight instead of downhole ECD"]["blind_rmse_sg"]],
            [f[n]["granite_false_alarm_pct"] for n in names] + [f["no hydraulics term"]["granite_false_alarm_pct"]],
            [f[n]["granite_within_run_drift"] for n in names] + [f["no hydraulics term"]["granite_within_run_drift"]]]
    ylab = lab + ["Volve: MW not ECD / FORGE: no hydraulics"]
    titles = ["Volve blind RMSE (sg)", "FORGE granite false alarms (%)", "FORGE drift within runs"]
    for a, vv, tt in zip(axs, vals, titles):
        col = [C["N_hat"]] + [C["Dxc"]] * (len(vv) - 1)
        a.barh(range(len(vv)), vv, color=col, height=0.6, edgecolor="white", linewidth=2)
        a.axvline(vv[0], color=C["N_hat"], ls="--", lw=0.7)
        for i, x in enumerate(vv):
            a.text(x, i, f" {x:.3g}", va="center", fontsize=6.8)
        a.set_title(tt, fontsize=8.5)
        a.grid(axis="y", visible=False)
    axs[0].set_yticks(range(len(ylab)), ylab, fontsize=7)
    axs[0].invert_yaxis()
    fig.tight_layout()
    save(fig, out, "fig11_ablation.png")


def fig_response(res, out):
    t = pd.read_csv(os.path.join(res, "volve", "15_9-F-1_nhat.csv"))
    s = json.load(open(os.path.join(res, "volve", "summary.json")))
    a_fit = s["fitted"]["alpha"]
    c = t[t["is_shale"].astype(bool) & t["TVD_m"].between(*s["fit_interval_m"])]
    # partial residual of ln ROP on ln N_bit, removing the other fitted terms
    f = s["fitted"]
    other = (f["depth"] * c["TVD_ft"] / 1e4 + f["ln_w"] * np.log(12 * c["WOB_klbf"] / (1000 * c["Bit_in"]))
             + f["g_ss"] * c["SSI"] + f["g_wh"] * c["WI"])
    x = np.log(c["N_bit"] / 100.0)
    yv = np.log(c["ROP_fph"]) - other
    yv = yv - np.median(yv - a_fit * x)
    fig, ax = plt.subplots(figsize=(3.8, 3.3))
    ax.plot(x, yv, ".", ms=2, color=MUTED, alpha=0.5)
    xx = np.linspace(x.quantile(0.01), x.quantile(0.99), 10)
    ax.plot(xx, a_fit * xx, color=C["N_hat"], lw=2, label=f"fitted α = {a_fit:.2f}")
    ax.plot(xx, 1.0 * xx, color=C["d"], lw=2, ls="--", label="d-exponent assumption (α = 1)")
    ax.set_xlabel("ln(N_bit / 100 rpm)")
    ax.set_ylabel("Partial residual of ln ROP")
    ax.legend(fontsize=7, loc="upper left")
    ax.set_title("Rotary-speed response, Volve F-1 shales", fontsize=8.5)
    fig.tight_layout()
    save(fig, out, "fig04_rpm_response.png")


def main(res, out):
    os.makedirs(out, exist_ok=True)
    fig_workflow(out)
    fig_forge_overview(res, out)
    fig_forge_exponents(res, out)
    fig_forge_metrics(res, out)
    fig_volve_logs(res, out)
    fig_volve_pressure(res, out)
    fig_volve_crossplot(res, out)
    fig_volve_skill(res, out)
    fig_sensitivity(res, out)
    fig_ablation(res, out)
    fig_response(res, out)
    print("figures written to", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default="results")
    ap.add_argument("--out", default="figures")
    a = ap.parse_args()
    main(a.results, a.out)
