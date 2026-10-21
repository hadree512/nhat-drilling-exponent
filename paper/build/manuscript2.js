// Manuscript v2: Energy Science & Engineering (Wiley). Citation keys [@key] are
// numbered in order of first appearance at build time.
const fs = require("fs");
const path = require("path");
const C = require("./common");
const { d, runs, H1, H2, H3, bullet, r, sub, sup, frac, br, fn, EQ, FIG, CODE, STYLES, NUMBERING, PAGE } = C;
const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, PageNumber, LineNumberRestartFormat } = d;

const REPO = process.argv[2], OUT = process.argv[3], COMMIT = process.argv[4] || "main";
const GH = "https://github.com/hadree512/nhat-drilling-exponent";
const fig = (n) => path.join(REPO, "figures", n);
const J = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8").replace(/\bNaN\b/g, "null"));
const V = J("results/volve/summary.json"), F = J("results/forge/summary.json"), B = J("results/volve/bootstrap.json");
const S19 = J("results/volve19/summary.json"), A = J("results/addenda/summary.json");
const NH = "N̂", NH0 = "N̂~0~", RS = "R∗";
const f2 = (x) => Number(x).toFixed(2), f1 = (x) => Number(x).toFixed(1), f4 = (x) => Number(x).toFixed(4);
const f3 = (x) => (x === null || x === undefined || Number.isNaN(Number(x))) ? "–" : Number(x).toFixed(3);
const LABEL = { d_surface_rpm: "d, surface RPM", d: "d, bit RPM", Dxc_vendor: "Dxc, service company",
  Dxc: "Dxc, downhole ECD", N_hat: `${NH} (this work)`, offset_mean: "Offset-well mean", hydrostatic: "Hydrostatic (1.03 sg)",
  FPPG_contractor: "Contractor real-time estimate (1998)" };

// ------------------------------------------------------------------ references
const REF = {
  hottmann: "Hottmann CE, Johnson RK. Estimation of formation pressures from log-derived shale properties. J Pet Technol. 1965;17(6):717–722. doi:10.2118/1110-PA",
  mouchet: "Mouchet JP, Mitchell A. Abnormal Pressures While Drilling: Origins, Prediction, Detection, Evaluation. Manuels Techniques Elf Aquitaine 2. Boussens: Elf Aquitaine; 1989.",
  eaton: "Eaton BA. The equation for geopressure prediction from well logs. Paper SPE-5544-MS presented at: SPE Annual Fall Meeting; September 28–October 1, 1975; Dallas, TX. doi:10.2118/5544-MS",
  zhang: "Zhang J. Pore pressure prediction from well logs: methods, modifications, and new approaches. Earth-Sci Rev. 2011;108(1–2):50–63. doi:10.1016/j.earscirev.2011.06.001",
  swarbrick: "Swarbrick RE, Osborne MJ. Mechanisms that generate abnormal pressures: an overview. In: Law BE, Ulmishek GF, Slavin VI, eds. Abnormal Pressures in Hydrocarbon Environments. AAPG Memoir 70. Tulsa: AAPG; 1998:13–34.",
  jorden: "Jorden JR, Shirley OJ. Application of drilling performance data to overpressure detection. J Pet Technol. 1966;18(11):1387–1394. doi:10.2118/1407-PA",
  rehm: "Rehm B, McClendon R. Measurement of formation pressure from drilling data. Paper SPE-3601-MS presented at: SPE Annual Fall Meeting; October 3–6, 1971; New Orleans, LA. doi:10.2118/3601-MS",
  by: "Bourgoyne AT, Young FS. A multiple regression approach to optimal drilling and abnormal pressure detection. SPE J. 1974;14(4):371–384. doi:10.2118/4238-PA",
  whittaker: "Whittaker A. Mud Logging Handbook. Englewood Cliffs, NJ: Prentice Hall; 1991.",
  exlog: "Exploration Logging Inc. Theory and Evaluation of Formation Pressures: The Pressure Log Reference Manual. Sacramento, CA: EXLOG; 1981.",
  arifeen: "Arifeen M, Petrovski A, Hasan MJ, Kotenko I, Sletov M, Hassard P. DataDRILL: formation pressure prediction and kick detection for drilling rigs. arXiv:2409.19724; 2024. Data: doi:10.5281/zenodo.12759014",
  pixler: "Pixler BO. Formation evaluation by analysis of hydrocarbon ratios. J Pet Technol. 1969;21(6):665–670. doi:10.2118/2254-PA",
  haworth: "Haworth JH, Sellens M, Whittaker A. Interpretation of hydrocarbon shows using light (C1–C5) hydrocarbon gases from mud-log data. AAPG Bull. 1985;69(8):1305–1310.",
  teale: "Teale R. The concept of specific energy in rock drilling. Int J Rock Mech Min Sci. 1965;2(1):57–73. doi:10.1016/0148-9062(65)90022-7",
  dupriest: "Dupriest FE, Koederitz WL. Maximizing drill rates with real-time surveillance of mechanical specific energy. Paper SPE-92194-MS presented at: SPE/IADC Drilling Conference; February 23–25, 2005; Amsterdam. doi:10.2118/92194-MS",
  ade: "Bourgoyne AT, Millheim KK, Chenevert ME, Young FS. Applied Drilling Engineering. SPE Textbook Series Vol. 2. Richardson, TX: Society of Petroleum Engineers; 1986.",
  huber: "Huber PJ. Robust estimation of a location parameter. Ann Math Stat. 1964;35(1):73–101. doi:10.1214/aoms/1177703732",
  sklearn: "Pedregosa F, Varoquaux G, Gramfort A, et al. Scikit-learn: machine learning in Python. J Mach Learn Res. 2011;12:2825–2830.",
  koenker: "Koenker R, Bassett G. Regression quantiles. Econometrica. 1978;46(1):33–50. doi:10.2307/1913643",
  forge: "McLennan J, Nash G, Moore J, Skowron G, Woolsey S. Utah FORGE: Well 16A(78)-32 drilling data [dataset]. Geothermal Data Repository, Energy and Geoscience Institute at the University of Utah; 2021. doi:10.15121/1776602",
  volve: "Equinor ASA. Volve field data village [dataset]. Equinor Open Data Licence; 2018. https://www.equinor.com/energy/volve-data-sharing",
  efron: "Efron B, Tibshirani RJ. An Introduction to the Bootstrap. New York: Chapman & Hall; 1993.",
  bowers: "Bowers GL. Pore pressure estimation from velocity data: accounting for overpressure mechanisms besides undercompaction. SPE Drill Complet. 1995;10(2):89–95. doi:10.2118/27488-PA",
};
const ORDER = [];
function num(key) {
  if (!REF[key]) throw new Error("unknown ref " + key);
  let i = ORDER.indexOf(key);
  if (i < 0) { ORDER.push(key); i = ORDER.length - 1; }
  return i + 1;
}
function compress(nums) {
  nums = [...new Set(nums)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j - i >= 2 ? `${nums[i]}–${nums[j]}` : (j > i ? `${nums[i]}, ${nums[j]}` : `${nums[i]}`));
    i = j;
  }
  return out.join(", ");
}
const cite = (s) => s.replace(/\[@([^\]]+)\]/g, (_, k) => `[${compress(k.split(/;\s*@?/).map((x) => num(x.replace("@", "").trim())))}]`);
const P = (s, opt = {}) => C.P(cite(s), opt);
const B_ = (s) => bullet(cite(s));
const FIGc = (f, cap, w) => FIG(f, cite(cap), w);
const TAB = (cap, h, rows, w, note, left) => C.TABLE(cite(cap), h, rows, w, note ? cite(note) : note, left);

// ------------------------------------------------------------------ equations
const eqD = [r("d="), frac([r("log"), br([frac([r("R")], [r("60"), r("N")])])],
  [r("log"), br([frac([r("12"), r("W")], [sup([r("10")], "3"), r("D")])])])];
