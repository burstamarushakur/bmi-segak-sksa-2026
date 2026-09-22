import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { getBmiStatusByAgeGender } from './calculations';
import type { BssrHistory, BssrRecord } from './bssrPdf';

const TEMPLATE_URL = `${import.meta.env.BASE_URL || '/'}templates/borang-bmi-5-9t.pdf`;
const ink = rgb(0.03, 0.03, 0.03);

const clean = (value: unknown) => String(value ?? '').trim();
const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const safeFilename = (name: string) =>
  clean(name).replace(/[^a-zA-Z0-9\- _]/g, '').replace(/\s+/g, '_').slice(0, 100) || 'MURID';

const drawTopText = (
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  font: PDFFont,
  size = 7,
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
  size = 7,
  minSize = 4,
) => {
  const value = clean(text);
  if (!value) return;
  const width = box.x1 - box.x0;
  const height = box.bottom - box.top;
  let useSize = size;
  while (useSize > minSize && font.widthOfTextAtSize(value, useSize) > width - 5) useSize -= 0.25;
  const textWidth = font.widthOfTextAtSize(value, useSize);
  const x = box.x0 + Math.max(2, (width - textWidth) / 2);
  const y = page.getHeight() - box.bottom + Math.max(1.5, (height - useSize) / 2 + 0.5);
  page.drawText(value, { x, y, size: useSize, font, color: ink });
};

const recordForAge = (history: BssrHistory, age: number, pengisian: number) =>
  history.records.find((r) => {
    const recordAge = Number(r.umur || ((r.yearLevel || 0) + 6));
    return recordAge === age && Number(r.pengisian) === pengisian;
  });

const formatHeightMetres = (value: unknown) => {
  const cm = asNumber(value);
  if (!Number.isFinite(cm)) return '';
  return (cm / 100).toFixed(2);
};

