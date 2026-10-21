// Manuscript: Energy Science & Engineering (Wiley), A4, numbered references.
const fs = require("fs");
const path = require("path");
const C = require("./common");
const { d, runs, P, H1, H2, H3, bullet, link, pageBreak, r, sub, sup, frac, br, fn, EQ, FIG, TABLE, CODE,
  STYLES, NUMBERING, PAGE } = C;
const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, PageNumber,
  LineNumberRestartFormat } = d;

const REPO = process.argv[2];                       // repo root
const OUT = process.argv[3];
const COMMIT = process.argv[4] || "main";
const GH = "https://github.com/hadree512/nhat-drilling-exponent";
const fig = (n) => path.join(REPO, "figures", n);
const J = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8").replace(/\bNaN\b/g, "null"));
const V = J("results/volve/summary.json"), F = J("results/forge/summary.json"), B = J("results/volve/bootstrap.json");
const NH = "N̂", NH0 = "N̂~0~", RS = "R∗";
const f3 = (x) => (x === null || x === undefined || Number.isNaN(x)) ? "–" : Number(x).toFixed(3);
const f2 = (x) => Number(x).toFixed(2), f1 = (x) => Number(x).toFixed(1), f4 = (x) => Number(x).toFixed(4);

const LABEL = { d_surface_rpm: "d, surface RPM", d: "d, bit RPM", Dxc_vendor: "Dxc, service company",
  Dxc: "Dxc, downhole ECD", N_hat: `${NH} (this work)`, offset_mean: "Offset-well mean", hydrostatic: "Hydrostatic (1.03 sg)" };

// ------------------------------------------------------------------ equations
const log10 = (c) => fn("log", [ ...c ]);
const eqD = [r("d="), frac([r("log"), br([frac([r("R")], [r("60"), r("N")])])],
  [r("log"), br([frac([r("12"), r("W")], [sup([r("10")], "3"), r("D")])])])];
const eqDxc = [sub("d", "xc"), r("=d"), frac([sub("ρ", "n")], [sub("ρ", "ECD")])];
const eqNbit = [sub("N", "bit"), r("="), sub("N", "s"), r("+"), sub("c", "m"), r("Q")];
const eqDP = [r("Δ"), sub("P", "b"), r("="), frac([r("ρ"), sup([r("Q")], "2")],
  [r("12031 "), sup([sub("C", "d")], "2"), sup([sub("A", "t")], "2")])];
const eqHSI = [r("HSI="), frac([r("Δ"), sub("P", "b"), r("Q")], [r("1714"), br([r("π"), sup([r("D")], "2"), r("/4")])])];
const eqRev = [sub("n", "rev"), br([r("z")]), r("="), new C.MathSum({ children: [sub("N", "bit"), frac([r("60 Δz")], [r("R")])],
  subScript: [r("run")] })];
const eqSSI = [r("SSI="), frac([sub("N", "max"), r("−"), sub("N", "min")], [r("2"), sub("N", "avg")]),
  r(",  WI="), frac([sub("σ", "W")], [sub("μ", "W")])];
const eqFit = [r("ln R="), sub("b", "0"), r("+"), sub("b", "1"), r("z+a ln"), br([frac([r("12W")], [sup([r("10")], "3"), r("D")])]),
  r("+α ln"), br([frac([sub("N", "bit")], [sub("N", "ref")])]), r("+β ln min"), br([frac([r("HSI")], [sub("HSI", "ref")]), r(",1")]),
  r("+"), sub("γ", "s"), r("SSI+"), sub("γ", "w"), r("WI+ε")];
const eqRstar = [r("ln "), sup([r("R")], "∗"), r("=ln R−α ln"), br([frac([sub("N", "bit")], [sub("N", "ref")])]),
  r("−β ln min"), br([frac([r("HSI")], [sub("HSI", "ref")]), r(",1")]), r("−"), sub("γ", "s"), r("SSI−"), sub("γ", "w"),
  r("WI−"), sub("k", "j"), sub("n", "rev")];
const eqNhat = [r("N̂="), frac([r("log"), br([frac([sup([r("R")], "∗")], [r("60 "), sub("N", "ref")])])],
  [r("log"), br([frac([r("12W")], [sup([r("10")], "3"), r("D")])])]), r("⋅"), frac([sub("ρ", "n")], [sub("ρ", "ECD")])];
const eqTrend = [r("ln "), sub("N̂", "0"), br([r("z")]), r("="), sub("c", "0"), r("+"), sub("c", "1"), r("z")];
const eqEaton = [sub("ρ", "p"), r("=S−"), br([r("S−"), sub("ρ", "n")]), sup([br([frac([r("N̂")], [sub("N̂", "0")])])], "n")];
const eqRho = [sub("ρ", "b"), br([r("z")]), r("="), sub("ρ", "ma"), r("−"), br([sub("ρ", "ma"), r("−"), sub("ρ", "ml")]),
  r("exp"), br([r("−k"), sub("z", "bml")])];

