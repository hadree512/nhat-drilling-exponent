# nhat-drilling-exponent

Open code and data behind the paper

> **Ali, R. (2026). An open normalized drilling exponent for pore-pressure estimation: formulation and blind tests on two public wells.** *Manuscript submitted to Energy Science & Engineering.*

N̂ ("N-hat") is a drilling exponent in the d-exponent family. Before the exponent is formed, the rate of penetration is brought to a reference drilling state, and every correction is written out in the code. The corrections cover:
- bit speed, including the mud motor;
- an ROP response to rotary speed fitted from the well's own data;
- insufficient bit hydraulics;
- downhole vibration;
- bit wear, fitted separately for each bit run;
- the mud-weight correction of Rehm and McClendon, applied with the downhole ECD where it is measured.

The normal trend comes from median regression and carries a P10/P90 band, which is carried through Eaton's equation to a P10–P90 range on pore pressure.

The repository reproduces every number, table and figure in the paper from public data.

## Quick start

```bash
python -m venv venv
venv/Scripts/pip install -r requirements.txt        # Linux/macOS: venv/bin/pip
python scripts/forge_case.py  --data <forge_dir> --out results/forge
python scripts/volve_case.py  --root <volve_dir> --out results/volve
python scripts/volve_bootstrap.py
python scripts/make_figures.py
```

The scripts take about five minutes on a laptop.

## Data

| Well | Source | Licence | What is used |
|---|---|---|---|
| Utah FORGE 16A(78)-32 | McLennan et al. (2021), Geothermal Data Repository, [doi:10.15121/1776602](https://doi.org/10.15121/1776602) | CC BY 4.0 | final mud log (LAS), daily drilling reports (PDF → text with `pdftotext -layout`), survey |
| Volve 15/9-F-1, F-1 A, F-1 B, F-1 C | Equinor ASA, Volve field data village | Equinor Open Data Licence | mud-log DLIS, MWD composite DLIS, formation-pressure LAS |

**FORGE.** The processed one-foot depth table is in [`data/forge_16a/forge16a_depth_table.csv`](data/forge_16a/forge16a_depth_table.csv), built by [`nhat/io_forge.py`](nhat/io_forge.py). The bit runs are in [`bit_runs.csv`](data/forge_16a/bit_runs.csv), and the motor revolutions-per-gallon values read from the daily reports are in [`motor_rpg.csv`](data/forge_16a/motor_rpg.csv), with the source of each value. The raw files can be downloaded from the URLs listed in `nhat/io_forge.py`.

**Volve.** The Volve files are not redistributed. Register at the Equinor data village, download the F-1 family, and arrange the files as `<root>/wells/<wellbore>/<category>/`. The categories needed are `mud_log`, `mwd_lwd` and `formation_pressure`. Only summary results are committed here, in [`results/volve/`](results/volve).

## Layout

```
nhat/core.py          d, Dxc, bit hydraulics, revolutions, vibration indices, the NHat class
nhat/io_forge.py      FORGE loaders (LAS, daily-report parser, survey)
nhat/io_volve.py      Volve loaders (DLIS mud log, MWD, pressure tests, overburden)
scripts/forge_case.py     FORGE control-well study + ablation
scripts/volve_case.py     Volve blind pore-pressure study + sensitivity + ablation
scripts/volve_bootstrap.py  bootstrap confidence intervals
scripts/make_figures.py   Figs. 1-11 of the paper
results/              summary JSON/CSV written by the scripts
figures/              PNG figures (300 dpi)
paper/                manuscript and supplementary material (Word)
```

## Code referenced in the paper

| Paper item | Code |
|---|---|
| Eq. (1)–(2): d and Dxc | [`nhat/core.py` · `d_exponent`, `dxc`](nhat/core.py) |
| Eq. (3)–(5): bit speed, bit pressure drop, HSI | [`bit_rpm`, `bit_hydraulics`](nhat/core.py) |
| Eq. (6)–(7): revolutions per run, vibration indices | [`run_revolutions`, `vibration_indices`](nhat/core.py) |
| Eq. (8)–(10): response fit, R*, N̂ | [`NHat.fit`, `NHat.transform`](nhat/core.py) |
| Eq. (11)–(12): normal trend, Eaton, P10/P90 | [`NHat.baseline`, `NHat.eaton`](nhat/core.py), [`scripts/volve_case.py · evaluate`](scripts/volve_case.py) |
| Overburden (Eq. 13) | [`scripts/volve_case.py · fit_overburden`](scripts/volve_case.py) |
| Tables 3–6 | `results/forge/summary.json`, `results/volve/summary.json`, `results/volve/bootstrap.json` |

## Licence

The code is released under the MIT licence (see [LICENSE](LICENSE)). Data keep their original licences.