const formatNumber = (value: unknown) => {
  const n = asNumber(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
};

const genderCode = (gender: string) => {
  const g = clean(gender).toUpperCase();
  if (g.startsWith('L') || g === 'M') return 'L';
  if (g.startsWith('P') || g === 'F') return 'P';
  return '';
};

const drawIdentity = (page: PDFPage, font: PDFFont, history: BssrHistory) => {
  drawTopText(page, history.namaMurid, 130, 171.5, font, 7, 225, 4.5);
  drawTopText(page, history.mykid || '', 130, 198.0, font, 7, 210, 4.5);
  drawTopText(page, history.noTelPenjaga || '', 130, 224.2, font, 7, 210, 4.5);

  const g = genderCode(history.jantina || '');
  if (g) {
    const x = g === 'L' ? 133.5 : 146.2;
    page.drawEllipse({
      x,
      y: page.getHeight() - 190.1,
      xScale: 6.2,
      yScale: 6.2,
      borderColor: ink,
      borderWidth: 0.75,
    });
  }
};

type AgeBlock = {
  school: { top: number; bottom: number };
  classRow: { top: number; bottom: number };
  test1: { top: number; bottom: number; laksanaTop: number; laksanaBottom: number };
  test2: { top: number; bottom: number; laksanaTop: number; laksanaBottom: number };
};

const AGE_BLOCKS: Record<number, AgeBlock> = {
  7: {
    school: { top: 88.53, bottom: 110.95 },
    classRow: { top: 110.95, bottom: 129.41 },
    test1: { top: 147.87, bottom: 174.26, laksanaTop: 156.2, laksanaBottom: 165.91 },
    test2: { top: 174.26, bottom: 201.31, laksanaTop: 182.6, laksanaBottom: 192.3 },
  },
  8: {
    school: { top: 236.93, bottom: 259.35 },
    classRow: { top: 259.35, bottom: 277.81 },
    test1: { top: 296.27, bottom: 322.66, laksanaTop: 304.6, laksanaBottom: 314.31 },
    test2: { top: 322.66, bottom: 349.7, laksanaTop: 330.89, laksanaBottom: 340.6 },
  },
  9: {
    school: { top: 382.68, bottom: 405.11 },
    classRow: { top: 405.11, bottom: 423.56 },
    test1: { top: 442.02, bottom: 468.41, laksanaTop: 450.3, laksanaBottom: 460.01 },
    test2: { top: 468.41, bottom: 495.45, laksanaTop: 476.7, laksanaBottom: 486.4 },
  },
};

const drawLaksanaCircle = (page: PDFPage, top: number, bottom: number) => {
  const centerTop = (top + bottom) / 2;
  page.drawEllipse({
    x: 395.9,
    y: page.getHeight() - centerTop,
    xScale: 18.5,
    yScale: 6.7,
    borderColor: ink,
    borderWidth: 0.8,
  });
};

const drawTest = (
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  history: BssrHistory,
  record: BssrRecord | undefined,
  block: AgeBlock['test1'],
) => {
  if (!record) return;
  const height = formatHeightMetres(record.tinggi);
  const weight = formatNumber(record.berat);
  const bmi = asNumber(record.bmi);
  const age = Number(record.umur || ((record.yearLevel || 0) + 6));
  const status = Number.isFinite(bmi)
    ? getBmiStatusByAgeGender(age, history.jantina || '', bmi)
    : clean(record.statusBmi);
  const complete = !!height && !!weight;
  const mid = block.top + (block.bottom - block.top) / 2;

  drawCenteredBox(page, weight, { x0: 165, x1: 238, top: block.top, bottom: mid }, bold, 7);
  drawCenteredBox(page, height, { x0: 165, x1: 238, top: mid, bottom: block.bottom }, bold, 7);
  const bmiText = Number.isFinite(bmi)
    ? `${formatNumber(bmi)} - ${status && status !== 'Tiada Data' ? status : ''}`.trim().replace(/ - $/, '')
    : (status && status !== 'Tiada Data' ? status : '');
  drawCenteredBox(page, bmiText, { x0: 242, x1: 371.5, top: block.top, bottom: block.bottom }, font, 5.8, 3.7);
  if (complete) drawLaksanaCircle(page, block.laksanaTop, block.laksanaBottom);
};

const drawAges7to9 = (page: PDFPage, font: PDFFont, bold: PDFFont, history: BssrHistory) => {
  for (const age of [7, 8, 9]) {
    const block = AGE_BLOCKS[age];
    const p1 = recordForAge(history, age, 1);
    const p2 = recordForAge(history, age, 2);
    const any = p1 || p2;
    if (!any) continue;

    drawTopText(page, history.schoolName || 'SEKOLAH KEBANGSAAN SUNGAI ABONG', 100, block.school.top + 6, font, 6.5, 360, 4.25);
    drawTopText(page, clean(p1?.className || p2?.className), 70, block.classRow.top + 5, bold, 7, 220, 4.5);
    drawTest(page, font, bold, history, p1, block.test1);
    drawTest(page, font, bold, history, p2, block.test2);
  }
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
  drawIdentity(p1, font, history);
  drawAges7to9(p2, font, bold, history);
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

const loadTemplate = async () => {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('Template Borang BMI 5-9T KPM tidak dapat dimuatkan.');
  return PDFDocument.load(await res.arrayBuffer());
};

export const downloadStudentBmi59Pdf = async (history: BssrHistory, sessionYear: number) => {
  const template = await loadTemplate();
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  await appendStudent(output, template, font, bold, history);
  const bytes = await output.save();
  downloadBytes(bytes, `BMI_5-9T_${sessionYear}_${safeFilename(history.namaMurid)}.pdf`);
};

export const downloadClassBmi59Pdf = async (histories: BssrHistory[], sessionYear: number, className: string) => {
  const template = await loadTemplate();
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  for (const history of histories) await appendStudent(output, template, font, bold, history);
  const bytes = await output.save();
  downloadBytes(bytes, `BMI_5-9T_${sessionYear}_${safeFilename(className)}.pdf`);
};