// ------------------------------------------------------------------ tables from results
function tableFitted() {
  const v = V.fitted, s = F.sediment_fit, g = F.granite_fit;
  const row = (name, key, fmt = f3) => [name, fmt(v[key]), fmt(s[key]), fmt(g[key])];
  return TABLE("**Table 2.** Drilling-response coefficients of Eq. (8), fitted by Huber regression on the calibration interval of each case.",
    ["Coefficient", "Volve F-1 shales", "FORGE sediments", "FORGE granite"],
    [row("Depth term *b*~1~ (per 10^4^ ft)", "depth"), row("WOB term *a*", "ln_w"),
     row("Rotary-speed exponent α", "alpha"), row("Hydraulics exponent β", "beta"),
     row("Stick-slip coefficient γ~s~", "g_ss"), row("WOB-variability coefficient γ~w~", "g_wh"),
     ["Samples used", String(v.n_calib), String(s.n_calib), String(g.n_calib)],
     ["*R*^2^ of ln *R*", f2(v.r2_calib), f2(s.r2_calib), f2(g.r2_calib)]],
    [3300, 1900, 1900, 1900],
    "α was bounded to 0.3–1.2; the FORGE values sit on these bounds, which means the speed response is not identifiable there. β is zero for Volve because nozzle areas were not available, so the hydraulics term is inactive. γ~s~ uses the measured downhole stick-slip index at Volve and the surface-torque proxy at FORGE.");
}
function tableForge() {
  const m = F.granite, cols = ["d_surface_rpm", "d", "Dxc", "N_hat"];
  return TABLE("**Table 3.** FORGE 16A(78)-32, granite test section (MD > 7,390 ft, normally pressured). Lower is better in every column.",
    ["Exponent", "False alarms (%)", "Jump at bit change |Δln|", "Drift in run per 10^5^ rev", "Scatter (MAD of ln)", "P10–P90 band (ln)"],
    cols.map((c) => [LABEL[c], f1(m[c].false_alarm_pct), f2(m[c].bit_change_jump_log_all_runs), f2(m[c].within_run_drift),
      f3(m[c].test_scatter_mad_log), f2(m[c].cal_band_width_log)]),
    [2300, 1300, 1550, 1500, 1300, 1150],
    `Jumps are medians over the ${m.N_hat.n_bit_changes_all_runs} bit changes in the granite. In the sediments every exponent flagged ${f1(F.sediment.N_hat.false_alarm_pct)}–${f1(F.sediment.d_surface_rpm.false_alarm_pct)}% of the test interval, which coincides with the clay-to-granite-wash change (Section 6.2).`);
}
function tableVolve() {
  const m = V.metrics, order = ["d_surface_rpm", "d", "Dxc_vendor", "Dxc", "N_hat"];
  const rows = order.map((c) => [LABEL[c], f3(m[c].rmse_sg), `${f3(B[c].ci95[0])}–${f3(B[c].ci95[1])}`, f3(m[c].bias_sg),
    f2(m[c].eaton_n), f2(m[c].rmse_sg_eaton_1p2), `${Math.round(100 * m[c].p10_p90_coverage)}`]);
  rows.push([LABEL.offset_mean, f3(m.offset_mean.rmse_sg), `${f3(B.offset_mean.ci95[0])}–${f3(B.offset_mean.ci95[1])}`,
    f3(m.offset_mean.bias_sg), "–", "–", "–"]);
  rows.push([LABEL.hydrostatic, f3(m.hydrostatic.rmse_sg), "–", f3(m.hydrostatic.bias_sg), "–", "–", "–"]);
  return TABLE(`**Table 4.** Volve: blind prediction of ${m.N_hat.n_blind} formation-pressure tests in 15/9-F-1 B and F-1 C (sg EMW).`,
    ["Predictor", "RMSE", "95% CI (bootstrap)", "Bias", "Eaton *n* (fitted)", "RMSE with *n* = 1.2", "P10–P90 coverage (%)"],
    rows, [2350, 900, 1450, 900, 1000, 1150, 1250],
    "Normal trend fitted on the shales of 15/9-F-1 between 350 and 950 m TVD; Eaton exponent fitted on the eight tests of F-1 and F-1 A. Two blind tests without shale in the 50 m above them are excluded for the exponent predictors.");
}
function tableAblation() {
  const v = V.ablation, f = F.ablation;
  const names = [["full N-hat", "Full " + NH], ["surface RPM only", "Surface RPM instead of bit RPM"], ["alpha = 1", "α fixed at 1"],
    ["no vibration term", "No vibration term"], ["no wear term", "No wear term"]];
  const rows = names.map(([k, lab]) => [lab, f4(v[k].blind_rmse_sg), f1(f[k].granite_false_alarm_pct), f3(f[k].granite_within_run_drift),
    f2(f[k].granite_bit_change_jump)]);
  rows.push(["Mud weight instead of downhole ECD", f4(v["mud weight instead of downhole ECD"].blind_rmse_sg), "–", "–", "–"]);
  rows.push(["No hydraulics term", "–", f1(f["no hydraulics term"].granite_false_alarm_pct), f3(f["no hydraulics term"].granite_within_run_drift),
    f2(f["no hydraulics term"].granite_bit_change_jump)]);
  return TABLE("**Table 5.** Ablation: each correction switched off in turn.",
    ["Variant", "Volve blind RMSE (sg)", "FORGE false alarms (%)", "FORGE drift in run", "FORGE jump at bit change"],
    rows, [3300, 1500, 1450, 1350, 1400]);
}
function tableData() {
  return TABLE("**Table 1.** Data used in this study.",
    ["", "Utah FORGE 16A(78)-32", "Volve 15/9-F-1, F-1 A, F-1 B, F-1 C"],
    [["Setting", "Geothermal; basin fill over granite, deviated well (65° tangent)", "North Sea, jack-up; Tertiary shales over Jurassic sandstone"],
     ["Drilled", "Oct 2020 – Jan 2021", "2007 – 2014"],
     ["Depth range used", `130–10,987 ft MD (${F.data.rows_used.toLocaleString("en-US")} one-foot samples)`, "223–4,094 m MD (1 m samples)"],
     ["Drilling channels", "ROP, WOB, surface RPM, torque, flow, SPP (mud log)", "ROP, WOB, surface and bit RPM, torque, flow, SPP, MW, ECD (mud log)"],
     ["Downhole channels", "none", "GR, density, downhole ECD, downhole RPM min/max/avg, vibration (MWD)"],
     ["From daily reports", "MW, bit runs, bit size, TFA, motor rev/gal", "water depth 91 m, RKB 54.9 m, FIT values"],
     ["Bit speed", `motors on every run; median surface ${F.data.surface_rpm_median.toFixed(0)} rpm, bit ${F.data.bit_rpm_median.toFixed(0)} rpm`, "bit RPM recorded by the logging unit"],
     ["Pressure ground truth", "normally pressured (MW 8.8–9.3 ppg, no influx)", "31 formation-pressure tests, 1.13–1.17 sg EMW"],
     ["Licence", "CC BY 4.0", "Equinor Open Data Licence"]],
    [1900, 3550, 3550], null, true);
}
function tableNomen() {
  return TABLE("**Nomenclature**", ["Symbol", "Meaning (unit)"], [
    ["*A*~t~", "total nozzle flow area (in^2^)"], ["*a*, *b*~0~, *b*~1~", "coefficients of Eq. (8)"],
    ["*C*~d~", "nozzle discharge coefficient (0.95)"], ["*c*~m~", "motor speed per unit flow (rev/gal)"],
    ["*D*", "bit diameter (in)"], ["*d*, *d*~xc~", "d-exponent and mud-weight-corrected d-exponent (–)"],
    ["HSI", "hydraulic horsepower per square inch of bit area (hp/in^2^)"], ["*k*~j~", "wear coefficient of bit run *j* (per 10^6^ rev)"],
    ["*N*~s~, *N*~bit~", "surface and bit rotary speed (rpm)"], ["*N*~ref~", "reference bit speed (100 rpm)"],
    [NH + ", " + NH0, "normalized drilling exponent and its normal trend (–)"], ["*n*", "Eaton exponent (–)"],
    ["*n*~rev~", "cumulative bit revolutions in the current run"], ["Δ*P*~b~", "pressure drop across the bit nozzles (psi)"],
    ["*Q*", "flow rate (gal/min)"], ["*R*, " + RS, "rate of penetration, measured and at reference state (ft/h)"],
    ["*S*", "overburden gradient (sg or ppg EMW)"], ["SSI, WI", "stick-slip index, WOB variability index (–)"],
    ["*W*", "weight on bit (klbf)"], ["*z*", "true vertical depth"], ["α, β, γ~s~, γ~w~", "response coefficients in Eq. (8)"],
    ["ρ~n~, ρ~ECD~, ρ~p~", "normal pore-pressure gradient, equivalent circulating density, pore-pressure gradient (sg or ppg)"],
  ], [1900, 7100], null, true);
}

