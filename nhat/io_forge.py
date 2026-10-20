"""
Loaders that turn the public Utah FORGE well 16A(78)-32 files into one
depth-indexed table (1 ft) ready for N-hat.

Source: McLennan, J., Nash, G., Moore, J., Skowron, G., Woolsey, S. (2021).
Utah FORGE: Well 16A(78)-32 Drilling Data. Geothermal Data Repository,
https://doi.org/10.15121/1776602 (CC BY 4.0).
"""
import glob
import os
import re

import numpy as np
import pandas as pd

GDR = "https://gdr.openei.org/files/1283/"
FILES = {
    "mudlog.las": GDR + "16A(78)-32%20Final%20mud%20log.las",
    "pason.zip": GDR + "16A(78)-32_Pason_Data.zip",
    "daily.zip": GDR + "2021-well-16a78-32-daily-reports.zip",
    "survey.xlsx": GDR + "16A(78)-32%20Survey.xlsx",
}
NULL = -999.25


def read_las(path):
    """Minimal LAS 2.0 reader (wrapped=NO). Returns DataFrame with curve mnemonics."""
    names, rows, in_curves, in_data = [], [], False, False
    with open(path, encoding="latin-1") as fh:
        for line in fh:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            if s.startswith("~"):
                in_curves = s[:2].upper() == "~C"
                in_data = s[:2].upper() == "~A"
                continue
            if in_curves:
                names.append(s.split(".")[0].strip())
            elif in_data:
                rows.append(s.split())
    df = pd.DataFrame(rows, columns=names[: len(rows[0])]).apply(pd.to_numeric, errors="coerce")
    return df.replace(NULL, np.nan)


def pason_on_bottom(path):
    """Bin a time-based Pason record to 1-ft hole depth, on-bottom drilling only.

    Note: the Pason file published for 16A(78)-32 covers April 2022 (after
    drilling) and is not used in the paper."""
    p = read_las(path)
    on = (p["BDEP"] >= p["DEPT"] - 1.0) & (p["ROP"] > 0) & (p["WOB"] > 0)
    p = p[on].copy()
    p["MD_ft"] = np.floor(p["DEPT"])
    agg = p.groupby("MD_ft").agg(
        Motor_rpm=("MTRPM", "median"), RPM_pason=("RPM", "median"),
        WOB_pason=("WOB", "median"), SPP_pason=("SPP", "median"),
        DiffP_psi=("DIFP", "median"), Flow_pason=("TPO", "median"),
        Torque_pason=("CTOR", "median"))
    return agg.reset_index()


def parse_daily_reports(txt_dir):
    """Mud weight by report depth and bit runs (number, size, TFA, in/out MD).

    The PDF reports are first converted to text with `pdftotext -layout`."""
    mud, bits = [], {}
    for f in sorted(glob.glob(os.path.join(txt_dir, "*.txt"))):
        t = open(f, encoding="latin-1").read()
        m = re.search(r"MD/TVD:\s*([\d,]+)", t)
        mw = re.search(r"\nMUD\s*\n.*?\n\s*\d{1,2}:\d{2}\s+([\d.]+)", t, re.S)
        if m and mw:
            mud.append((float(m.group(1).replace(",", "")), float(mw.group(1))))
        sec = re.search(r"DRILL BITS(.*?)BIT NO\.", t, re.S)
        if not sec:
            continue
        for line in sec.group(1).split("\n"):
            b = re.match(r"\s+(\d+)\s+([\d.]+)\s+(.*?)\s(\d\.\d{3})?\s*([YN])\s+([\d,]+)\s*([\d,]+)?",
                         line)
            if not b:
                continue
            no = int(b.group(1))
            rec = bits.setdefault(no, {"bit": no, "size": float(b.group(2)), "tfa": np.nan,
                                       "in": float(b.group(6).replace(",", "")), "out": np.nan})
            if b.group(4):
                rec["tfa"] = float(b.group(4))
            if b.group(7):
                out = float(b.group(7).replace(",", ""))
                if not out <= rec["out"]:
                    rec["out"] = out
    mud = pd.DataFrame(mud, columns=["MD_ft", "MW_ppg"]).query("MD_ft > 200")
    mud = mud.groupby("MD_ft", as_index=False)["MW_ppg"].mean()
    runs = pd.DataFrame(bits.values())
    runs = runs[(runs["out"] - runs["in"]) > 5].sort_values("in").reset_index(drop=True)
    return mud, runs


def read_survey(path):
    """Return MD/TVD/inclination from the minimum-curvature survey report.

    The workbook is a printed report; survey rows are those whose columns
    1..6 are (station no., MD, Inc, Azi, course length, TVD)."""
    sh = pd.read_excel(path, header=None)
    num = sh.iloc[:, 1:7].apply(pd.to_numeric, errors="coerce")
    rows = num.dropna()
    rows = rows[(rows.iloc[:, 0] % 1 == 0) & (rows.iloc[:, 1] >= rows.iloc[:, 5])]
    out = pd.DataFrame({"MD_ft": rows.iloc[:, 1].to_numpy(),
                        "TVD_ft": rows.iloc[:, 5].to_numpy(),
                        "Inc_deg": rows.iloc[:, 2].to_numpy()})
    return out.drop_duplicates("MD_ft").sort_values("MD_ft").reset_index(drop=True)


def build_depth_table(mudlog_las, txt_dir, survey_xlsx, motor_rpg_csv):
    """One row per foot of hole with everything N-hat needs."""
    ml = read_las(mudlog_las)
    ml.columns = [c.replace("MUDL_", "") for c in ml.columns]
    ml = ml.rename(columns={
        "DEPTH": "MD_ft", "ROP": "ROP_fph", "WOB": "WOB_klbf", "RPM": "RPM_surface",
        "TORQUE": "Torque", "FLOWIN": "Flow_gpm", "PP": "SPP_psi"})
    ml = ml[["MD_ft", "ROP_fph", "WOB_klbf", "RPM_surface", "Torque", "Flow_gpm", "SPP_psi"]]
    df = ml.copy()

    mud, runs = parse_daily_reports(txt_dir)
    df["MW_ppg"] = np.interp(df["MD_ft"], mud["MD_ft"], mud["MW_ppg"])
    df["Run"], df["Bit_in"], df["TFA_in2"] = -1, np.nan, np.nan
    for _, r in runs.iterrows():
        sel = (df["MD_ft"] > r["in"]) & (df["MD_ft"] <= r["out"])
        df.loc[sel, ["Run", "Bit_in", "TFA_in2"]] = [int(r["bit"]), r["size"], r["tfa"]]

    sv = read_survey(survey_xlsx)
    df["TVD_ft"] = np.interp(df["MD_ft"], sv["MD_ft"], sv["TVD_ft"])
    if "Inc_deg" in sv:
        df["Inc_deg"] = np.interp(df["MD_ft"], sv["MD_ft"], sv["Inc_deg"])
    rpg = pd.read_csv(motor_rpg_csv).set_index("bit")["motor_rpg"]
    df["Motor_rpg"] = df["Run"].map(rpg).fillna(0.0)
    df["Motor_rpm"] = df["Motor_rpg"] * df["Flow_gpm"]
    df["TFA_in2"] = df["TFA_in2"].fillna(df["TFA_in2"].median())
    return df, runs, mud
