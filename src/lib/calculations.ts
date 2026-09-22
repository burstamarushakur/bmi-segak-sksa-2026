export const getYearFromClassName = (className: string) => {
  const match = String(className || '').match(/^(\d+)/);
  const year = match ? parseInt(match[1], 10) : NaN;
  return isNaN(year) ? 1 : year;
};

export const getAgeFromClassName = (className: string) => getYearFromClassName(className) + 6;

export const calculateBmi = (tinggiCm: number, beratKg: number) => {
  if (!tinggiCm || !beratKg) return 0;
  const tinggiM = tinggiCm / 100;
  const bmi = beratKg / (tinggiM * tinggiM);
  return parseFloat(bmi.toFixed(1));
};

type BmiThreshold = { underweightMax: number; normalMax: number; overweightMax: number };

// Jadual 1 & 2 Panduan SEGAK BPK KPM 2016, ms. 7 (umur 9-17).
// Umur 7-8 dikekalkan daripada sistem asal kerana panduan SEGAK yang dibekalkan bermula umur 9.
const BMI_KPM: Record<'L' | 'P', Record<number, BmiThreshold>> = {
  L: {
    7: { underweightMax: 13.0, normalMax: 17.0, overweightMax: 19.0 },
    8: { underweightMax: 13.2, normalMax: 17.4, overweightMax: 19.7 },
    9: { underweightMax: 13.4, normalMax: 17.9, overweightMax: 20.5 },
    10: { underweightMax: 13.6, normalMax: 18.5, overweightMax: 21.4 },
    11: { underweightMax: 14.0, normalMax: 19.2, overweightMax: 22.5 },
    12: { underweightMax: 14.4, normalMax: 19.9, overweightMax: 23.6 },
    13: { underweightMax: 14.8, normalMax: 20.8, overweightMax: 24.8 },
    14: { underweightMax: 15.4, normalMax: 21.8, overweightMax: 25.9 },
    15: { underweightMax: 15.9, normalMax: 22.7, overweightMax: 27.0 },
    16: { underweightMax: 16.4, normalMax: 23.5, overweightMax: 27.9 },
    17: { underweightMax: 16.8, normalMax: 24.3, overweightMax: 28.6 },
  },
  P: {
    7: { underweightMax: 12.6, normalMax: 17.3, overweightMax: 19.8 },
    8: { underweightMax: 12.8, normalMax: 17.7, overweightMax: 20.6 },
    9: { underweightMax: 13.0, normalMax: 18.3, overweightMax: 21.5 },
    10: { underweightMax: 13.4, normalMax: 19.0, overweightMax: 22.6 },
    11: { underweightMax: 13.8, normalMax: 19.9, overweightMax: 23.7 },
    12: { underweightMax: 14.3, normalMax: 20.8, overweightMax: 25.0 },
    13: { underweightMax: 14.8, normalMax: 21.8, overweightMax: 26.2 },
    14: { underweightMax: 15.3, normalMax: 22.7, overweightMax: 27.3 },
    15: { underweightMax: 15.8, normalMax: 23.5, overweightMax: 28.2 },
    16: { underweightMax: 16.1, normalMax: 24.1, overweightMax: 28.9 },
    17: { underweightMax: 16.3, normalMax: 24.5, overweightMax: 29.3 },
  },
};

const genderCode = (gender: string): 'L' | 'P' | '' => {
  const g = String(gender || '').trim().toUpperCase();
  if (g.startsWith('L') || g === 'M' || g === 'MALE') return 'L';
  if (g.startsWith('P') || g === 'F' || g === 'FEMALE') return 'P';
  return '';
};

export const getBmiStatusByAgeGender = (age: number, gender: string, bmi: number) => {
  const code = genderCode(gender);
  if (!code || !BMI_KPM[code][age] || !Number.isFinite(bmi) || bmi <= 0) return 'Tiada Data';
  const t = BMI_KPM[code][age];
  if (bmi <= t.underweightMax) return 'Susut Berat Badan';
  if (bmi <= t.normalMax) return 'Berat Badan Normal';
  if (bmi <= t.overweightMax) return 'Berlebihan Berat Badan';
  return 'Obes';
};