// ------------------------------------------------------------------ document body
const body = [];
const add = (...x) => x.flat().forEach((y) => body.push(y));

// title page
add(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 120 }, children: [new TextRun({ text: "RESEARCH ARTICLE", size: 18, bold: true, color: "52514E" })] }));
add(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 240 }, children: [new TextRun({
  text: "An open normalized drilling exponent for pore-pressure estimation: formulation and blind tests on two public wells", bold: true, size: 32 })] }));
add(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Rajab Ali", size: 24 }), new TextRun({ text: "1,*", superScript: true, size: 24 })] }));
add(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "1", superScript: true, size: 20 }), new TextRun({ text: "Shanghai Shenkai Petroleum Science and Technology Co. Ltd., Shanghai, China", size: 20 })] }));
add(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "*Correspondence: Rajab Ali, rajabali8206@gmail.com", size: 20 })] }));

add(H1("Abstract"));
add(P(`Drilling exponents such as the d-exponent and its mud-weight-corrected form Dxc are still the quickest way to read pore pressure from drilling data while the bit is turning, yet the refined normalized exponents used by service companies were never published and their benefit has not been tested in the open. This paper sets out ${NH}, a normalized drilling exponent whose corrections are written out in full, and compares it with the classic exponents on two public datasets. ${NH} maps the rate of penetration to a reference drilling state before the exponent is formed: bit speed including the mud motor, a rotary-speed response fitted on calibration shales, bit hydraulics, measured or proxy vibration and run-wise bit wear. Its normal trend is a median regression whose P10–P90 band is carried through Eaton's equation. In the normally pressured Utah FORGE 16A(78)-32 well, using surface instead of bit speed raised the jump of the d-exponent at bit changes from 0.33 to 0.54 log units, and the run-wise wear term cut false alarms in granite from 49% to 31%. In the Volve 15/9-F-1 wells, with the normal trend taken from shallow sea-water-drilled shales and the Eaton exponent fitted on offset wellbores, ${NH} predicted 21 blind formation-pressure tests with an RMSE of ${f3(V.metrics.N_hat.rmse_sg)} sg, against ${f3(V.metrics.Dxc_vendor.rmse_sg)} sg for the service company's Dxc, ${f3(V.metrics.d_surface_rpm.rmse_sg)} sg for the classic d-exponent and ${f3(V.metrics.offset_mean.rmse_sg)} sg for simply repeating the offset-well mean. It could not be separated from an ECD-corrected Dxc (${f3(V.metrics.Dxc.rmse_sg)} sg). The fitted Eaton exponent was about 0.12; the textbook 1.2 gave errors of 0.4–0.6 sg for every exponent, because changes of hole size and mud weight, not pore pressure, dominate the exponents in these wells. Code and processed data are public.`));
add(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Keywords: ", bold: true }),
  new TextRun("d-exponent; drilling data; Eaton method; open data; overpressure; pore pressure; Utah FORGE; Volve")] }));

// 1 Introduction
add(H1("1 Introduction"));
add(P("Pore pressure sets the lower bound of the mud-weight window, and an estimate of it is needed long before any log reaches the depth in question. Log-based methods relate the departure of porosity-sensitive measurements from a normal compaction trend to excess pore pressure [1–4], whether that pressure comes from disequilibrium compaction or from fluid expansion [5]. They are the reference in most post-drill studies. While drilling, however, the only measurements at the bit are often the drilling parameters themselves. Jorden and Shirley [6] normalised the rate of penetration (ROP) for weight on bit (WOB), rotary speed and bit diameter to obtain the d-exponent, and Rehm and McClendon [7] corrected it for mud weight. Bourgoyne and Young [8] went further and fitted a full multiple-regression ROP model whose differential-pressure term can be inverted for pore pressure."));
add(P("Six decades later the corrected d-exponent, Dxc, is still plotted in most mud-logging units, and its weaknesses are well known [2, 9, 10]. It assumes that ROP is proportional to rotary speed. It cannot tell a change of lithology from a change of pressure, and it shifts at every bit change, casing point and mud-weight step. Downhole motors make the surface rotary speed a poor proxy for the speed of the bit. Service companies responded with normalized exponents that add corrections for non-linear speed response, tooth wear and hydraulics; the best known pair is the normalized exponent Nx and its baseline Nxb [10]. Their formulas were kept proprietary, so neither the corrections nor their benefit can be checked independently."));
add(P("Machine-learning studies have since used drilling data to predict pore pressure, but most rely on simulator output or on data that cannot be shared. A recent public dataset for formation-pressure prediction, for example, comes from a drilling simulator and covers a few metres of hole [11]. What is missing is a transparent formulation tested blind against measured pressures on data anyone can download."));
add(P(`This paper fills that gap in a limited but reproducible way. Section 3 defines ${NH} (N-hat), a normalized exponent in which every correction is explicit and fitted from the well's own calibration interval. Section 4 describes two public wells and an evaluation protocol with blind tests, null predictors, bootstrap intervals and ablation. The aim is not to show that a new exponent detects overpressure earlier. It is to measure, on real data, which corrections help, by how much, and where drilling exponents fail regardless of the corrections.`));