const eqDxc = [sub("d", "xc"), r("=d"), frac([sub("ρ", "n")], [sub("ρ", "ECD")])];
const eqNbit = [sub("N", "bit"), r("="), sub("N", "s"), r("+"), sub("c", "m"), r("Q")];
const eqDP = [r("Δ"), sub("P", "b"), r("="), frac([r("ρ"), sup([r("Q")], "2")], [r("12031 "), sup([sub("C", "d")], "2"), sup([sub("A", "t")], "2")])];
const eqHSI = [r("HSI="), frac([r("Δ"), sub("P", "b"), r("Q")], [r("1714"), br([r("π"), sup([r("D")], "2"), r("/4")])])];
const eqRev = [sub("n", "rev"), br([r("z")]), r("="), new C.MathSum({ children: [sub("N", "bit"), frac([r("60 Δz")], [r("R")])], subScript: [r("run")] })];
const eqSSI = [r("SSI="), frac([sub("N", "max"), r("−"), sub("N", "min")], [r("2"), sub("N", "avg")]), r(",  WI="), frac([sub("σ", "W")], [sub("μ", "W")])];
const eqFit = [r("ln R="), sub("b", "0"), r("+"), sub("b", "1"), r("z+a ln"), br([frac([r("12W")], [sup([r("10")], "3"), r("D")])]),
  r("+α ln"), br([frac([sub("N", "bit")], [sub("N", "ref")])]), r("+β ln min"), br([frac([r("HSI")], [sub("HSI", "ref")]), r(",1")]),
  r("+"), sub("γ", "s"), r("SSI+"), sub("γ", "w"), r("WI+ε")];
const eqRstar = [r("ln "), sup([r("R")], "∗"), r("=ln R−α ln"), br([frac([sub("N", "bit")], [sub("N", "ref")])]),
  r("−β ln min"), br([frac([r("HSI")], [sub("HSI", "ref")]), r(",1")]), r("−"), sub("γ", "s"), r("SSI−"), sub("γ", "w"), r("WI−"), sub("k", "j"), sub("n", "rev")];
const eqNhat = [r("N̂="), frac([r("log"), br([frac([sup([r("R")], "∗")], [r("60 "), sub("N", "ref")])])],
  [r("log"), br([frac([r("12W")], [sup([r("10")], "3"), r("D")])])]), r("⋅"), frac([sub("ρ", "n")], [sub("ρ", "ECD")])];
const eqTrend = [r("ln "), sub("N̂", "0"), br([r("z")]), r("="), sub("c", "0"), r("+"), sub("c", "1"), r("z")];
const eqEaton = [sub("ρ", "p"), r("=S−"), br([r("S−"), sub("ρ", "n")]), sup([br([frac([r("N̂")], [sub("N̂", "0")])])], "n")];
const eqRho = [sub("ρ", "b"), br([r("z")]), r("="), sub("ρ", "ma"), r("−"), br([sub("ρ", "ma"), r("−"), sub("ρ", "ml")]), r("exp"), br([r("−k"), sub("z", "bml")])];
const eqWh = [sub("W", "h"), r("=100 "), frac([sub("C", "2"), r("+"), sub("C", "3"), r("+"), sub("C", "4"), r("+"), sub("C", "5")],
  [sub("C", "1"), r("+"), sub("C", "2"), r("+"), sub("C", "3"), r("+"), sub("C", "4"), r("+"), sub("C", "5")]),
  r(",   "), sub("B", "h"), r("="), frac([sub("C", "1"), r("+"), sub("C", "2")], [sub("C", "3"), r("+"), sub("C", "4"), r("+"), sub("C", "5")]),
  r(",   "), sub("C", "h"), r("="), frac([sub("C", "4"), r("+"), sub("C", "5")], [sub("C", "3")])];
const eqGn = [sub("G", "v"), r("="), sub("G", "t"), frac([r("Q")], [r("R "), sub("A", "h")])];
const eqMSE = [r("MSE="), frac([r("4W")], [r("π"), sup([r("D")], "2")]), r("+"), frac([r("480 "), sub("N", "s"), r(" T")], [sup([r("D")], "2"), r("R")])];
const eqSonic = [sub("ρ", "p"), r("=S−"), br([r("S−"), sub("ρ", "n")]), sup([br([frac([r("Δ"), sub("t", "n")], [r("Δt")])])], "n")];