type SegakBands = {
  step: [number, number, number, number]; // <= score 5,4,3,2; beyond = 1
  push: [number, number, number, number]; // >= score 5,4,3,2; below = 1
  curl: [number, number, number, number];
  reach: [number, number, number, number];
};

// Jadual 3-8 Panduan SEGAK BPK KPM 2016, ms. 18-19.
const SEGAK_KPM: Record<number, Record<'L' | 'P', SegakBands>> = {
  10: {
    L: { step: [79, 101, 125, 148], push: [15, 13, 9, 7], curl: [18, 15, 11, 8], reach: [37, 32, 25, 19] },
    P: { step: [84, 108, 133, 158], push: [21, 17, 13, 9], curl: [18, 15, 11, 8], reach: [35, 30, 24, 18] },
  },
  11: {
    L: { step: [78, 101, 124, 147], push: [16, 13, 9, 7], curl: [19, 16, 12, 8], reach: [39, 32, 25, 18] },
    P: { step: [86, 111, 136, 161], push: [21, 17, 13, 9], curl: [18, 15, 11, 8], reach: [36, 31, 25, 19] },
  },
  12: {
    L: { step: [77, 100, 123, 146], push: [18, 15, 11, 8], curl: [20, 16, 12, 8], reach: [39, 32, 25, 19] },
    P: { step: [83, 107, 132, 156], push: [21, 18, 13, 9], curl: [18, 15, 11, 8], reach: [38, 32, 25, 20] },
  },
};

const scoreLowerIsBetter = (value: number, bands: [number, number, number, number]) => {
  if (value <= bands[0]) return 5;
  if (value <= bands[1]) return 4;
  if (value <= bands[2]) return 3;
  if (value <= bands[3]) return 2;
  return 1;
};

const scoreHigherIsBetter = (value: number, bands: [number, number, number, number]) => {
  if (value >= bands[0]) return 5;
  if (value >= bands[1]) return 4;
  if (value >= bands[2]) return 3;
  if (value >= bands[3]) return 2;
  return 1;
};

export const getSegakScore = (age: number, gender: string, testName: string, value: number) => {
  if (value === undefined || value === null || !Number.isFinite(value)) return 0;
  const code = genderCode(gender);
  const norm = code ? SEGAK_KPM[age]?.[code] : undefined;
  if (!norm) return 0;

  if (testName === 'naikTurunBangku') return scoreLowerIsBetter(value, norm.step);
  if (testName === 'tekanTubi') return scoreHigherIsBetter(value, norm.push);
  if (testName === 'ringkukTubiSepara') return scoreHigherIsBetter(value, norm.curl);
  if (testName === 'jangkauanMelunjur') return scoreHigherIsBetter(value, norm.reach);
  return 0;
};

export const getOverallSegakResult = (totalScore: number) => {
  if (totalScore >= 18) return { gred: 'A', status: 'KECERGASAN SANGAT TINGGI' };
  if (totalScore >= 15) return { gred: 'B', status: 'KECERGASAN TINGGI' };
  if (totalScore >= 12) return { gred: 'C', status: 'CERGAS' };
  if (totalScore >= 8) return { gred: 'D', status: 'KURANG CERGAS' };
  if (totalScore >= 4) return { gred: 'E', status: 'TIDAK CERGAS' };
  return { gred: '', status: '' };
};

const isEmpty = (v: any) => v === '' || v === null || v === undefined;

export const getRowStatus = (student: any, yearLevel: number) => {
  const hasTinggi = !isEmpty(student.tinggi);
  const hasBerat = !isEmpty(student.berat);

  if (yearLevel <= 3) {
    if (!hasTinggi && !hasBerat) return 'BELUM ISI';
    if (hasTinggi && hasBerat) return 'SELESAI';
    return 'SEPARA SIAP';
  }

  const fields = [
    hasTinggi,
    hasBerat,
    !isEmpty(student.naikTurunBangku),
    !isEmpty(student.tekanTubi),
    !isEmpty(student.ringkukTubiSepara),
    !isEmpty(student.jangkauanMelunjur),
  ];
  const filledCount = fields.filter(Boolean).length;
  if (filledCount === 0) return 'BELUM ISI';
  if (filledCount === fields.length) return 'SELESAI';
  return 'SEPARA SIAP';
};