// 2 Background
add(H1("2 Drilling exponents and Eaton's method"));
add(P("In field units, with ROP *R* in ft/h, rotary speed *N* in rpm, WOB *W* in klbf and bit diameter *D* in inches, the d-exponent is [6]"));
add(EQ(eqD, 1));
add(P("Both logarithms are negative in normal drilling, and *d* increases with depth as shales compact. The mud-weight correction of Rehm and McClendon [7] is"));
add(EQ(eqDxc, 2));
add(P("with ρ~n~ the normal pore-pressure gradient and ρ~ECD~ the equivalent circulating density, both as mud weights. A normal trend is drawn through Dxc in shales known or assumed to be normally pressured, and pore pressure follows from Eaton's ratio method [3] (Eq. 12 below). Eaton gave an exponent of 1.2 for drilling exponents; in practice the exponent is calibrated on offset wells [4]. The ratio correction of Eq. (2) is empirical and is known to over-correct when the overbalance is large [2, 9], which matters below."));

// 3 Method
add(H1(`3 The normalized exponent ${NH}`));
add(P(`The idea behind ${NH} is simple: correct the ROP, not the exponent. Each measured ROP is mapped to the ROP that would have been obtained at a reference drilling state. The reference state has the bit turning at 100 rpm, sufficient hydraulics, no vibration and a sharp bit. Equation (1) is then applied to the corrected ROP. Each correction is defined below (Figure 1) and coded in the module ` + "`nhat/core.py`" + " of the repository (Table 6)."));
add(...FIG(fig("fig01_workflow.png"), `**Figure 1.** Workflow of the method and of its evaluation. ${NH}: normalized drilling exponent; HSI: hydraulic horsepower per square inch; SSI, WI: stick-slip and WOB variability indices.`, 6.2));
add(H2("3.1 Bit-level quantities"));
add(P("With a positive-displacement motor in the bottom-hole assembly, the bit turns at the surface speed plus the motor output,"));
add(EQ(eqNbit, 3));
add(P("where *Q* is the flow rate and *c*~m~ the motor's revolutions per gallon. The hydraulic energy at the bit follows from the nozzle pressure drop and the hydraulic horsepower per square inch of hole [12],"));
add(EQ(eqDP, 4));
add(EQ(eqHSI, 5));
add(P("with ρ in ppg, *Q* in gal/min, total flow area *A*~t~ in in^2^ and *C*~d~ = 0.95. Bit wear is tracked as cumulative bit revolutions within each bit run *j*. The time on bottom is obtained from depth and ROP, not from depth alone:"));
add(EQ(eqRev, 6));
add(P("Vibration enters through two indices. Where the MWD tool records minimum, maximum and average downhole rotary speed, the stick-slip index is the normalised speed range; otherwise the rolling coefficient of variation of surface torque is used as a proxy. The WOB variability index WI is the rolling coefficient of variation of WOB over 30 samples:"));
add(EQ(eqSSI, 7));
add(H2("3.2 Fitting the drilling response"));
add(P("On a calibration interval of shales, ln *R* is regressed on depth and the drilling variables:"));
add(EQ(eqFit, 8));
add(P(`The fit uses Huber's robust loss [13], as implemented in scikit-learn [14], because ROP records contain spikes from connections and short drilling breaks. Terms that come out with a non-physical sign, such as β < 0 or γ > 0, are dropped and the fit is repeated. The speed exponent α is bounded to 0.3–1.2. The classic d-exponent corresponds to α = 1. Once Eq. (8) is fitted, its residuals within each bit run are regressed on *n*~rev~; a negative slope *k*~j~ is read as dulling, and a positive slope is set to zero.`));
add(H2(`3.3 Reference-state ROP and ${NH}`));
add(P(`The ROP at the reference state follows from Eq. (8),`));
add(EQ(eqRstar, 9));
add(P(`and ${NH} is the d-exponent of ${RS} at the reference speed, with the mud-weight correction of Eq. (2) applied using the downhole ECD where it is measured:`));
add(EQ(eqNhat, 10));
add(P(`With all corrections switched off and α = 1, ${NH} reduces exactly to Dxc. This makes ablation straightforward: each term can be removed on its own and its effect measured.`));
add(H2("3.4 Normal trend, uncertainty and pore pressure"));
add(P(`The normal trend is a median (quantile) regression [15] of ln ${NH} on true vertical depth over the shales of the normal interval,`));
add(EQ(eqTrend, 11));
add(P(`and the 10th and 90th percentiles of its residuals define a band. Pore pressure follows from Eaton's equation,`));
add(EQ(eqEaton, 12));
add(P(`with *S* the overburden gradient. Evaluating Eq. (12) at the two edges of the band gives a P10–P90 range. An alarm is raised when ${NH}/${NH0} falls below 0.85, but only if it stays there for a set length of hole (30 ft at FORGE, 10 samples at Volve), which suppresses single-sample spikes. Where a density log covers only part of the well, the overburden is integrated from`));
add(EQ(eqRho, 13));
add(P("fitted to the logged densities below the mud line, with sea water above it."));
add(CODE(
`from nhat.core import NHat, NHatConfig

model = NHat(NHatConfig(rho_normal_ppg=8.6))      # 1.03 sg
t = model.prepare(table)                           # Eqs. (3)-(7)
model.fit(t, calib_mask)                           # Eq. (8) and k_j per bit run
t = model.transform(t)                             # Eqs. (9)-(10): column "N_hat"
trend, par = model.baseline(t, normal_mask)        # Eq. (11) with P10/P90 band
pp_ppg = model.eaton(t["N_hat"] / trend["N_hat_0"], None, obg_psi_ft=0.95)  # Eq. (12)`,
  `**Listing 1.** Minimal use of the library (${GH}/blob/${COMMIT}/nhat/core.py).`));

