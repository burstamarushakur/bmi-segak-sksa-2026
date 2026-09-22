import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { getBmiStatusByAgeGender, getOverallSegakResult, getSegakScore } from './calculations';

export type BssrRecord = {
  sessionYear?: number;
  className?: string;
  yearLevel?: number;
  pengisian?: number;
  umur?: number;
  tinggi?: string | number;
  berat?: string | number;
  bmi?: string | number;
  statusBmi?: string;
  naikTurunBangku?: string | number;
  tekanTubi?: string | number;
  ringkukTubiSepara?: string | number;
  jangkauanMelunjur?: string | number;
  jumlahSkor?: string | number;
  gred?: string;
  statusKecergasan?: string;
  tarikhUjian?: string;
};

export type BssrHistory = {
  schoolName?: string;
  namaMurid: string;
  mykid?: string;
  jantina?: string;
  noTelPenjaga?: string;
  records: BssrRecord[];
};

const TEMPLATE_URL = `${import.meta.env.BASE_URL || '/'}templates/borang-segak-bssr.pdf`;
const ink = rgb(0.04, 0.04, 0.04);

const clean = (value: unknown) => String(value ?? '').trim();
const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const drawTopText = (
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  font: PDFFont,
  size = 8,
  maxWidth?: number,
  minSize = 4.5,
) => {
  const value = clean(text);
  if (!value) return;
  let useSize = size;
  if (maxWidth) {
    while (useSize > minSize && font.widthOfTextAtSize(value, useSize) > maxWidth) useSize -= 0.25;
  }
  page.drawText(value, { x, y: page.getHeight() - top - useSize, size: useSize, font, color: ink });
};

const drawCenteredBox = (
  page: PDFPage,
  text: string,
  box: { x0: number; x1: number; top: number; bottom: number },
  font: PDFFont,
  size = 7.5,
  minSize = 4.2,
) => {
  const value = clean(text);
  if (!value) return;
  const width = box.x1 - box.x0;
  const height = box.bottom - box.top;
  let useSize = size;
  while (useSize > minSize && font.widthOfTextAtSize(value, useSize) > width - 4) useSize -= 0.25;
  const textWidth = font.widthOfTextAtSize(value, useSize);
  const x = box.x0 + Math.max(2, (width - textWidth) / 2);
  const y = page.getHeight() - box.bottom + Math.max(1.5, (height - useSize) / 2 + 0.8);
  page.drawText(value, { x, y, size: useSize, font, color: ink });
};

const formatGender = (gender: string) => {
  const g = clean(gender).toUpperCase();
  if (g.startsWith('L') || g === 'M') return 'L';
  if (g.startsWith('P') || g === 'F') return 'P';
  return '';
};

const formatDate = (value: string | undefined) => {
  const text = clean(value);
  if (!text) return '';
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return text;
};

const recordFor = (history: BssrHistory, yearLevel: number, pengisian: number) =>
  history.records.find(r => Number(r.yearLevel) === yearLevel && Number(r.pengisian) === pengisian);

const page1 = (page: PDFPage, font: PDFFont, bold: PDFFont, history: BssrHistory) => {
  drawTopText(page, history.schoolName || 'SEKOLAH KEBANGSAAN SUNGAI ABONG', 164, 100, font, 7, 140, 4.5);
  drawTopText(page, history.namaMurid, 164, 119, font, 7, 140, 4.25);
  drawTopText(page, history.mykid || '', 164, 158, font, 7, 140, 4.5);
  drawTopText(page, history.noTelPenjaga || '', 164, 178, font, 7, 140, 4.5);

  const gender = formatGender(history.jantina || '');
  if (gender === 'L') {
    page.drawEllipse({ x: 186, y: page.getHeight() - 144.5, xScale: 7, yScale: 7, borderColor: ink, borderWidth: 0.8 });
  } else if (gender === 'P') {
    page.drawEllipse({ x: 204, y: page.getHeight() - 144.5, xScale: 7, yScale: 7, borderColor: ink, borderWidth: 0.8 });
  }

  const rowBoxes: Record<number, { top: number; bottom: number }> = {
    4: { top: 291.6, bottom: 319.56 },
    5: { top: 319.56, bottom: 351.12 },
    6: { top: 351.12, bottom: 382.08 },
  };
  const cols = {
    className: { x0: 99.84, x1: 141.72 },
    berat1: { x0: 142.68, x1: 184.44 },
    berat2: { x0: 185.4, x1: 227.16 },
    tinggi1: { x0: 228.12, x1: 269.88 },
    tinggi2: { x0: 270.84, x1: 312.72 },
    bmi1: { x0: 313.68, x1: 355.44 },
    bmi2: { x0: 356.4, x1: 397.56 },
  };

  [4, 5, 6].forEach((yr) => {
    const row = rowBoxes[yr];
    const p1 = recordFor(history, yr, 1);
    const p2 = recordFor(history, yr, 2);
    const className = p1?.className || p2?.className || '';
    drawCenteredBox(page, className, { ...cols.className, ...row }, font, 7);
    drawCenteredBox(page, clean(p1?.berat), { ...cols.berat1, ...row }, font, 7);
    drawCenteredBox(page, clean(p2?.berat), { ...cols.berat2, ...row }, font, 7);
    drawCenteredBox(page, clean(p1?.tinggi), { ...cols.tinggi1, ...row }, font, 7);
    drawCenteredBox(page, clean(p2?.tinggi), { ...cols.tinggi2, ...row }, font, 7);
    drawCenteredBox(page, clean(p1?.bmi), { ...cols.bmi1, ...row }, bold, 7);
    drawCenteredBox(page, clean(p2?.bmi), { ...cols.bmi2, ...row }, bold, 7);
  });
};

