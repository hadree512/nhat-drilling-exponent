// Supplementary material for the manuscript.
const fs = require("fs");
const path = require("path");
const C = require("./common");
const { d, runs, P, H1, H2, bullet, TABLE, CODE, STYLES, NUMBERING, PAGE } = C;
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
const V = J("results/volve/summary.json"), F = J("results/forge/summary.json");
const NH = "N̂";

const body = [];
const add = (...x) => x.flat().forEach((y) => body.push(y));
add(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Supporting Information", bold: true, size: 30 })] }));
add(P("**An open normalized drilling exponent for pore-pressure estimation: formulation and blind tests on two public wells**"));
add(P(`Rajab Ali. All tables below are produced by the scripts in ${GH} (commit ${COMMIT}).`));

// S1 per-test table
add(H1("S1 Formation-pressure tests and predictions (Volve)"));
const comp = csv("results/volve/pressure_comparison.csv");
const rowsS1 = comp.map((r) => [
  r.wellbore.replace("15_9-", "15/9-").replace(/_/g, " "), num(r.MD_m, 1), num(r.TVD_m, 1), num(r.measured_sg),
  r.blind === "True" ? "blind" : "offset", r.n_shale, num(r.d_surface_rpm_pred), num(r.Dxc_vendor_pred), num(r.Dxc_pred), num(r.N_hat_pred),
  (r.N_hat_P10 === "" ? "–" : `${num(Math.min(r.N_hat_P10, r.N_hat_P90))}–${num(Math.max(r.N_hat_P10, r.N_hat_P90))}`)]);
add(TABLE("**Table S1.** Every formation-pressure test with the measured gradient and the predictions (sg EMW). *n* is the number of shale samples in the 50 m (TVD) above the test.",
  ["Wellbore", "MD (m)", "TVD (m)", "Measured", "Use", "*n*", "d surf.", "Dxc serv.", "Dxc", NH, NH + " P10–P90"],
  rowsS1, [1250, 700, 700, 800, 650, 450, 750, 800, 750, 750, 1100]));

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

// S5 reproduction
add(H1("S5 Reproducing the results"));
add(CODE(`python -m venv venv
venv/Scripts/pip install -r requirements.txt
# FORGE: download the mud log, daily reports and survey (URLs in nhat/io_forge.py),
# convert the daily-report PDFs with: pdftotext -layout <pdf> <txt>
python scripts/forge_case.py --data <forge_dir> --out results/forge
# Volve: wells/<wellbore>/{mud_log,mwd_lwd,formation_pressure}/ from the Equinor data village
python scripts/volve_case.py --root <volve_dir> --out results/volve
python scripts/volve_bootstrap.py
python scripts/make_figures.py`, "**Listing S2.** Commands that regenerate every table and figure."));
add(P("Run times are a few minutes on a laptop. The scripts use fixed random seeds, so the bootstrap intervals are reproducible."));

const doc = new Document({ creator: "Rajab Ali", title: "Supporting Information", styles: STYLES, numbering: NUMBERING,
  sections: [{ properties: PAGE, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: ["S", PageNumber.CURRENT], size: 18 })] })] }) }, children: body }] });
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("written", OUT, b.length); });