// 4 Data and protocol
add(H1("4 Data and evaluation protocol"));
add(tableData());
add(H2("4.1 Utah FORGE 16A(78)-32"));
add(P(`Well 16A(78)-32 was drilled at the Utah FORGE geothermal site near Milford, Utah, in late 2020 [16]. It passes through about 4,400 ft of basin-fill sediments into granite and was steered to a 65° tangent, reaching 10,987 ft MD (8,559 ft TVD). The published mud log gives ROP, WOB, surface rotary speed, torque, pump pressure and flow every foot. The 74 daily drilling reports were converted to text and parsed for mud weight, bit runs, bit size, total flow area and motor specification. A positive-displacement motor was used on every drilling run; its revolutions per gallon were read from the reports where stated (0.155 and 0.242 rev/gal) and otherwise taken from the same motor size (Supplementary Table S3). Coring runs were removed, leaving ${F.data.rows_used.toLocaleString("en-US")} samples in ${F.data.bit_runs_used} bit runs (Figure 2). The mud weight never exceeded 9.3 ppg and no influx was reported, so the well is treated as normally pressured: any overpressure alarm is a false alarm. A time-based rig-sensor file published with the well turned out to come from a later operation (April 2022) and was not used.`));
add(...FIG(fig("fig02_forge_overview.png"), "**Figure 2.** Utah FORGE 16A(78)-32: rate of penetration, weight on bit, surface and bit rotary speed, mud weight and bit hydraulic horsepower per square inch. Dashed line: top of granite. Thin grey lines: bit-run boundaries.", 6.0));
add(P("Two questions were asked of this well. In the sediments, drilled by a single 12¼-in bit, the normal trend was fitted between 1,700 and 3,400 ft TVD and alarms were counted below. In the granite, the response coefficients and trend were fitted on bit runs above 7,390 ft MD and the test runs below were scored on false alarms, on the jump of the exponent across bit changes and on its drift with revolutions inside a run. In a homogeneous, normally pressured rock, a good normalisation should show none of these."));
add(H2("4.2 Volve 15/9-F-1 family"));
add(P("Volve is a depleted oil field in the Norwegian North Sea whose subsurface and operational data were released by Equinor in 2018 [17]. The pilot 15/9-F-1 and its sidetracks F-1 A, F-1 B and F-1 C were drilled from the jack-up Mærsk Inspirer in 91 m of water. The mud logs (one sample per metre) provide ROP, WOB, surface and bit rotary speed, torque, flow, mud weight and, for the pilot, an ECD estimate. The MWD composite logs (0.1 m, resampled to 1 m) add gamma ray, density, downhole annular pressure and ECD, the minimum, maximum and average downhole rotary speed, and vibration severity. Nozzle areas were not available, so the hydraulics term is inactive at Volve."));
add(P(`The four wellbores hold 31 formation-pressure tests taken while drilling in the Jurassic reservoir between 2,948 and 3,200 m TVD. They read 1.13–1.17 sg equivalent mud weight, against a sea-water gradient of 1.03 sg: a moderate but clear overpressure. Shales were selected where the gamma-ray shale volume exceeded 0.5. The overburden was integrated from Eq. (13) fitted to the pooled densities of the three logged wellbores (ρ~ml~ = ${f2(V.overburden.rho_mudline)} g/cm^3^ at its upper bound, *k* = ${(V.overburden.k_per_m * 1e4).toFixed(1)} × 10^−4^ m^−1^), giving about 2.2 sg at 3,000 m TVD.`));
add(...FIG(fig("fig03_volve_f1_logs.png"), `**Figure 3.** Volve 15/9-F-1, the calibration well: gamma ray (green where classed as shale), ROP, surface and bit rotary speed, mud weight, ECD and overburden, downhole stick-slip index, and Dxc and ${NH} at shale samples. Shaded: normal-trend interval (350–950 m TVD).`, 6.2));
add(H2("4.3 Calibration and blind test at Volve"));
add(P(`Everything was fitted on the pilot F-1 and then applied unchanged to F-1 B and F-1 C. The response coefficients of Eq. (8) were fitted on the pilot's shales between 350 and 2,300 m TVD. The normal trend of every exponent was fitted on the pilot's shales between 350 and 950 m TVD. That 26-in section was drilled with sea water and spud mud of 1.03–1.07 sg, so it is the one interval where both normal pressure and a small overbalance can be assumed. The Eaton exponent of each predictor was then fitted by least squares to the eight tests of F-1 and F-1 A (offset calibration), and the 23 tests of F-1 B and F-1 C were predicted blind. F-1 A has no mud log of its own; its tests were matched to the pilot's shales at the same depth.`));
add(P("Because the pressure is measured in the sandstone and the exponent is read in the overlying seal, each test was compared with the median prediction from shale samples within 50 m TVD above it. This assumes pressure continuity between seal and reservoir, the usual premise of shale-based methods [4]. Two blind tests had no shale in that window and were dropped for the exponent predictors, leaving 21. Two null predictors were scored alongside: the hydrostatic gradient and the mean of the offset tests. Confidence intervals come from 5,000 bootstrap resamples of the blind tests [18]. Tests in one wellbore are spatially correlated, so these intervals are optimistic."));