// ------------------------------------------------------------------ tables
function tableData() {
  return TAB("**Table 1.** Data used in this study.", ["", "Utah FORGE 16A(78)-32", "Volve 15/9-F-1, F-1 A, F-1 B, F-1 C", "Volve 15/9-19 A, BT2, S/SR"],
    [["Setting", "geothermal; basin fill over granite; deviated well", "North Sea jack-up; Tertiary shales over Jurassic sandstone", "exploration and appraisal wells of the same structure"],
     ["Drilled", "2020–2021", "2007–2014", "1992–1998"],
     ["Interval used", `130–10,987 ft MD (${F.data.rows_used.toLocaleString("en-US")} samples)`, "223–4,094 m MD (1 m samples)", "BT2: 2,257–4,250 m MD"],
     ["Drilling channels", "ROP, WOB, surface RPM, torque, flow, SPP", "ROP, WOB, surface and bit RPM, torque, flow, SPP, MW, ECD, C1–C5", "ROP, WOB, bit RPM, torque, MW, ECD, C1–C5, contractor Dxc and pore-pressure curve"],
     ["Downhole channels", "none", "GR, density, ECD, downhole RPM range, vibration, sonic", "GR, sonic (wireline/LWD)"],
     ["Pressure ground truth", "normally pressured (MW 8.8–9.3 ppg)", "31 formation-pressure tests, 1.13–1.17 sg", "BT2: 23 tests (17 Hugin, 1.09 sg; 6 depleted Ty, 0.93 sg)"],
     ["Licence", "CC BY 4.0", "Equinor Open Data Licence", "Equinor Open Data Licence"]],
    [1500, 2500, 2500, 2500], null, true);
}
function tableFitted() {
  const v = V.fitted, s = F.sediment_fit, g = F.granite_fit;
  const row = (name, key, fmt = f3) => [name, fmt(v[key]), fmt(s[key]), fmt(g[key])];
  return TAB("**Table 2.** Drilling-response coefficients of Eq. (8), fitted by Huber regression on the calibration interval of each case.",
    ["Coefficient", "Volve F-1 shales", "FORGE sediments", "FORGE granite"],
    [row("Depth term *b*~1~ (per 10^4^ ft)", "depth"), row("WOB term *a*", "ln_w"), row("Rotary-speed exponent α", "alpha"),
     row("Hydraulics exponent β", "beta"), row("Stick-slip coefficient γ~s~", "g_ss"), row("WOB-variability coefficient γ~w~", "g_wh"),
     ["Samples used", String(v.n_calib), String(s.n_calib), String(g.n_calib)], ["*R*^2^ of ln *R*", f2(v.r2_calib), f2(s.r2_calib), f2(g.r2_calib)]],
    [3300, 1900, 1900, 1900],
    "α was bounded to 0.3–1.2; the FORGE values sit on these bounds, so the speed response is not identifiable there. β is zero at Volve because nozzle areas were not available. γ~s~ uses the measured downhole stick-slip index at Volve and the surface-torque proxy at FORGE.");
}
function tableForge() {
  const m = F.granite, cols = ["d_surface_rpm", "d", "Dxc", "N_hat"];
  return TAB("**Table 3.** FORGE 16A(78)-32, granite test section (MD > 7,390 ft, normally pressured). Lower is better in every column.",
    ["Exponent", "False alarms (%)", "Jump at bit change |Δln|", "Drift in run per 10^5^ rev", "Scatter (MAD of ln)", "P10–P90 band (ln)"],
    cols.map((c) => [LABEL[c], f1(m[c].false_alarm_pct), f2(m[c].bit_change_jump_log_all_runs), f2(m[c].within_run_drift), f3(m[c].test_scatter_mad_log), f2(m[c].cal_band_width_log)]),
    [2300, 1300, 1550, 1500, 1300, 1150],
    `Jumps are medians over the ${m.N_hat.n_bit_changes_all_runs} bit changes in the granite. In the sediments every exponent flagged ${f1(F.sediment.N_hat.false_alarm_pct)}–${f1(F.sediment.d_surface_rpm.false_alarm_pct)}% of the test interval.`);
}
function tableVolve() {
  const m = V.metrics, order = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat"];
  const rows = order.map((c) => [LABEL[c], f3(m[c].rmse_sg), `${f3(B[c].ci95[0])}–${f3(B[c].ci95[1])}`, f3(m[c].bias_sg), f2(m[c].eaton_n), f2(m[c].rmse_sg_eaton_1p2), `${Math.round(100 * m[c].p10_p90_coverage)}`]);
  rows.push([LABEL.offset_mean, f3(m.offset_mean.rmse_sg), `${f3(B.offset_mean.ci95[0])}–${f3(B.offset_mean.ci95[1])}`, f3(m.offset_mean.bias_sg), "–", "–", "–"]);
  rows.push([LABEL.hydrostatic, f3(m.hydrostatic.rmse_sg), "–", f3(m.hydrostatic.bias_sg), "–", "–", "–"]);
  return TAB(`**Table 4.** Volve: blind prediction of the ${m.N_hat.n_blind} formation-pressure tests of 15/9-F-1 B and F-1 C (sg EMW).`,
    ["Predictor", "RMSE", "95% CI (bootstrap)", "Bias", "Eaton *n* (fitted)", "RMSE with *n* = 1.2", "P10–P90 coverage (%)"],
    rows, [2350, 900, 1450, 900, 1000, 1150, 1250],
    "Normal trend from the shales of 15/9-F-1 between 350 and 950 m TVD; Eaton exponent fitted on the eight tests of F-1 and F-1 A; each test compared with the 30 deepest shale samples within 200 m above it.");
}
function tableAblation() {
  const v = V.ablation, f = F.ablation;
  const names = [["full N-hat", "Full " + NH], ["surface RPM only", "Surface RPM instead of bit RPM"], ["alpha = 1", "α fixed at 1"], ["no vibration term", "No vibration term"], ["no wear term", "No wear term"]];
  const rows = names.map(([k, lab]) => [lab, f4(v[k].blind_rmse_sg), f1(f[k].granite_false_alarm_pct), f3(f[k].granite_within_run_drift), f2(f[k].granite_bit_change_jump)]);
  rows.push(["Mud weight instead of downhole ECD", f4(v["mud weight instead of downhole ECD"].blind_rmse_sg), "–", "–", "–"]);
  rows.push(["No hydraulics term", "–", f1(f["no hydraulics term"].granite_false_alarm_pct), f3(f["no hydraulics term"].granite_within_run_drift), f2(f["no hydraulics term"].granite_bit_change_jump)]);
  rows.push(["MSE dysfunction filter added", f4(A.mse.blind_rmse_with_mse_filter.N_hat), "–", "–", "–"]);
  return TAB("**Table 5.** Ablation: each correction switched off in turn, and the effect of an MSE-based data filter.",
    ["Variant", "Volve blind RMSE (sg)", "FORGE false alarms (%)", "FORGE drift in run", "FORGE jump at bit change"], rows, [3300, 1500, 1450, 1350, 1400]);
}
function tableBT2() {
  const m = S19.metrics.Hugin, order = ["d", "Dxc_vendor", "Dxc", "N_hat", "FPPG_contractor", "offset_mean", "hydrostatic"];
  return TAB(`**Table 6.** 15/9-19 BT2: prediction of the ${S19.n_hugin} Hugin formation-multi-tester pressures (${f3(S19.measured_hugin_sg[0])}–${f3(S19.measured_hugin_sg[1])} sg) with the F-1 calibration applied unchanged.`,
    ["Predictor", "RMSE (sg)", "Bias (sg)", "Eaton *n* (from F-1)"],
    order.map((c) => [LABEL[c], f3(m[c].rmse_sg), f3(m[c].bias_sg), S19.eaton_n_from_F1[c] !== undefined ? f2(S19.eaton_n_from_F1[c]) : "–"]),
    [3600, 1600, 1600, 1800],
    "All 17 tests share one seal window (the shale above top Hugin), so the exponent predictors effectively make one independent estimate.");
}
function tableGas() {
  const g = A.gas, wl = ["15_9-F-1", "15_9-F-1_B", "15_9-F-1_C"];
  return TAB("**Table 7.** Light-hydrocarbon ratios [@haworth] in the Hugin reservoir and their relation to N̂ in the deep shales.",
    ["Wellbore", "W~h~ reservoir", "B~h~ reservoir", "C~h~ reservoir", "Haworth class", "W~h~ deep shale", "Spearman ρ (N̂, G~v~)"],
    wl.map((w) => [w.replace("15_9-", "15/9-").replace("_", " "), f1(g[w].reservoir_Wh_median), f1(g[w].reservoir_Bh_median), f2(g[w].reservoir_Ch_median), g[w].reservoir_class, f1(g[w].shale_Wh_median_deep), f2(g[w].spearman_nhat_vs_normgas_deep_shale)]),
    [1500, 1150, 1150, 1150, 1300, 1250, 1500],
    "Deep shale: shale samples below 2,500 m TVD. G~v~: volume-normalised total gas, Eq. (15).");
}
function tableGuide() {
  return TAB("**Table 8.** Interpretation guide: how the exponents respond to common events, and what to check before reading a change as pressure.",
    ["Event", "d (surface RPM)", "Dxc", NH, "Check"],
    [["Entry into undercompacted shale", "decreases", "decreases", "decreases", "gas (connection/background), cavings, torque and drag, temperature"],
     ["Change from shale to sand or carbonate", "shifts (either way)", "shifts", "shifts", "GR at bit, cuttings; restart the trend in the new lithology"],
     ["New bit (same size)", "steps", "steps", "smaller step if wear is corrected", "compare first and last 30 ft of the runs"],
     ["Motor added or flow changed", "large false shift", "large false shift", "corrected through bit speed", "motor rev/gal × flow"],
     ["Mud-weight increase", "increases", "drops (ratio over-corrects)", "drops (same correction)", "downhole ECD; keep trends within one mud-weight regime"],
     ["Bit dulling within a run", "slow increase", "slow increase", "removed by run-wise wear term", "revolutions on bit, torque"],
     ["Stick-slip or whirl", "increase", "increase", "reduced if measured downhole", "downhole RPM range; surface proxies are unreliable"],
     ["Hole-size change", "shifts", "shifts", "shifts", "refit trend per hole section, calibrate on offset tests"]],
    [2200, 1500, 1500, 1700, 2100], null, true);
}
function tableNomen() {
  return TAB("**Nomenclature**", ["Symbol", "Meaning (unit)"], [
    ["*A*~t~, *A*~h~", "total nozzle flow area (in^2^); hole cross-section"], ["*a*, *b*~0~, *b*~1~", "coefficients of Eq. (8)"],
    ["*B*~h~, *C*~h~, *W*~h~", "balance, character and wetness ratios (–, –, %)"], ["*C*~1~…*C*~5~", "methane to pentanes in the mud gas (ppm)"],
    ["*C*~d~", "nozzle discharge coefficient (0.95)"], ["*c*~m~", "motor speed per unit flow (rev/gal)"],
    ["*D*", "bit diameter (in)"], ["*d*, *d*~xc~", "d-exponent and mud-weight-corrected d-exponent (–)"],
    ["*G*~t~, *G*~v~", "total gas and volume-normalised gas"], ["HSI", "hydraulic horsepower per square inch of bit area (hp/in^2^)"],
    ["*k*~j~", "wear coefficient of bit run *j* (per 10^6^ rev)"], ["MSE", "mechanical specific energy (psi)"],
    ["*N*~s~, *N*~bit~", "surface and bit rotary speed (rpm)"], ["*N*~ref~", "reference bit speed (100 rpm)"],
    [NH + ", " + NH0, "normalized drilling exponent and its normal trend (–)"], ["*n*", "Eaton exponent (–)"],
    ["*n*~rev~", "cumulative bit revolutions in the current run"], ["Δ*P*~b~", "pressure drop across the bit nozzles (psi)"],
    ["*Q*", "flow rate (gal/min)"], ["*R*, " + RS, "rate of penetration, measured and at reference state (ft/h)"],
    ["*S*", "overburden gradient (sg or ppg EMW)"], ["SSI, WI", "stick-slip index, WOB variability index (–)"], ["*T*", "surface torque (ft·lbf)"],
    ["Δ*t*, Δ*t*~n~", "compressional slowness and its normal trend (µs/ft)"],
    ["*W*", "weight on bit (klbf)"], ["*z*", "true vertical depth"], ["α, β, γ~s~, γ~w~", "response coefficients in Eq. (8)"],
    ["ρ~n~, ρ~ECD~, ρ~p~", "normal pore-pressure gradient, equivalent circulating density, pore-pressure gradient (sg or ppg)"],
  ], [1900, 7100], null, true);
}

// ------------------------------------------------------------------ body
const body = [];
const add = (...x) => x.flat().forEach((y) => body.push(y));
const m = V.metrics, h19 = S19.metrics.Hugin;

add(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "RESEARCH ARTICLE", size: 18, bold: true, color: "52514E" })] }));
add(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "An open normalized drilling exponent for pore-pressure estimation: formulation and blind tests on public North Sea and Utah well data", bold: true, size: 32 })] }));
add(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Rajab Ali", size: 24 }), new TextRun({ text: "1,*", superScript: true, size: 24 })] }));
add(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "1", superScript: true, size: 20 }), new TextRun({ text: "Shanghai Shenkai Petroleum Science and Technology Co. Ltd., Shanghai, China", size: 20 })] }));
add(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "*Correspondence: Rajab Ali, rajabali8206@gmail.com", size: 20 })] }));