const page2 = (page: PDFPage, font: PDFFont, bold: PDFFont, history: BssrHistory) => {
  const slots = [
    { yearLevel: 4, pengisian: 1, x0: 157.56, mid: 215.64, x1: 265.56 },
    { yearLevel: 4, pengisian: 2, x0: 265.56, mid: 323.64, x1: 373.56 },
    { yearLevel: 5, pengisian: 1, x0: 373.56, mid: 431.64, x1: 481.56 },
    { yearLevel: 5, pengisian: 2, x0: 481.56, mid: 539.64, x1: 589.56 },
    { yearLevel: 6, pengisian: 1, x0: 589.56, mid: 647.64, x1: 697.56 },
    { yearLevel: 6, pengisian: 2, x0: 697.56, mid: 755.64, x1: 804.96 },
  ];
  const rows = {
    step: { top: 175.2, bottom: 216.0 },
    push: { top: 216.0, bottom: 256.44 },
    curl: { top: 256.44, bottom: 293.64 },
    reach: { top: 293.64, bottom: 330.96 },
    total: { top: 330.96, bottom: 353.64 },
    grade: { top: 353.64, bottom: 381.0 },
    bmiStatus: { top: 381.0, bottom: 402.84 },
    date: { top: 402.84, bottom: 423.72 },
  };

  slots.forEach((slot) => {
    const rec = recordFor(history, slot.yearLevel, slot.pengisian);
    if (!rec) return;
    const age = Number(rec.umur || slot.yearLevel + 6);
    const gender = history.jantina || '';

    const tests: Array<[keyof BssrRecord, string, { top: number; bottom: number }]> = [
      ['naikTurunBangku', 'naikTurunBangku', rows.step],
      ['tekanTubi', 'tekanTubi', rows.push],
      ['ringkukTubiSepara', 'ringkukTubiSepara', rows.curl],
      ['jangkauanMelunjur', 'jangkauanMelunjur', rows.reach],
    ];

    let totalScore = 0;
    let completedTests = 0;
    tests.forEach(([field, testName, row]) => {
      const raw = clean(rec[field]);
      drawCenteredBox(page, raw, { x0: slot.x0, x1: slot.mid, ...row }, font, 7);
      const n = asNumber(rec[field]);
      const score = Number.isFinite(n) ? getSegakScore(age, gender, testName, n) : 0;
      if (raw && score) {
        totalScore += score;
        completedTests += 1;
      }
      drawCenteredBox(page, score ? String(score) : '', { x0: slot.mid, x1: slot.x1, ...row }, bold, 7);
    });

    const computedOverall = completedTests === 4 ? getOverallSegakResult(totalScore) : { gred: '', status: '' };
    drawCenteredBox(page, completedTests === 4 ? String(totalScore) : clean(rec.jumlahSkor), { x0: slot.x0, x1: slot.x1, ...rows.total }, bold, 7.5);
    drawCenteredBox(page, computedOverall.gred || clean(rec.gred), { x0: slot.x0, x1: slot.x1, ...rows.grade }, bold, 7.5);
    const bmiValue = asNumber(rec.bmi);
    const computedBmiStatus = Number.isFinite(bmiValue) ? getBmiStatusByAgeGender(age, gender, bmiValue) : '';
    drawCenteredBox(page, computedBmiStatus && computedBmiStatus !== 'Tiada Data' ? computedBmiStatus : clean(rec.statusBmi), { x0: slot.x0, x1: slot.x1, ...rows.bmiStatus }, font, 6, 3.8);
    drawCenteredBox(page, formatDate(rec.tarikhUjian), { x0: slot.x0, x1: slot.x1, ...rows.date }, font, 6.5);
  });
};

const appendStudent = async (
  output: PDFDocument,
  template: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  history: BssrHistory,
) => {
  const [p1, p2] = await output.copyPages(template, [0, 1]);
  output.addPage(p1);
  output.addPage(p2);
  page1(p1, font, bold, history);
  page2(p2, font, bold, history);
};

const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeFilename = (name: string) =>
  clean(name).replace(/[^a-zA-Z0-9\- _]/g, '').replace(/\s+/g, '_').slice(0, 100) || 'MURID';

const loadTemplate = async () => {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('Template Borang BSSR KPM tidak dapat dimuatkan.');
  return PDFDocument.load(await res.arrayBuffer());
};

export const downloadStudentBssrPdf = async (history: BssrHistory, sessionYear: number) => {
  const template = await loadTemplate();
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  await appendStudent(output, template, font, bold, history);
  const bytes = await output.save();
  downloadBytes(bytes, `BSSR_${sessionYear}_${safeFilename(history.namaMurid)}.pdf`);
};

export const downloadClassBssrPdf = async (histories: BssrHistory[], sessionYear: number, className: string) => {
  const template = await loadTemplate();
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  for (const history of histories) {
    await appendStudent(output, template, font, bold, history);
  }
  const bytes = await output.save();
  downloadBytes(bytes, `BSSR_${sessionYear}_${safeFilename(className)}.pdf`);
};
