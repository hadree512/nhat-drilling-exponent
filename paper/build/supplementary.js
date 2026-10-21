// Supplementary material for the manuscript.
const fs = require("fs");
const path = require("path");
const C = require("./common");
const { d, runs, P, H1, H2, bullet, TABLE, CODE, STYLES, NUMBERING, PAGE } = C;
const NH0 = "N̂";
const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber } = d;

const REPO = process.argv[2], OUT = process.argv[3], COMMIT = process.argv[4] || "main";
const GH = "https://github.com/hadree512/nhat-drilling-exponent";
const rd = (p) => fs.readFileSync(path.join(REPO, p), "utf8");
const J = (p) => JSON.parse(rd(p).replace(/\bNaN\b/g, "null"));
const csv = (p) => {
  const [h, ...rows] = rd(p).trim().split(/\r?\n/);
  const cols = h.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i], v])));
};
const num = (x, k = 3) => (x === "" || x === undefined || x === null || Number.isNaN(Number(x))) ? "–" : Number(x).toFixed(k);
const V = J("results/volve/summary.json"), F = J("results/forge/summary.json"), A = J("results/addenda/summary.json");
const NH = "N̂";

const body = [];
const add = (...x) => x.flat().forEach((y) => body.push(y));
add(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Supporting Information", bold: true, size: 30 })] }));
add(P("**An open normalized drilling exponent for pore-pressure estimation: formulation and blind tests on public North Sea and Utah well data**"));
add(P(`Rajab Ali. All tables below are produced by the scripts in ${GH} (commit ${COMMIT}).`));

// S1 per-test table
add(H1("S1 Formation-pressure tests and predictions (Volve)"));
const comp = csv("results/volve/pressure_comparison.csv");
const rowsS1 = comp.map((r) => [
  r.wellbore.replace("15_9-", "15/9-").replace(/_/g, " "), num(r.MD_m, 1), num(r.TVD_m, 1), num(r.measured_sg),
  r.blind === "True" ? "blind" : "offset", r.n_shale, num(r.d_surface_rpm_pred), num(r.Dxc_vendor_pred), num(r.Dxc_pred), num(r.N_hat_pred),
  (r.N_hat_P10 === "" ? "–" : `${num(Math.min(r.N_hat_P10, r.N_hat_P90))}–${num(Math.max(r.N_hat_P10, r.N_hat_P90))}`)]);
add(TABLE("**Table S1.** Every formation-pressure test with the measured gradient and the predictions (sg EMW). *n* is the number of shale samples used.",
  ["Wellbore", "MD (m)", "TVD (m)", "Measured", "Use", "*n*", "d surf.", "Dxc serv.", "Dxc", NH, NH + " P10–P90"],
  rowsS1, [1250, 700, 700, 800, 650, 450, 750, 800, 750, 750, 1100],
  "*n*: shale samples in the seal window (the 30 deepest shale samples within 200 m TVD above the test)."));

// S2 sensitivity
add(H1("S2 Sensitivity to the normal-trend interval"));
const sens = V.sensitivity_rmse_by_normal_interval;
const meth = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat", "offset_mean"];
const lab = { d_surface_rpm: "d, surface RPM", d: "d, bit RPM", Dxc_vendor: "Dxc, service company", Dxc: "Dxc, downhole ECD", N_hat: NH, offset_mean: "Offset mean" };
add(TABLE("**Table S2.** Blind RMSE (sg) for different TVD intervals of the calibration well used to fit the normal trend.",
  ["Interval (m TVD)", ...meth.map((m) => lab[m])],
  Object.keys(sens).map((k) => [k, ...meth.map((m) => num(sens[k][m]))]), [1500, 1250, 1250, 1300, 1250, 1100, 1250]));

// S3 FORGE runs
add(H1("S3 FORGE 16A(78)-32 bit runs"));
const br = csv("data/forge_16a/bit_runs.csv");
const rpg = Object.fromEntries(csv("data/forge_16a/motor_rpg.csv").map((r) => [r.bit, r]));
const k = F.granite_k_run_per_Mrev;
add(TABLE("**Table S3.** Bit runs parsed from the daily drilling reports, motor ratings and fitted wear coefficients *k*~j~ (Eq. 8; per 10^6^ revolutions; granite fit). Runs shorter than 5 ft and coring runs are not used.",
  ["Bit", "Size (in)", "TFA (in^2^)", "In (ft MD)", "Out (ft MD)", "Motor (rev/gal)", "Rating source", "*k*~j~"],
  br.map((r) => [r.bit, num(r.size, 2), num(r.tfa, 3), num(r.in, 0), num(r.out, 0),
    rpg[r.bit] ? rpg[r.bit].motor_rpg : "–",
    rpg[r.bit] ? (rpg[r.bit].source.includes("assumed") ? "inferred from motor size" : "stated in report") : "–",
    k[r.bit] !== undefined ? num(k[r.bit], 2) : "–"]),
  [600, 850, 900, 1050, 1050, 1150, 2400, 900]));


// S4 fitted coefficients in full
add(H1("S4 Implementation of the method"));
add(P(`The full core module is listed below as it stands at commit ${COMMIT}. Loaders for the two datasets (nhat/io_forge.py, nhat/io_volve.py) and the study scripts are in the repository.`));
add(CODE(rd("nhat/core.py").replace(/\r/g, "").trimEnd(), "**Listing S1.** nhat/core.py"));

// S5 BT2 formation tests
add(H1("S5 Formation-multi-tester pressures of 15/9-19 BT2"));
add(P("Transcribed from the scanned summary report in the Volve release (wells/15_9-19_B_BT2/legacy_logs/04.tif; run 1A, trip 1, 18 January 1998). Only tests classed good or very good are listed; tests 8, 9, 25 and 28–32 were tight or did not seal. The printed TVD agrees with the TVD of the digital mud log to within 0.1 m at every test."));
const fmt = csv("data/volve_15_9_19/fmt_15_9_19BT2.csv");
add(TABLE("**Table S5.** Formation-multi-tester pressures, 15/9-19 BT2.",
  ["Test", "MD (m)", "TVD (m)", "Sand-face pressure (kPa)", "Gradient (sg)", "Mud hydrostatic (kPa)", "Mobility (mD)", "Zone"],
  fmt.map((r) => [r.test_no, num(r.MD_m, 1), num(r.TVD_m, 1), num(r.sand_face_kPa, 1), num(r.sand_face_kPa / (9.80665 * r.TVD_m)),
    num(r.hydrostatic_before_kPa, 1), num(r.mobility_mD, 1), Number(r.TVD_m) > 3000 ? "Hugin" : "Ty (depleted)"]),
  [600, 1000, 1000, 1500, 1100, 1500, 1100, 1200]));

// S6 lithology codes
add(H1("S6 Contractor lithology codes as a shale flag"));
const lc = csv("results/volve19/lith_code_gr_19A.csv");
add(TABLE("**Table S6.** Median gamma ray per contractor lithology-code group in 15/9-19 A, where both are recorded. Code group 620 has the highest gamma ray and was used as the claystone flag in 15/9-19 BT2 where no gamma ray was available.",
  ["Code group", "Samples", "Median GR (gAPI)"], lc.map((r) => [r.code_group, r.samples, num(r.median_GR, 1)]), [3000, 3000, 3000]));

// S7 BT2 per-test predictions
add(H1("S7 15/9-19 BT2: predictions at each test"));
const bt = csv("results/volve19/bt2_pressure_comparison.csv");
add(TABLE("**Table S7.** Predictions with the F-1 calibration at each 15/9-19 BT2 test (sg). The Ty tests have no shale within 200 m above them.",
  ["Test", "TVD (m)", "Zone", "Measured", "Contractor", "d", "Dxc serv.", "Dxc", NH],
  bt.map((r) => [r.test_no, num(r.TVD_m, 1), r.zone, num(r.measured_sg), num(r.FPPG_contractor_pred, 2), num(r.d_pred), num(r.Dxc_vendor_pred), num(r.Dxc_pred), num(r.N_hat_pred)]),
  [600, 900, 1400, 1000, 1100, 900, 1000, 900, 900]));

// S8 sonic and gas details
add(H1("S8 Sonic trend and gas statistics"));
const st = A.sonic.trend;
add(P(`Sonic trend fitted on the shales of 15/9-19 A between ${Math.round(st.normal_tvd_m[0])} and ${Math.round(st.normal_tvd_m[1])} m TVD (${st.n_samples} samples): ln Δt = ${st.intercept.toFixed(3)} + ${st.slope_per_km.toFixed(3)} z (z in km). The positive slope means slowness increases with depth. With this trend and an Eaton exponent fitted on the F-1 / F-1 A tests (n = ${A.sonic.eaton_n_fitted.toFixed(2)}), the blind RMSE on ${A.sonic.n_blind} F-1 B tests was ${A.sonic.blind_rmse_sg.toFixed(3)} sg; with n = 3 it was ${A.sonic.blind_rmse_sg_n3.toFixed(2)} sg. The benchmark is reported only to document why it could not be used.`));


// S5 reproduction
add(H1("S9 Reproducing the results"));
add(CODE(`python -m venv venv
venv/Scripts/pip install -r requirements.txt
# FORGE: download the mud log, daily reports and survey (URLs in nhat/io_forge.py),
# convert the daily-report PDFs with: pdftotext -layout <pdf> <txt>
python scripts/forge_case.py --data <forge_dir> --out results/forge
# Volve: wells/<wellbore>/{mud_log,mwd_lwd,formation_pressure}/ from the Equinor data village
python scripts/volve_case.py --root <volve_dir> --out results/volve
python scripts/volve_bootstrap.py
python scripts/make_figures.py
# 15/9-19 wells (Python <= 3.12 for the LIS reader):
python scripts/convert_volve_lis.py --root <volve_dir> --out <work>/lis
python scripts/volve19_case.py --root <volve_dir> --lis <work>/lis --out results/volve19
python scripts/addenda.py --root <volve_dir> --lis <work>/lis --out results/addenda
python scripts/make_figures_addenda.py --lis <work>/lis`, "**Listing S2.** Commands that regenerate every table and figure."));
add(P("Run times are a few minutes on a laptop. The scripts use fixed random seeds, so the bootstrap intervals are reproducible."));

const doc = new Document({ creator: "Rajab Ali", title: "Supporting Information", styles: STYLES, numbering: NUMBERING,
  sections: [{ properties: PAGE, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: ["S", PageNumber.CURRENT], size: 18 })] })] }) }, children: body }] });
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("written", OUT, b.length); });