add(H1("Abstract"));
add(P(`Drilling exponents such as the d-exponent and its mud-weight-corrected form Dxc are still the quickest way to read pore pressure from drilling data, yet the refined normalized exponents used by service companies were never published and their benefit has not been tested in the open. This paper sets out ${NH}, a normalized drilling exponent whose corrections are written out in full, and tests it against the classic exponents on public data from three settings. ${NH} maps the rate of penetration to a reference drilling state—bit speed including the motor, a fitted rotary-speed response, bit hydraulics, vibration and run-wise wear—before the exponent is formed, and carries a P10–P90 band into Eaton's equation. In the normally pressured Utah FORGE 16A(78)-32 well, ignoring the motor raised the jump of the d-exponent at bit changes from 0.33 to 0.54 log units, and the wear term cut false alarms in granite from 49% to 31%. In the Volve 15/9-F-1 wells, calibrated on offset tests, ${NH} predicted ${m.N_hat.n_blind} blind formation-pressure tests with an RMSE of ${f3(m.N_hat.rmse_sg)} sg, against ${f3(m.Dxc_vendor.rmse_sg)} sg for the service company's Dxc, ${f3(m.d_surface_rpm.rmse_sg)} sg for the classic d-exponent and ${f3(m.offset_mean.rmse_sg)} sg for the offset-well mean; an ECD-corrected Dxc was statistically indistinguishable (${f3(m.Dxc.rmse_sg)} sg). Applied unchanged to a 1998 exploration sidetrack, the same calibration was within 0.02–0.04 sg of 17 formation-tester pressures, where the logging contractor's real-time estimate had been 0.20 sg too high, but here the plain d-exponent did best. Mud-gas ratios, mechanical specific energy and sonic data were also examined; none removed the main source of error, which is the shift of every exponent at hole-size and mud-weight changes. Code and processed data are public.`));
add(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Keywords: ", bold: true }), new TextRun("d-exponent; drilling data; Eaton method; mud gas; open data; overpressure; pore pressure; Volve")] }));

// 1
add(H1("1 Introduction"));
add(P("Pore pressure sets the lower bound of the mud-weight window, and an estimate of it is needed long before any log reaches the depth in question. Log-based methods relate the departure of porosity-sensitive measurements from a normal compaction trend to excess pore pressure [@hottmann; @mouchet; @eaton; @zhang], whether that pressure comes from disequilibrium compaction or from fluid expansion [@swarbrick]. While drilling, however, the only measurements at the bit are often the drilling parameters themselves. Jorden and Shirley [@jorden] normalised the rate of penetration (ROP) for weight on bit (WOB), rotary speed and bit diameter to obtain the d-exponent, and Rehm and McClendon [@rehm] corrected it for mud weight. Bourgoyne and Young [@by] fitted a full multiple-regression ROP model whose differential-pressure term can be inverted for pore pressure."));
add(P("The corrected d-exponent, Dxc, is still plotted in most mud-logging units, and its weaknesses are well known [@mouchet; @whittaker; @exlog]. It assumes that ROP is proportional to rotary speed. It cannot tell a change of lithology from a change of pressure, and it shifts at every bit change, casing point and mud-weight step. Downhole motors make the surface rotary speed a poor proxy for the speed of the bit. Service companies responded with normalized exponents that add corrections for non-linear speed response, tooth wear and hydraulics; the best known pair is the normalized exponent Nx and its baseline Nxb [@exlog]. Their formulas were kept proprietary, so neither the corrections nor their benefit can be checked independently. Mud-logging practice also combines the exponent with gas shows [@pixler; @haworth], drilling-efficiency measures [@teale; @dupriest] and, once available, sonic and resistivity logs [@eaton; @bowers]."));
add(P("Machine-learning studies now use drilling data to predict pore pressure, but most rely on simulator output or on data that cannot be shared; a recent public dataset for formation-pressure prediction comes from a drilling simulator and covers a few metres of hole [@arifeen]. What is missing is a transparent formulation tested blind against measured pressures on data anyone can download."));
add(P(`This paper fills that gap in a limited but reproducible way. Section 3 defines ${NH} (N-hat). Section 4 describes public data from three settings—a normally pressured geothermal well in Utah, a modern North Sea development well with three sidetracks, and a 1990s North Sea exploration sidetrack whose formation-tester pressures were recovered from a scanned report—together with an evaluation protocol based on blind tests, null predictors, bootstrap intervals and ablation. Section 5 reports the results, including three supporting analyses (defined in Section 3.5) suggested by mud-logging practice: light-hydrocarbon gas ratios, mechanical specific energy and sonic slowness. The aim is not to show that a new exponent detects overpressure earlier. It is to measure, on real data, which corrections help, by how much, and where drilling exponents fail regardless.`));

// 2
add(H1("2 Drilling exponents and Eaton's method"));

add(P("In field units, with ROP *R* in ft/h, rotary speed *N* in rpm, WOB *W* in klbf and bit diameter *D* in inches, the d-exponent is [@jorden]"));
add(EQ(eqD, 1));
add(P("Both logarithms are negative in normal drilling, and *d* increases with depth as shales compact. The mud-weight correction of Rehm and McClendon [@rehm] is"));
add(EQ(eqDxc, 2));
add(P("with ρ~n~ the normal pore-pressure gradient and ρ~ECD~ the equivalent circulating density. A normal trend is drawn through Dxc in shales assumed to be normally pressured, and pore pressure follows from Eaton's ratio method [@eaton] (Eq. 12). Eaton gave an exponent of 1.2 for drilling exponents; in practice the exponent is calibrated on offset wells [@zhang]. The ratio correction of Eq. (2) is empirical and over-corrects when the overbalance is large [@mouchet; @whittaker]."));
// 3
add(H1(`3 The normalized exponent ${NH}`));
add(P(`The idea behind ${NH} is simple: correct the ROP, not the exponent. Each measured ROP is mapped to the ROP that would have been obtained at a reference drilling state, with the bit turning at 100 rpm, sufficient hydraulics, no vibration and a sharp bit. Equation (1) is then applied to the corrected ROP. Each correction is defined below (Figure 1) and coded in the module ` + "nhat/core.py" + " of the repository (Table 9)."));
add(...FIGc(fig("fig01_workflow.png"), `**Figure 1.** Workflow of the method and of its evaluation. ${NH}: normalized drilling exponent; HSI: hydraulic horsepower per square inch; SSI, WI: stick-slip and WOB variability indices.`, 6.2));
add(H2("3.1 Bit-level quantities"));
add(P("With a positive-displacement motor in the bottom-hole assembly, the bit turns at the surface speed plus the motor output,"));
add(EQ(eqNbit, 3));
add(P("where *Q* is the flow rate and *c*~m~ the motor's revolutions per gallon. The hydraulic energy at the bit follows from the nozzle pressure drop and the hydraulic horsepower per square inch of hole [@ade],"));
add(EQ(eqDP, 4));
add(EQ(eqHSI, 5));
add(P("with ρ in ppg, *Q* in gal/min, total flow area *A*~t~ in in^2^ and *C*~d~ = 0.95. Bit wear is tracked as cumulative bit revolutions within each bit run *j*, with the time on bottom obtained from depth and ROP:"));
add(EQ(eqRev, 6));
add(P("Where the MWD tool records minimum, maximum and average downhole rotary speed, the stick-slip index is the normalised speed range; otherwise the rolling coefficient of variation of surface torque is used as a proxy. The WOB variability index is the rolling coefficient of variation of WOB over 30 samples:"));
add(EQ(eqSSI, 7));
add(H2("3.2 Fitting the drilling response"));
add(P("On a calibration interval of shales, ln *R* is regressed on depth and the drilling variables:"));
add(EQ(eqFit, 8));
add(P("The fit uses Huber's robust loss [@huber], as implemented in scikit-learn [@sklearn], because ROP records contain spikes from connections and short drilling breaks. Terms that come out with a non-physical sign (β < 0, γ > 0) are dropped and the fit is repeated. The speed exponent α is bounded to 0.3–1.2; the classic d-exponent corresponds to α = 1. The residuals of Eq. (8) within each bit run are then regressed on *n*~rev~: a negative slope *k*~j~ is read as dulling, and a positive slope is set to zero."));
add(H2(`3.3 Reference-state ROP and ${NH}`));
add(P("The ROP at the reference state follows from Eq. (8),"));
add(EQ(eqRstar, 9));
add(P(`and ${NH} is the d-exponent of ${RS} at the reference speed, with the mud-weight correction of Eq. (2) applied using the downhole ECD where it is measured:`));
add(EQ(eqNhat, 10));
add(P(`With all corrections switched off and α = 1, ${NH} reduces exactly to Dxc, so each term can be removed on its own and its effect measured.`));
add(H2("3.4 Normal trend, uncertainty and pore pressure"));
add(P(`The normal trend is a median (quantile) regression [@koenker] of ln ${NH} on true vertical depth over the shales of the normal interval,`));
add(EQ(eqTrend, 11));
add(P("and the 10th and 90th percentiles of its residuals define a band. Pore pressure follows from Eaton's equation,"));
add(EQ(eqEaton, 12));
add(P(`with *S* the overburden gradient; evaluating Eq. (12) at the two edges of the band gives a P10–P90 range. An alarm is raised when ${NH}/${NH0} falls below 0.85 and stays there over a set length of hole (30 ft at FORGE, 10 samples at Volve). Where a density log covers only part of the well, the overburden is integrated from`));
add(EQ(eqRho, 13));
add(P("fitted to the logged densities below the mud line, with sea water above it."));
add(...CODE(`from nhat.core import NHat, NHatConfig

model = NHat(NHatConfig(rho_normal_ppg=8.6))      # 1.03 sg
t = model.prepare(table)                           # Eqs. (3)-(7)
model.fit(t, calib_mask)                           # Eq. (8) and k_j per bit run
t = model.transform(t)                             # Eqs. (9)-(10): column "N_hat"
trend, par = model.baseline(t, normal_mask)        # Eq. (11) with P10/P90 band
pp_ppg = model.eaton(t["N_hat"] / trend["N_hat_0"], None, obg_psi_ft=0.95)  # Eq. (12)`,
  `**Listing 1.** Minimal use of the library (${GH}/blob/${COMMIT}/nhat/core.py).`));

add(H2("3.5 Supporting indicators read while drilling"));
add(P("Mud-logging units interpret the exponent together with gas, drilling efficiency and, where available, logging-while-drilling data. Light-hydrocarbon ratios characterise the fluid behind a show. Haworth et al. [@haworth] defined the wetness, balance and character ratios"));
add(EQ(eqWh, 14));
add(P("which build on the earlier ratio plots of Pixler [@pixler]. Gas read at surface depends on how much rock was drilled per unit of mud circulated, so total gas *G*~t~ is often normalised by the volume of rock cut,"));
add(EQ(eqGn, 15));
add(P("with *A*~h~ the hole area. Rising background and connection gas in shales are classic signs of reduced overbalance. Drilling efficiency is measured by the mechanical specific energy [@teale], the energy spent per unit volume of rock removed,"));
add(EQ(eqMSE, 16));
add(P("with *T* the surface torque in ft·lbf. A rise of MSE at constant lithology points to vibration, balling or a dull bit, all of which also change ROP [@dupriest]. Finally, compressional slowness Δ*t* gives the log-based counterpart of Eq. (12) [@eaton; @bowers]:"));
add(EQ(eqSonic, 17));
add(P("with Δ*t*~n~ the normal compaction trend and an exponent of about 3 in Eaton's original calibration."));

// 4
add(H1("4 Data and evaluation protocol"));
add(tableData());
add(H2("4.1 Utah FORGE 16A(78)-32"));
add(P(`Well 16A(78)-32 was drilled at the Utah FORGE geothermal site near Milford, Utah, in late 2020 [@forge]. It passes through about 4,400 ft of basin-fill sediments into granite and was steered to a 65° tangent, reaching 10,987 ft MD (8,559 ft TVD). The published mud log gives ROP, WOB, surface rotary speed, torque, pump pressure and flow every foot. The 74 daily drilling reports were converted to text and parsed for mud weight, bit runs, bit size, total flow area and motor specification. A positive-displacement motor was used on every drilling run; its revolutions per gallon were read from the reports where stated (0.155 and 0.242 rev/gal) and otherwise taken from the same motor size (Supplementary Table S3). Coring runs were removed, leaving ${F.data.rows_used.toLocaleString("en-US")} samples in ${F.data.bit_runs_used} bit runs (Figure 2). The mud weight never exceeded 9.3 ppg and no influx was reported, so any overpressure alarm is a false alarm.`));
add(...FIGc(fig("fig02_forge_overview.png"), "**Figure 2.** Utah FORGE 16A(78)-32: rate of penetration, weight on bit, surface and bit rotary speed, mud weight and bit hydraulic horsepower per square inch. Dashed line: top of granite. Thin grey lines: bit-run boundaries.", 6.0));
add(P("In the sediments, drilled by a single 12¼-in bit, the normal trend was fitted between 1,700 and 3,400 ft TVD and alarms were counted below. In the granite, the response coefficients and trend were fitted on bit runs above 7,390 ft MD, and the test runs below were scored on false alarms, on the jump of the exponent across bit changes and on its drift with revolutions inside a run."));
add(H2("4.2 Volve 15/9-F-1 family"));
add(P("Volve is a depleted oil field in the Norwegian North Sea whose subsurface and operational data were released by Equinor in 2018 [@volve]. The pilot 15/9-F-1 and its sidetracks F-1 A, F-1 B and F-1 C were drilled from the jack-up Mærsk Inspirer in 91 m of water. The mud logs (one sample per metre) provide ROP, WOB, surface and bit rotary speed, torque, flow, mud weight, C1–C5 gas and, for the pilot, an ECD estimate. The MWD composite logs (0.1 m, resampled to 1 m) add gamma ray, density, downhole ECD, the minimum, maximum and average downhole rotary speed, vibration severity and, in F-1, F-1 A and F-1 B below 2,500 m, compressional slowness. Nozzle areas were not available, so the hydraulics term is inactive."));
add(P(`The four wellbores hold 31 formation-pressure tests in the Jurassic Hugin sandstone between 2,948 and 3,200 m TVD, reading 1.13–1.17 sg equivalent mud weight against a sea-water gradient of 1.03 sg. Shales were selected where the gamma-ray shale volume exceeded 0.5. The overburden was integrated from Eq. (13) fitted to the pooled densities (ρ~ml~ = ${f2(V.overburden.rho_mudline)} g/cm^3^ at its upper bound, *k* = ${(V.overburden.k_per_m * 1e4).toFixed(1)} × 10^−4^ m^−1^), giving about 2.2 sg at 3,000 m TVD.`));
add(...FIGc(fig("fig03_volve_f1_logs.png"), `**Figure 3.** Volve 15/9-F-1, the calibration well: gamma ray (green where classed as shale), ROP, surface and bit rotary speed, mud weight, ECD and overburden, downhole stick-slip index, and Dxc and ${NH} at shale samples. Shaded: normal-trend interval (350–950 m TVD).`, 6.2));
add(H2("4.3 Volve exploration wells 15/9-19"));
add(P("Before the field was developed, the structure was tested by the exploration well 15/9-19 S and its redrill SR (1992–1993), the appraisal sidetrack 15/9-19 A (1996) and the sidetrack 15/9-19 BT2 (1997–1998). The release contains their digital mud logs in LIS format, recorded by the logging contractor of the time. Besides drilling and gas channels, these files hold the contractor's own Dxc and its real-time estimates of pore pressure, overburden and fracture pressure. The original pressure-evaluation plots are included as scanned images. The development plan reports a reservoir pressure of 340 bar at 3,060 m and notes that formation pressures were measured only in 15/9-19 BT2."));
add(P(`The BT2 measurements were recovered from the scanned formation-multi-tester summary (run 1A, January 1998). Twenty-three tests were classed as good or very good. Seventeen lie in the Hugin sandstone at 3,175–3,294 m TVD and read ${f3(S19.measured_hugin_sg[0])}–${f3(S19.measured_hugin_sg[1])} sg. Six lie in the Ty sandstone at 2,471–2,590 m TVD and read ${f3(S19.measured_ty_sg[0])}–${f3(S19.measured_ty_sg[1])} sg, well below hydrostatic: that sand had already been drawn down by production from the neighbouring Sleipner field. The transcribed true vertical depths agree with those of the digital mud log to within 0.1 m at every test, which serves as a check on the transcription. Gamma ray for BT2 was taken from the wireline file below 3,152 m MD and replaced above by the contractor's lithology code for claystone, which tracks high gamma ray in 15/9-19 A (Supplementary Section S6).`));
add(H2("4.4 Calibration and blind tests"));
add(P(`Everything was fitted on the pilot F-1 and then applied unchanged. The response coefficients of Eq. (8) were fitted on the pilot's shales between 350 and 2,300 m TVD. The normal trend of every exponent was fitted on the pilot's shales between 350 and 950 m TVD: that 26-in section was drilled with sea water and spud mud of 1.03–1.07 sg, so it is the one interval where both normal pressure and a small overbalance can be assumed. The Eaton exponent of each predictor was fitted by least squares to the eight tests of F-1 and F-1 A (offset calibration); F-1 A has no mud log, so its tests were matched to the pilot's shales at the same depth. The 23 tests of F-1 B and F-1 C were then predicted blind, and so were the 17 Hugin tests of 15/9-19 BT2, drilled sixteen years earlier with another rig, mud system and logging contractor.`));
add(P("Because pressure is measured in the sandstone and the exponent is read in the overlying seal, each test was compared with the median prediction from the 30 deepest shale samples within 200 m TVD above it. This assumes pressure continuity between seal and reservoir, the usual premise of shale-based methods [@zhang]. Two null predictors were scored alongside: the hydrostatic gradient and the mean of the offset tests. Confidence intervals come from 5,000 bootstrap resamples of the blind tests [@efron]; tests in one wellbore share a seal and are spatially correlated, so these intervals are optimistic."));

// 5
add(H1("5 Results"));
add(H2("5.1 Fitted drilling response"));
add(tableFitted());
add(P(`At Volve the fitted speed exponent was α = ${f2(V.fitted.alpha)}, roughly half the value implied by the d-exponent (Figure 4). Measured stick-slip and WOB variability both lowered ROP (γ~s~ = ${f2(V.fitted.g_ss)}, γ~w~ = ${f2(V.fitted.g_wh)}), and two of the seven bit runs showed a measurable slowing with revolutions. The regression explains about a third of the variance of ln *R*. At FORGE the speed response is not identifiable: α ran to its upper bound in the sediments and to its lower bound in the granite, where *R*^2^ was only ${f2(F.granite_fit.r2_calib)}, because surface speed changed little within runs and bit speed varied mostly with flow. The wear coefficients, on the other hand, were negative in 12 of 16 FORGE runs, as expected in abrasive granite.`));
add(...FIGc(fig("fig04_rpm_response.png"), `**Figure 4.** Partial residual of ln ROP against bit speed for the Volve calibration shales, after removing the other terms of Eq. (8). The fitted slope (α = ${f2(V.fitted.alpha)}) is about half the slope of 1 assumed by the d-exponent.`, 3.6));
add(H2("5.2 FORGE: normally pressured control well"));
add(P(`Table 3 and Figures 5–6 summarise the granite test section. The classic d-exponent computed with surface rotary speed changes by ${f2(F.granite.d_surface_rpm.bit_change_jump_log_all_runs)} log units across a typical bit change and drifts by about 1 log unit per 10^5^ revolutions, because surface speed was 0–60 rpm while the motor added 100–170 rpm and the surface share changed from run to run. Its low alarm count (${f1(F.granite.d_surface_rpm.false_alarm_pct)}%) is an artefact of a P10–P90 band four times wider than the others. Using bit speed reduces the jumps to ${f2(F.granite.d.bit_change_jump_log_all_runs)} and the drift to ${f2(F.granite.d.within_run_drift)}; Dxc changes nothing here because the mud weight was almost constant. ${NH} gave the fewest false alarms of the three usable exponents (${f1(F.granite.N_hat.false_alarm_pct)}% against ${f1(F.granite.Dxc.false_alarm_pct)}% for Dxc), but its jumps and drift were no smaller than those of Dxc.`));
add(P(`In the sediments every exponent failed in the same way: ${f1(F.sediment.N_hat.false_alarm_pct)}–${f1(F.sediment.d_surface_rpm.false_alarm_pct)}% of the test interval was flagged. The daily reports describe the lower sediments as granite-derived sand with kaolinitic clay. The compaction trend fitted on the upper clays does not apply below, and no drilling normalisation can fix a change of rock type.`));
add(...FIGc(fig("fig05_forge_granite_exponents.png"), "**Figure 5.** FORGE granite: d with surface and with bit speed, Dxc and N̂, with the normal trend (black), its P10–P90 band (grey) and persistent alarms (red ticks). Above the dashed line: calibration runs; below: test runs. Horizontal lines: bit changes.", 6.2));
add(...FIGc(fig("fig06_forge_metrics.png"), "**Figure 6.** FORGE granite scores: median jump at bit changes, drift within a run and false-alarm rate in the test section.", 6.2));
add(tableForge());
add(H2("5.3 Volve 15/9-F-1 family: blind pore-pressure prediction"));
add(P(`With the shallow normal trend and an offset-fitted Eaton exponent, ${NH} reproduced the ${m.N_hat.n_blind} blind tests with an RMSE of ${f3(m.N_hat.rmse_sg)} sg (95% CI ${f3(B.N_hat.ci95[0])}–${f3(B.N_hat.ci95[1])}; Table 4, Figures 7–9). The classic d-exponent scored ${f3(m.d_surface_rpm.rmse_sg)} sg, d with bit speed ${f3(m.d.rmse_sg)} sg and the service company's own Dxc channel ${f3(m.Dxc_vendor.rmse_sg)} sg—all worse than repeating the offset-well mean (${f3(m.offset_mean.rmse_sg)} sg). The paired bootstrap places ${NH} ahead of these three and of the offset mean with more than 99% confidence. Against Dxc computed with the measured downhole ECD (${f3(m.Dxc.rmse_sg)} sg) the 95% interval of the difference (${f3(B.Dxc.nhat_minus_this_ci95[0])} to +${f3(B.Dxc.nhat_minus_this_ci95[1])} sg) just includes zero. All exponent predictors were biased low by 0.01–0.03 sg.`));
add(...FIGc(fig("fig07_volve_blind_profiles.png"), `**Figure 7.** Blind predictions against measured formation pressure in 15/9-F-1 B and F-1 C. Bars: ${NH} P10–P90 range. Dotted: sea-water gradient.`, 6.2));
add(...FIGc(fig("fig08_volve_crossplot.png"), "**Figure 8.** Predicted against measured pore-pressure gradient for the blind tests. Shaded: ±0.02 sg.", 3.6));
add(P(`The fitted Eaton exponents were small, between ${f2(m.N_hat.eaton_n)} and ${f2(m.d_surface_rpm.eaton_n)}, because at reservoir depth all exponents sat far below their shallow trends (ratios of 0.4–0.6). With the textbook exponent of 1.2 the same ratios imply pore pressures close to the overburden and errors of ${f2(m.d_surface_rpm.rmse_sg_eaton_1p2)}–${f2(m.N_hat.rmse_sg_eaton_1p2)} sg (Figure 9, right). The small exponent compresses the predictions toward the offset calibration, so part of the skill comes from the offset wells rather than from the exponent. The P10–P90 ranges were also too narrow: they contained the measured value for ${Math.round(100 * m.N_hat.p10_p90_coverage)}% of tests with ${NH} and ${Math.round(100 * m.Dxc.p10_p90_coverage)}% with Dxc, against the nominal 80%.`));
add(...FIGc(fig("fig09_volve_skill.png"), "**Figure 9.** Left: blind RMSE with 95% bootstrap intervals. Right: blind RMSE with the offset-fitted Eaton exponent and with the textbook value of 1.2 (log scale).", 6.2));
add(P(`Figure 10 repeats the test with other normal intervals. Shortening the interval to 350–700 m degrades most exponents because the trend slope is then poorly constrained, and extending it to 1,350 m changes little. Extending it to 2,300 m TVD, deep into the 17½-in section drilled with 1.40 sg mud, ruins Dxc, the service company's Dxc and ${NH} (RMSE 0.13–0.14 sg), whereas the uncorrected d-exponent is less affected. Section 5.6 shows that this interval may not be normally pressured either.`));
add(...FIGc(fig("fig10_volve_sensitivity.png"), "**Figure 10.** Blind RMSE as a function of the TVD interval used for the normal trend. Dashed: offset-well mean.", 6.2));
add(tableVolve());
add(H2("5.4 Which corrections matter"));
add(tableAblation());
add(P(`At Volve, replacing the measured downhole ECD by the surface mud weight raised the blind RMSE from ${f4(V.ablation["full N-hat"].blind_rmse_sg)} to ${f4(V.ablation["mud weight instead of downhole ECD"].blind_rmse_sg)} sg, and removing the measured stick-slip term raised it to ${f4(V.ablation["no vibration term"].blind_rmse_sg)} sg (Table 5, Figure 11). Fixing α at 1 or using surface speed changed the RMSE by 0.002–0.003 sg, inside the bootstrap interval; at Volve the logging unit already reported bit speed. At FORGE the wear term was the most useful: without it, false alarms in granite rose from ${f1(F.ablation["full N-hat"].granite_false_alarm_pct)}% to ${f1(F.ablation["no wear term"].granite_false_alarm_pct)}%. The surface-torque vibration proxy made jumps and drift slightly worse, and the hydraulics term raised false alarms. Removing bit speed gave few alarms but a drift five times larger, the same artefact as the classic d-exponent.`));
add(...FIGc(fig("fig11_ablation.png"), "**Figure 11.** Ablation: Volve blind RMSE and FORGE granite false-alarm rate and within-run drift with each correction removed. Dashed: full N̂.", 6.2));
add(H2("5.5 Second blind test: 15/9-19 BT2"));
add(P(`Applied unchanged to 15/9-19 BT2, the F-1 calibration placed the Hugin seal at ${f2(1.0925 + h19.d.bias_sg)}–${f2(1.0925 + h19.N_hat.bias_sg)} sg depending on the exponent (Figure 12, Table 6). Against the 17 measured Hugin pressures (1.09 sg) the plain d-exponent with reported bit speed was closest (RMSE ${f3(h19.d.rmse_sg)} sg), followed by the contractor's Dxc channel (${f3(h19.Dxc_vendor.rmse_sg)}), Dxc (${f3(h19.Dxc.rmse_sg)}) and ${NH} (${f3(h19.N_hat.rmse_sg)}). All four over-predicted, and all four beat the offset-well mean (${f3(h19.offset_mean.rmse_sg)}) and hydrostatic pressure (${f3(h19.hydrostatic.rmse_sg)}). Because the 17 tests share one seal window, this is effectively a single comparison, and the ranking of the exponents should not be read too closely. The ${NH} terms that helped at Volve—downhole stick-slip and the measured ECD—were not available in this 1998 well, which used a surface-computed ECD, so ${NH} reduced here to Dxc with a different speed response and a WOB-variability term.`));
add(P(`The comparison with the contractor's own real-time interpretation is the more striking result. At the seal of the Hugin, the pore-pressure curve recorded in the 1998 mud log read about 1.29 sg, an over-estimate of ${f2(h19.FPPG_contractor.bias_sg)} sg, and over the Hordaland shales (1.7–2.25 km TVD) it stayed close to hydrostatic where all offset-calibrated exponents read 1.10–1.15 sg. The exponents calibrated on offset tests were five to nine times more accurate at the reservoir than the interpretation made while drilling. The six Ty tests have no shale within 200 m above them; no exponent prediction was possible there, and none would have seen the depletion, because the sand had been drawn down by production while the surrounding shales had not.`));
add(...FIGc(fig("fig12_bt2_blind.png"), `**Figure 12.** 15/9-19 BT2 (1998): gamma ray, mud weight and ECD, exponents at shale samples, and pore pressure from the F-1 calibration (15-sample running medians) with the contractor's real-time estimate and the formation-multi-tester pressures in the Hugin (black) and the depleted Ty sand (red).`, 6.2));
add(tableBT2());
add(H2("5.6 Sonic slowness and the Hordaland shales"));
add(P(`No well in the open release has sonic data in the shallow, clearly normal section; the shallowest compressional slowness starts at 2,119 m MD in 15/9-19 A. A sonic Eaton benchmark (Eq. 17) therefore had to assume that the upper 300 m of shale logged there (Hordaland Group, ${Math.round(A.sonic.trend.normal_tvd_m[0])}–${Math.round(A.sonic.trend.normal_tvd_m[1])} m TVD) is normally pressured. The assumption fails: shale slowness *increases* with depth over that interval (Figure 13), the opposite of compaction, and a trend fitted to it gives a meaningless benchmark (blind RMSE ${f2(A.sonic.blind_rmse_sg)} sg with an offset-fitted exponent). Slowness that grows with depth in a uniform shale is the classic signature of undercompaction [@hottmann; @bowers]. Together with the 1.10–1.15 sg read by the offset-calibrated exponents in the same shales of BT2 (Figure 12), it suggests that the Hordaland shales are mildly overpressured. This offers a second explanation for the collapse of the trend when it is extended into the 17½-in section (Figure 10): besides the over-correction of Eq. (2), the trend may be bending because the pressure does change. The open data cannot separate the two.`));
add(...FIGc(fig("fig13_sonic_19A.png"), "**Figure 13.** 15/9-19 A: gamma ray and compressional slowness of shale samples. Shaded: the upper 300 m of sonic, which a trend-based method would have to treat as normally pressured; the slowness increases with depth there.", 5.6));
add(H2("5.7 Mud gas"));
add(P(`In the Hugin sandstone the wetness ratio was ${f1(A.gas["15_9-F-1"].reservoir_Wh_median)}–${f1(A.gas["15_9-F-1_B"].reservoir_Wh_median)}% and the balance ratio about 17 in all three logged wellbores (Table 7, Figure 14). With balance above wetness and wetness below 17.5%, the scheme of Haworth et al. [@haworth] classes the fluid as gas, whereas Volve produced a light oil with a formation volume factor of 1.33–1.45. The gas ratios read the reservoir as light hydrocarbons but would have misnamed the phase, a known limitation when the oil is gas-rich. In the deep shales of F-1 B and F-1 C, volume-normalised gas rose where ${NH} fell (Spearman ρ = ${f2(A.gas["15_9-F-1_B"].spearman_nhat_vs_normgas_deep_shale)} and ${f2(A.gas["15_9-F-1_C"].spearman_nhat_vs_normgas_deep_shale)}). That is the direction expected if both respond to a reduced overbalance, but it was absent in the pilot (ρ = ${f2(A.gas["15_9-F-1"].spearman_nhat_vs_normgas_deep_shale)}) and is far from a predictor in its own right.`));
add(...FIGc(fig("fig14_gas.png"), `**Figure 14.** 15/9-F-1 C below 2,300 m TVD: volume-normalised gas (Eq. 15), wetness and balance, character, and ${NH} at shale samples. Red lines: depths of the formation-pressure tests.`, 6.2));
add(tableGas());
add(H2("5.8 Mechanical specific energy"));
add(P(`Median MSE was ${f1(A.mse["15_9-F-1"].mse_median_ksi)} ksi in the pilot and about 70 ksi in the deeper sidetracks. In the shales of F-1 B and F-1 C, MSE and ${NH} were positively correlated (ρ = ${f2(A.mse["15_9-F-1_B"].spearman_mse_vs_nhat_shale)} and ${f2(A.mse["15_9-F-1_C"].spearman_mse_vs_nhat_shale)}; Figure 15), as expected when both rise with rock strength and fall with drillability. Samples whose MSE exceeded 2.5 times the running median were flagged as inefficient drilling (0.1–5.3% of samples). Removing them from calibration and test windows left the blind RMSE of ${NH} unchanged (${f4(A.mse.blind_rmse_with_mse_filter.N_hat)} against ${f4(m.N_hat.rmse_sg)} sg). MSE is useful for quality control of the drilling data but added no pressure information here.`));
add(...FIGc(fig("fig15_mse.png"), `**Figure 15.** Mechanical specific energy against ${NH} for shale samples below 1,300 m TVD in the three logged Volve wellbores.`, 3.7));

// 6
add(H1("6 Discussion"));
add(H2("6.1 What the corrections buy"));
add(P(`Across the wells a consistent rule appears: a correction helps when it is based on a downhole measurement and tends to hurt when it rests on a surface proxy. Bit speed matters whenever a motor is in the string; at FORGE, ignoring the motor made the d-exponent unusable. Measured downhole ECD and measured stick-slip carried most of ${NH}'s gain at Volve, whereas a torque-based vibration index added noise at FORGE. In the 1998 well, where neither downhole measurement existed, ${NH} had nothing to add over the classic exponents. Run-wise wear correction is cheap and, in hard rock, effective. The fitted speed exponent is informative where speed varies independently of other parameters, as at Volve (α ≈ 0.5); where speed is tied to flow through the motor it is not identifiable and should be fixed rather than fitted.`));
add(H2("6.2 Where drilling exponents fail anyway"));
add(P("None of the corrections addresses the main source of error in these wells: shifts of the exponent at hole-size and mud-weight changes, and possibly a pressure change in the Hordaland shales that the trend interval cannot see. At Volve the exponents at reservoir depth were 40–60% below the trend extrapolated from the shallow section, although the true overpressure was only 0.1–0.14 sg. A textbook Eaton exponent turns that into a gross overestimate; an offset-fitted exponent of about 0.12 absorbs it, but only because it is tuned to the same field. In practice, drilling-exponent pore pressure should be calibrated on offset tests in the same hole section, and a normal trend should not be carried across a large mud-weight step with the ratio correction of Eq. (2). The FORGE sediments show the lithological version of the same problem: drilling data alone cannot separate a sand-rich interval from an undercompacted shale, so a gamma-ray or cuttings-based lithology filter is a prerequisite."));
add(H2("6.3 Interpretation guide"));
add(P("Table 8 condenses the results into the form a pressure engineer at the rig would use: how each exponent responds to common drilling events and what to check before reading a change as pressure. It follows the logic of the classic pressure-log manuals [@exlog; @whittaker; @mouchet] but replaces rules of thumb with what was measured here."));
add(tableGuide());
add(H2("6.4 Relation to proprietary normalized exponents"));
add(P(`The published description of the proprietary Nx and Nxb mentions non-linear speed response, tooth efficiency and optional hydraulic normalisation, with Nxb as a baseline that separates pressure trends from lithology [@exlog]. ${NH} addresses the same effects with explicit, fitted terms. It is not a reconstruction of Nx, whose formula is not public, and no numerical comparison with Nx is possible; a distinct name was chosen to avoid confusion. The 1998 BT2 log, recorded by the same contractor, shows how much a calibrated, offset-tested trend can improve on an interpretation made while drilling, whatever exponent is used.`));
add(H2("6.5 Limitations"));
add(P("The evidence comes from one control well and one field. FORGE has no overpressure, and the Volve tests span a narrow pressure range in one reservoir, so the RMSE values say more about calibration than about detecting a transition. The tests are spatially clustered, which makes the bootstrap intervals optimistic, and the BT2 comparison rests on one seal window. The pressure is compared in the sand and predicted in the seal. The BT2 pressures were transcribed by hand from a scanned report, checked against the digital depths but not against an independent copy. The mud-line density of the overburden fit sits at its upper bound, and some FORGE motor ratings were inferred from motor size."));
add(H2("6.6 Further work"));
add(P("Three extensions follow directly. The first is a differential-pressure term in the spirit of Bourgoyne and Young [@by], fitted across hole sections, to replace the ratio correction of Eq. (2). The second is trends fitted per hole section with offset tests used as priors in a Bayesian update while drilling. The third is more public wells with measured pressures across a real transition zone; the code is written so that a new well needs only a loader."));

// 7
add(H1("7 Conclusions"));
add(B_(`${NH}, a normalized drilling exponent with explicit, data-fitted corrections for bit speed, hydraulics, vibration and bit wear, is defined and released as open code with processed data.`));
add(B_("In a motor-drilled granite well, the d-exponent computed from surface speed jumped 0.54 log units at bit changes; using bit speed reduced this to 0.33, and a run-wise wear term reduced false alarms from 49% to 31%."));
add(B_(`In ${m.N_hat.n_blind} blind formation-pressure tests at Volve, ${NH} (${f3(m.N_hat.rmse_sg)} sg) beat the classic d-exponent, the service company's Dxc and an offset-mean predictor, and was at best marginally better than an ECD-corrected Dxc. Measured downhole ECD and stick-slip carried most of the improvement.`));
add(B_(`In a 1998 sidetrack without downhole measurements, all offset-calibrated exponents were within 0.02–0.04 sg of the Hugin pressure, against a 0.20 sg error of the contractor's real-time estimate; there ${NH} had no advantage.`));
add(B_("Corrections based on downhole measurements helped; corrections based on surface proxies did not. Mud-gas ratios and mechanical specific energy added quality control but no pressure information."));
add(B_("Hole-size and mud-weight changes, and possibly mild overpressure in the Hordaland shales, dominate the exponents. The textbook Eaton exponent gave errors of 0.4–0.6 sg; drilling-exponent pore pressure should be calibrated on offset tests within the same hole section."));

// Appendix A
add(H1("Appendix A. Real-time implementation in a logging unit"));
add(P(`The method needs nothing beyond the channels a mud-logging unit already records, plus three items from the daily report: bit size and nozzle area, motor revolutions per gallon, and the casing and mud-weight programme. A practical sequence, which the repository implements in batch form, is:`));
add(C.numbered(cite("Before drilling: load the offset formation-pressure tests and fit the Eaton exponent of the chosen exponent on them, per hole section where possible (Section 4.4).")));
add(C.numbered(cite("In each hole section: compute bit speed, bit hydraulics and revolutions per run (Eqs. 3–6) at the logging-unit sampling rate, and average to 1 m or 1 ft.")));
add(C.numbered(cite("Flag shales from gamma ray at the bit or from the cuttings description; flag inefficient drilling from MSE (Eq. 16) and exclude both from trend fitting.")));
add(C.numbered(cite("After the first 150–300 m of shale in a new section, fit Eq. (8) with the speed exponent fixed if speed is tied to flow, and fit the section's normal trend (Eq. 11).")));
add(C.numbered(cite(`Compute ${NH} and its ratio to the trend sample by sample; raise an alarm only when the ratio stays below 0.85 for a set length of hole, and report pore pressure with its P10–P90 range (Eq. 12).`)));
add(C.numbered(cite("Cross-check every alarm against gas, torque and drag, cavings and temperature (Table 8) before changing the mud weight; restart the trend after a bit-size or large mud-weight change.")));
add(P("The same steps can be laid out in a spreadsheet, one row per depth sample, with the coefficients of Eq. (8) and the trend parameters held in fixed cells; the repository's results files list them for the wells used here."));

// back matter
add(tableNomen());
add(H1("Data availability statement"));
add(P("The Utah FORGE 16A(78)-32 data are openly available in the Geothermal Data Repository at https://doi.org/10.15121/1776602 under CC BY 4.0 [@forge]. The processed one-foot table, bit runs and motor ratings used here are in the code repository. The Volve data are available from Equinor ASA under the Equinor Open Data Licence after registration [@volve]; they are not redistributed, except for the 23 formation-multi-tester pressures of 15/9-19 BT2 transcribed from the scanned report, which are given with their source in the repository and in Supplementary Table S5. The summary results, per-test comparisons and the scripts that produce them are included."));
add(H1("Code availability"));
add(new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, children: [
  ...runs("All code is released under the MIT licence at "), C.link(GH, GH),
  ...runs(` (commit ${COMMIT}). Table 9 maps the equations and analyses to files, and Supplementary Section S4 lists the core module in full.`)] }));