// 5 Results
add(H1("5 Results"));
add(H2("5.1 Fitted drilling response"));
add(tableFitted());
add(P(`At Volve the fitted speed exponent was α = ${f2(V.fitted.alpha)}, roughly half the value implied by the d-exponent (Figure 4). Measured stick-slip and WOB variability both lowered ROP (γ~s~ = ${f2(V.fitted.g_ss)}, γ~w~ = ${f2(V.fitted.g_wh)}), and two of the seven bit runs showed a measurable slowing with revolutions. The regression explains about a third of the variance of ln *R*. At FORGE the picture is less clean. In the sediments α ran to its upper bound, and in the granite to its lower bound with an *R*^2^ of only ${f2(F.granite_fit.r2_calib)}. Here the speed response is not identifiable from the data: surface speed changed little within runs and bit speed varied mostly with flow. The wear coefficients, on the other hand, were negative in 12 of 16 FORGE runs, as expected in abrasive granite.`));
add(...FIG(fig("fig04_rpm_response.png"), `**Figure 4.** Partial residual of ln ROP against bit speed for the Volve calibration shales, after removing the other terms of Eq. (8). The fitted slope (α = ${f2(V.fitted.alpha)}) is about half the slope of 1 assumed by the d-exponent.`, 3.6));
add(H2("5.2 FORGE: normally pressured control well"));
add(P(`Table 3 and Figures 5–6 summarise the granite test section. The classic d-exponent computed with surface rotary speed behaves erratically: it changes by ${f2(F.granite.d_surface_rpm.bit_change_jump_log_all_runs)} log units across a typical bit change and drifts by about 1 log unit per 10^5^ revolutions. That is because surface speed was 0–60 rpm while the motor added 100–170 rpm, and the surface share changed from run to run. Its low alarm count (${f1(F.granite.d_surface_rpm.false_alarm_pct)}%) is an artefact of a P10–P90 band four times wider than the others. Using bit speed reduces the jumps to ${f2(F.granite.d.bit_change_jump_log_all_runs)} and the drift to ${f2(F.granite.d.within_run_drift)}. Dxc changes nothing here because the mud weight was almost constant.`));
add(P(`${NH} gave the fewest false alarms of the three usable exponents (${f1(F.granite.N_hat.false_alarm_pct)}% against ${f1(F.granite.Dxc.false_alarm_pct)}% for Dxc), but its jumps and drift were no smaller than those of Dxc. The ablation (Section 5.4) shows why. The wear term removes alarms, while the surface-torque vibration proxy adds noise.`));
add(P(`In the sediments every exponent failed in the same way: ${f1(F.sediment.N_hat.false_alarm_pct)}–${f1(F.sediment.d_surface_rpm.false_alarm_pct)}% of the test interval was flagged. The daily reports describe the lower sediments as granite-derived sand with kaolinitic clay. The steep compaction trend fitted on the upper clays therefore does not apply below, and no drilling normalisation can fix a change of rock type.`));
add(...FIG(fig("fig05_forge_granite_exponents.png"), "**Figure 5.** FORGE granite: d with surface and with bit speed, Dxc and N̂, with the normal trend (black), its P10–P90 band (grey) and persistent alarms (red ticks). Above the dashed line: calibration runs; below: test runs. Horizontal lines: bit changes.", 6.2));
add(...FIG(fig("fig06_forge_metrics.png"), "**Figure 6.** FORGE granite scores: median jump at bit changes, drift within a run and false-alarm rate in the test section.", 6.2));
add(tableForge());
add(H2("5.3 Volve: blind pore-pressure prediction"));
add(P(`Table 4 and Figures 7–9 give the blind results. With the shallow normal trend and an offset-fitted Eaton exponent, ${NH} reproduced the 21 blind tests with an RMSE of ${f3(V.metrics.N_hat.rmse_sg)} sg (95% CI ${f3(B.N_hat.ci95[0])}–${f3(B.N_hat.ci95[1])}). The classic d-exponent scored ${f3(V.metrics.d_surface_rpm.rmse_sg)} sg, d with bit speed ${f3(V.metrics.d.rmse_sg)} sg and the service company's own Dxc channel ${f3(V.metrics.Dxc_vendor.rmse_sg)} sg. All three were worse than repeating the offset-well mean (${f3(V.metrics.offset_mean.rmse_sg)} sg). The paired bootstrap places ${NH} ahead of these three and of the offset mean with more than 95% confidence. Against Dxc computed with the measured downhole ECD (${f3(V.metrics.Dxc.rmse_sg)} sg), the 95% interval of the difference (${f3(B.Dxc.nhat_minus_this_ci95[0])} to +${f3(B.Dxc.nhat_minus_this_ci95[1])} sg) includes zero. All exponent predictors were biased low, by 0.01–0.03 sg, in both blind wells (Figure 7).`));
add(...FIG(fig("fig07_volve_blind_profiles.png"), `**Figure 7.** Blind predictions against measured formation pressure in 15/9-F-1 B and F-1 C. Bars: ${NH} P10–P90 range. Dotted: sea-water gradient.`, 6.2));
add(...FIG(fig("fig08_volve_crossplot.png"), "**Figure 8.** Predicted against measured pore-pressure gradient for the blind tests. Shaded: ±0.02 sg.", 3.6));
add(P(`The size of these errors should be read with care. The fitted Eaton exponents were small, between ${f2(V.metrics.N_hat.eaton_n)} and ${f2(V.metrics.d_surface_rpm.eaton_n)}, because at reservoir depth all exponents sat far below their shallow trends (ratios of 0.4–0.6). With the textbook exponent of 1.2, the same ratios imply pore pressures close to the overburden and errors of ${f2(V.metrics.d_surface_rpm.rmse_sg_eaton_1p2)}–${f2(V.metrics.N_hat.rmse_sg_eaton_1p2)} sg (Figure 9, right). The small exponent compresses the predictions toward the offset calibration, so part of the skill comes from the offset wells rather than from the exponent. The P10–P90 ranges were also too narrow. They contained the measured value for only ${Math.round(100 * V.metrics.N_hat.p10_p90_coverage)}% of tests with ${NH} and ${Math.round(100 * V.metrics.Dxc.p10_p90_coverage)}% with Dxc, against the nominal 80%.`));
add(...FIG(fig("fig09_volve_skill.png"), "**Figure 9.** Left: blind RMSE with 95% bootstrap intervals. Right: blind RMSE with the offset-fitted Eaton exponent and with the textbook value of 1.2 (log scale).", 6.2));
add(P(`Figure 10 repeats the test with other normal intervals. Shortening the interval to 350–700 m degrades most exponents, because the trend slope is then poorly constrained. Extending it to 1,350 m changes little, except for the service company's Dxc, which is missing over much of that interval. Extending it to 2,300 m TVD, deep into the 17½-in section drilled with 1.40 sg mud, ruins Dxc, the service company's Dxc and ${NH} (RMSE 0.13–0.14 sg). Across the mud-weight step the ratio correction of Eq. (2) lowers these exponents by a factor of 1.03/1.40, so the trend bends where the pressure did not change. The d-exponent without mud-weight correction is less sensitive to this choice, but it is less accurate overall.`));
add(...FIG(fig("fig10_volve_sensitivity.png"), "**Figure 10.** Blind RMSE as a function of the TVD interval used for the normal trend. Dashed: offset-well mean.", 6.2));
add(tableVolve());
add(H2("5.4 Which corrections matter"));
add(tableAblation());
add(P(`Table 5 and Figure 11 switch off one correction at a time. At Volve, replacing the measured downhole ECD by the surface mud weight raised the blind RMSE from ${f4(V.ablation["full N-hat"].blind_rmse_sg)} to ${f4(V.ablation["mud weight instead of downhole ECD"].blind_rmse_sg)} sg. Removing the measured stick-slip term raised it to ${f4(V.ablation["no vibration term"].blind_rmse_sg)} sg. These were the two corrections that clearly paid off. Fixing α at 1 or using surface speed changed the RMSE by about 0.002 sg, well inside the bootstrap interval. At Volve the logging unit already reported bit speed, and the motor share was small. At FORGE the wear term was the most useful: without it, false alarms in granite rose from ${f1(F.ablation["full N-hat"].granite_false_alarm_pct)}% to ${f1(F.ablation["no wear term"].granite_false_alarm_pct)}%. The surface-torque vibration proxy, by contrast, made the jumps and drift slightly worse, and the hydraulics term raised false alarms. Removing bit speed gave few alarms but a drift five times larger, the same artefact as the classic d-exponent.`));
add(...FIG(fig("fig11_ablation.png"), "**Figure 11.** Ablation: Volve blind RMSE and FORGE granite false-alarm rate and within-run drift with each correction removed. Dashed: full N̂.", 6.2));

