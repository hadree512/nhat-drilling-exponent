// Shared helpers for the manuscript and the supplementary file.
const fs = require("fs");
const path = require("path");
const d = require("docx");
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, Math: OMath, MathRun, MathFraction,
  MathSubScript, MathSuperScript, MathSubSuperScript, MathRoundBrackets, MathFunction,
  MathFunctionName, MathSum, TabStopType, ExternalHyperlink, PageBreak, LevelFormat,
} = d;

const FONT = "Times New Roman";
const PAGE_W = 11906, MARGIN = 1440, TEXT_W = PAGE_W - 2 * MARGIN; // A4, 1 in margins

// --------------------------------------------------------------- text
// t("plain *italic* ^sup^ ~sub~ **bold**") -> runs
function runs(s, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\^[^^]+\^|~[^~]+~)/g;
  let last = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: s.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    else if (tok.startsWith("*")) out.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    else if (tok.startsWith("^")) out.push(new TextRun({ text: tok.slice(1, -1), superScript: true, ...base }));
    else out.push(new TextRun({ text: tok.slice(1, -1), subScript: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(new TextRun({ text: s.slice(last), ...base }));
  return out;
}
const P = (s, opt = {}) => new Paragraph({
  children: runs(s), spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, ...opt });
const H1 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s)],
  spacing: { before: 280, after: 120 } });
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(s)],
  spacing: { before: 200, after: 100 } });
const H3 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(s)],
  spacing: { before: 160, after: 80 } });
const bullet = (s, level = 0) => new Paragraph({ children: runs(s), numbering: { reference: "bullets", level },
  spacing: { after: 60, line: 288 } });
const numbered = (s) => new Paragraph({ children: runs(s), numbering: { reference: "numbers", level: 0 },
  spacing: { after: 60, line: 288 } });
const link = (text, url) => new ExternalHyperlink({ link: url,
  children: [new TextRun({ text, style: "Hyperlink" })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// --------------------------------------------------------------- math
const r = (s) => new MathRun(s);
const sub = (b, s) => new MathSubScript({ children: [r(b)], subScript: [r(s)] });
const sup = (bChildren, s) => new MathSuperScript({ children: bChildren, superScript: Array.isArray(s) ? s : [r(s)] });
const frac = (num, den) => new MathFraction({ numerator: num, denominator: den });
const br = (children) => new MathRoundBrackets({ children });
const fn = (name, children) => new MathFunction({ name: [r(name)], children });
// numbered display equation: math centred, number right-aligned
function EQ(mathChildren, num) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.CENTER, position: TEXT_W / 2 }, { type: TabStopType.RIGHT, position: TEXT_W }],
    spacing: { before: 100, after: 140 },
    children: [new TextRun("\t"), new OMath({ children: mathChildren }), new TextRun(`\t(${num})`)],
  });
}

// --------------------------------------------------------------- figures
function FIG(file, caption, widthIn = 6.2) {
  const buf = fs.readFileSync(file);
  // read PNG size from IHDR
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wpx = widthIn * 96, hpx = Math.round(wpx * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: wpx, height: hpx },
        altText: { title: path.basename(file), description: caption.replace(/\*/g, ""), name: path.basename(file) } })] }),
    new Paragraph({ children: runs(caption, { size: 19 }), spacing: { after: 200, line: 264 },
      alignment: AlignmentType.JUSTIFIED }),
  ];
}

// --------------------------------------------------------------- tables
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function TABLE(caption, header, rows, colW, note, leftAll = false) {
  const total = colW.reduce((a, b) => a + b, 0);
  const cell = (txt, i, isHead, isLast) => new TableCell({
    width: { size: colW[i], type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    borders: { top: isHead ? border : none, bottom: (isHead || isLast) ? border : none, left: none, right: none },
    children: [new Paragraph({ alignment: (i === 0 || leftAll) ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: runs(String(txt), { size: 18, bold: isHead }) })],
  });
  const t = new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: colW,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true, false)) }),
      ...rows.map((row, k) => new TableRow({ children: row.map((v, i) => cell(v, i, false, k === rows.length - 1)) }))],
  });
  const out = [new Paragraph({ children: runs(caption, { size: 19 }), spacing: { before: 200, after: 80 }, keepNext: true }), t];
  if (note) out.push(new Paragraph({ children: runs(note, { size: 17 }), spacing: { before: 60, after: 200 } }));
  else out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return out;
}

// --------------------------------------------------------------- code
function CODE(lines, caption) {
  const out = [];
  if (caption) out.push(new Paragraph({ children: runs(caption, { size: 19 }), spacing: { before: 160, after: 60 }, keepNext: true }));
  lines.split("\n").forEach((ln, i, arr) => out.push(new Paragraph({
    spacing: { after: 0, line: 240 }, keepLines: true, keepNext: i < arr.length - 1,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F4F4F2" },
    children: [new TextRun({ text: ln.length ? ln : " ", font: "Consolas", size: 16 })] })));
  out.push(new Paragraph({ spacing: { after: 140 }, children: [] }));
  return out;
}

const STYLES = {
  default: { document: { run: { font: FONT, size: 22 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 26, bold: true, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 23, bold: true, font: FONT }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 22, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
  ],
};
const NUMBERING = { config: [
  { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
  { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
] };
const PAGE = { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } };

module.exports = { d, runs, P, H1, H2, H3, bullet, numbered, link, pageBreak, r, sub, sup, frac, br, fn, EQ, FIG, TABLE, CODE,
  STYLES, NUMBERING, PAGE, TEXT_W, FONT, MathSum, MathSubSuperScript };