add(TAB("**Table 9.** Where each part of the work is implemented.", ["Item", "File and function"], [
  ["Eqs. (1)–(2)", "nhat/core.py · d_exponent, dxc"], ["Eqs. (3)–(7)", "nhat/core.py · bit_rpm, bit_hydraulics, run_revolutions, vibration_indices"],
  ["Eqs. (8)–(10)", "nhat/core.py · NHat.fit, NHat.transform"], ["Eqs. (11)–(12), alarms", "nhat/core.py · NHat.baseline, NHat.eaton, NHat.alarms"],
  ["Eq. (13)", "scripts/volve_case.py · fit_overburden"], ["Eqs. (14)–(17)", "scripts/addenda.py · gas_ratios, teale_mse_psi, sonic_benchmark"],
  ["FORGE study", "scripts/forge_case.py"], ["Volve F-1 study, bootstrap", "scripts/volve_case.py, scripts/volve_bootstrap.py"],
  ["15/9-19 BT2 study", "scripts/convert_volve_lis.py, scripts/volve19_case.py"], ["Figures 1–15", "scripts/make_figures.py, scripts/make_figures_addenda.py"]], [2600, 6400], null, true));
add(H1("Acknowledgements"));
add(P("The author thanks Equinor and the former Volve licence partners for releasing the Volve data, and the Utah FORGE project, funded by the U.S. Department of Energy, for publishing the 16A(78)-32 drilling data."));
add(H1("Conflict of interest"));
add(P("The author declares no conflict of interest."));
add(H1("ORCID"));
add(P("Rajab Ali: [to be added]"));

// references (after all text, so ORDER is complete)
add(H1("References"));
ORDER.forEach((k, i) => add(new Paragraph({ spacing: { after: 80, line: 264 }, indent: { left: 440, hanging: 440 },
  children: [new TextRun({ text: `${i + 1}.\t`, size: 20 }), ...runs(REF[k], { size: 20 })] })));
const unused = Object.keys(REF).filter((k) => !ORDER.includes(k));
if (unused.length) console.log("unused references:", unused.join(", "));

const doc = new Document({
  creator: "Rajab Ali", title: "An open normalized drilling exponent for pore-pressure estimation", styles: STYLES, numbering: NUMBERING,
  sections: [{
    properties: { ...PAGE, lineNumbers: { countBy: 1, restart: LineNumberRestartFormat.CONTINUOUS } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "ALI — Open normalized drilling exponent", size: 16, color: "52514E" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("written", OUT, buf.length, "refs", ORDER.length); });