// 6 Discussion
add(H1("6 Discussion"));
add(H2("6.1 What the corrections buy"));
add(P(`The two wells point to a consistent rule: a correction helps when it is based on a downhole measurement and tends to hurt when it rests on a surface proxy. Bit speed matters whenever a motor is in the string. At FORGE, ignoring the motor made the d-exponent unusable. Measured downhole ECD and measured stick-slip carried most of ${NH}'s gain at Volve, whereas a torque-based vibration index added noise at FORGE. Run-wise wear correction is cheap and, in hard rock, effective. The fitted speed exponent is informative where speed varies independently of other parameters, as at Volve (α ≈ 0.5). It is not identifiable where speed is tied to flow through the motor, and it should then be fixed rather than fitted.`));
add(H2("6.2 Where drilling exponents fail anyway"));
add(P(`None of the corrections addresses the main source of error in these wells: shifts of the exponent at hole-size and mud-weight changes. At Volve the exponents measured at reservoir depth were 40–60% below the trend extrapolated from the shallow section, although the true overpressure was only 0.1–0.14 sg. A textbook Eaton exponent turns that into a gross overestimate. An offset-fitted exponent of about 0.12 absorbs the shift, but only because it has been tuned to the very wells being predicted. In practice this means that drilling-exponent pore pressure should be calibrated on offset tests in the same hole section, and that a normal trend should not be carried across a large mud-weight step with the ratio correction of Eq. (2). The FORGE sediments show the lithological version of the same problem. Drilling data alone cannot separate a sand-rich interval from an undercompacted shale, so a gamma-ray or cuttings-based lithology filter is a prerequisite rather than a refinement.`));
add(H2("6.3 Relation to proprietary normalized exponents"));
add(P(`The published description of the proprietary Nx and Nxb mentions non-linear speed response, tooth efficiency and optional hydraulic normalisation, with Nxb as a baseline that separates pressure trends from lithology [10]. ${NH} addresses the same effects with explicit, fitted terms. It is not a reconstruction of Nx, whose formula is not public, and no numerical comparison with Nx is possible. A distinct name was chosen to avoid confusion.`));
add(H2("6.4 Limitations"));
add(P("The evidence comes from two wells. FORGE has no overpressure, and the Volve tests span a narrow range of pressure in one reservoir, so the RMSE values say more about calibration than about detecting a transition. The tests are spatially clustered, which makes the bootstrap intervals optimistic. The pressure is compared in the sand and predicted in the seal, which assumes pressure continuity between the two. The mud-line density of the overburden fit sits at its upper bound. Some FORGE motor ratings were inferred from motor size rather than stated. Gas data, which are often the first sign of a pressure transition, were not used."));
add(H2("6.5 Further work"));
add(P("Three extensions follow directly from the results. The first is a differential-pressure term in the spirit of Bourgoyne and Young [8], fitted across hole sections, to replace the ratio correction of Eq. (2). The second is trends fitted per hole section with offset tests used as Bayesian priors. The third is more public wells with measured pressures across a real transition zone. The code is written so that new wells need only a loader."));

// 7 Conclusions
add(H1("7 Conclusions"));
add(bullet(`${NH}, a normalized drilling exponent with explicit, data-fitted corrections for bit speed, hydraulics, vibration and bit wear, is defined and released as open code with processed data.`));
add(bullet("In a motor-drilled granite well, the d-exponent computed from surface speed jumped 0.54 log units at bit changes; using bit speed reduced this to 0.33, and a run-wise wear term reduced false alarms from 49% to 31%."));
add(bullet(`In 21 blind formation-pressure tests at Volve, ${NH} (${f3(V.metrics.N_hat.rmse_sg)} sg) beat the classic d-exponent, the service company's Dxc and an offset-mean predictor, but was statistically equal to an ECD-corrected Dxc. Measured downhole ECD and stick-slip carried most of the improvement.`));
add(bullet("Corrections based on downhole measurements helped; corrections based on surface proxies did not."));
add(bullet("Hole-size and mud-weight changes dominate drilling exponents in these wells. The textbook Eaton exponent produced errors of 0.4–0.6 sg, and an offset-fitted exponent of about 0.12 was needed. Drilling-exponent pore pressure should be calibrated on offset tests within the same hole section."));

// back matter
add(tableNomen());
add(H1("Data availability statement"));
add(P("The Utah FORGE 16A(78)-32 data are openly available in the Geothermal Data Repository at https://doi.org/10.15121/1776602 under CC BY 4.0 [16]. The processed one-foot table, bit runs and motor ratings used here are in the code repository. The Volve data are available from Equinor ASA under the Equinor Open Data Licence after registration [17]; they are not redistributed. The summary results, per-test comparisons and the scripts that produce them are included."));
add(H1("Code availability"));
add(new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, children: [
  ...runs("All code is released under the MIT licence at "), C.link(GH, GH),
  ...runs(` (commit ${COMMIT}). Table 6 maps the equations to functions, and Supplementary Section S4 lists the core module in full.`)] }));
add(TABLE("**Table 6.** Where each part of the method is implemented.", ["Item", "File and function"], [
  ["Eqs. (1)–(2)", "nhat/core.py · d_exponent, dxc"], ["Eqs. (3)–(5)", "nhat/core.py · bit_rpm, bit_hydraulics"],
  ["Eqs. (6)–(7)", "nhat/core.py · run_revolutions, vibration_indices"], ["Eqs. (8)–(10)", "nhat/core.py · NHat.fit, NHat.transform"],
  ["Eqs. (11)–(12), alarms", "nhat/core.py · NHat.baseline, NHat.eaton, NHat.alarms"], ["Eq. (13)", "scripts/volve_case.py · fit_overburden"],
  ["FORGE study, Table 3", "scripts/forge_case.py"], ["Volve study, Tables 4–5", "scripts/volve_case.py, scripts/volve_bootstrap.py"],
  ["Figures 1–11", "scripts/make_figures.py"]], [2600, 6400], null, true));
add(H1("Acknowledgements"));
add(P("The author thanks Equinor and the former Volve licence partners for releasing the Volve data, and the Utah FORGE project, funded by the U.S. Department of Energy, for publishing the 16A(78)-32 drilling data."));
add(H1("Conflict of interest"));
add(P("The author declares no conflict of interest."));
add(H1("ORCID"));
add(P("Rajab Ali: [to be added]"));

// references
add(H1("References"));
const REFS = [
  "Hottmann CE, Johnson RK. Estimation of formation pressures from log-derived shale properties. J Pet Technol. 1965;17(6):717–722. doi:10.2118/1110-PA",
  "Mouchet JP, Mitchell A. Abnormal Pressures While Drilling: Origins, Prediction, Detection, Evaluation. Manuels Techniques Elf Aquitaine 2. Boussens: Elf Aquitaine; 1989.",
  "Eaton BA. The equation for geopressure prediction from well logs. Paper SPE-5544-MS presented at: SPE Annual Fall Meeting; September 28–October 1, 1975; Dallas, TX. doi:10.2118/5544-MS",
  "Zhang J. Pore pressure prediction from well logs: methods, modifications, and new approaches. Earth-Sci Rev. 2011;108(1–2):50–63. doi:10.1016/j.earscirev.2011.06.001",
  "Swarbrick RE, Osborne MJ. Mechanisms that generate abnormal pressures: an overview. In: Law BE, Ulmishek GF, Slavin VI, eds. Abnormal Pressures in Hydrocarbon Environments. AAPG Memoir 70. Tulsa: AAPG; 1998:13–34.",
  "Jorden JR, Shirley OJ. Application of drilling performance data to overpressure detection. J Pet Technol. 1966;18(11):1387–1394. doi:10.2118/1407-PA",
  "Rehm B, McClendon R. Measurement of formation pressure from drilling data. Paper SPE-3601-MS presented at: SPE Annual Fall Meeting; October 3–6, 1971; New Orleans, LA. doi:10.2118/3601-MS",
  "Bourgoyne AT, Young FS. A multiple regression approach to optimal drilling and abnormal pressure detection. SPE J. 1974;14(4):371–384. doi:10.2118/4238-PA",
  "Whittaker A. Mud Logging Handbook. Englewood Cliffs, NJ: Prentice Hall; 1991.",
  "Exploration Logging Inc. Theory and Evaluation of Formation Pressures: The Pressure Log Reference Manual. Sacramento, CA: EXLOG; 1981.",
  "Arifeen M, Petrovski A, Hasan MJ, Kotenko I, Sletov M, Hassard P. DataDRILL: formation pressure prediction and kick detection for drilling rigs. arXiv:2409.19724; 2024. Data: doi:10.5281/zenodo.12759014",
  "Bourgoyne AT, Millheim KK, Chenevert ME, Young FS. Applied Drilling Engineering. SPE Textbook Series Vol. 2. Richardson, TX: Society of Petroleum Engineers; 1986.",
  "Huber PJ. Robust estimation of a location parameter. Ann Math Stat. 1964;35(1):73–101. doi:10.1214/aoms/1177703732",
  "Pedregosa F, Varoquaux G, Gramfort A, et al. Scikit-learn: machine learning in Python. J Mach Learn Res. 2011;12:2825–2830.",
  "Koenker R, Bassett G. Regression quantiles. Econometrica. 1978;46(1):33–50. doi:10.2307/1913643",
  "McLennan J, Nash G, Moore J, Skowron G, Woolsey S. Utah FORGE: Well 16A(78)-32 drilling data [dataset]. Geothermal Data Repository, Energy and Geoscience Institute at the University of Utah; 2021. doi:10.15121/1776602",
  "Equinor ASA. Volve field data village [dataset]. Equinor Open Data Licence; 2018. https://www.equinor.com/energy/volve-data-sharing",
  "Efron B, Tibshirani RJ. An Introduction to the Bootstrap. New York: Chapman & Hall; 1993.",
];
REFS.forEach((ref, i) => add(new Paragraph({ spacing: { after: 80, line: 264 }, indent: { left: 440, hanging: 440 },
  children: [new TextRun({ text: `${i + 1}.\t`, size: 20 }), ...runs(ref, { size: 20 })] })));

// figure 1 placed after the introduction
const doc = new Document({
  creator: "Rajab Ali", title: "An open normalized drilling exponent for pore-pressure estimation",
  description: "Manuscript for Energy Science & Engineering",
  styles: STYLES, numbering: NUMBERING,
  sections: [{
    properties: { ...PAGE, lineNumbers: { countBy: 1, restart: LineNumberRestartFormat.CONTINUOUS } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "ALI — Open normalized drilling exponent", size: 16, color: "52514E" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("written", OUT, buf.length); });
