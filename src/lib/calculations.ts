export const getYearFromClassName = (className: string) => {
  const year = parseInt(className.charAt(0));
  return isNaN(year) ? 1 : year;
};

export const getAgeFromClassName = (className: string) => getYearFromClassName(className) + 6;

export const calculateBmi = (tinggiCm: number, beratKg: number) => {
  if (!tinggiCm || !beratKg) return 0;
  const tinggiM = tinggiCm / 100;
  const bmi = beratKg / (tinggiM * tinggiM);
  return parseFloat(bmi.toFixed(1));
};

export const getBmiStatusByAgeGender = (age: number, gender: string, bmi: number) => {
  const isMale = gender.toUpperCase().startsWith('L');

  if (age === 7) {
      if (isMale) {
          if (bmi <= 13.0) return "Kurus";
          if (bmi <= 17.0) return "Normal";
          if (bmi <= 19.0) return "Berlebihan Berat Badan";
          return "Obes";
      } else {
          if (bmi <= 12.6) return "Kurus";
          if (bmi <= 17.3) return "Normal";
          if (bmi <= 19.8) return "Berlebihan Berat Badan";
          return "Obes";
      }
  }
  if (age === 8) {
      if (isMale) {
          if (bmi <= 13.2) return "Kurus";
          if (bmi <= 17.4) return "Normal";
          if (bmi <= 19.7) return "Berlebihan Berat Badan";
          return "Obes";
      } else {
          if (bmi <= 12.8) return "Kurus";
          if (bmi <= 17.7) return "Normal";
          if (bmi <= 20.6) return "Berlebihan Berat Badan";
          return "Obes";
      }
  }
  if (age === 9) {
      if (isMale) {
          if (bmi <= 13.4) return "Kurus";
          if (bmi <= 17.9) return "Normal";
          if (bmi <= 20.5) return "Berlebihan Berat Badan";
          return "Obes";
      } else {
          if (bmi <= 13.0) return "Kurus";
          if (bmi <= 18.3) return "Normal";
          if (bmi <= 21.5) return "Berlebihan Berat Badan";
          return "Obes";
      }
  }

  // Placeholder untuk umur 10-12
  // TODO: Sila tambah threshold sebenar mengikut KPM untuk umur 10, 11, 12 jika berbeza
  if (age >= 10 && age <= 12) {
       if (bmi <= 13.5) return "Kurus (Placeholder)";
       if (bmi <= 18.5) return "Normal (Placeholder)";
       if (bmi <= 21.5) return "Berlebihan Berat Badan (Placeholder)";
       return "Obes (Placeholder)";
  }

  return "Tiada Data";
}

export const getSegakScore = (age: number, gender: string, testName: string, value: number) => {
  if (value === undefined || value === null || isNaN(value)) return 0;
  
  const isMale = gender.toUpperCase().startsWith('L');

  if (age === 10) {
      if (isMale) {
          if (testName === 'naikTurunBangku') {
              if (value <= 79) return 5;
              if (value <= 101) return 4;
              if (value <= 125) return 3;
              if (value <= 148) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
              if (value >= 15) return 5;
              if (value >= 13) return 4;
              if (value >= 9) return 3;
              if (value >= 7) return 2;
              return 1;
          }
          if (testName === 'ringkukTubiSepara') {
              if (value >= 18) return 5;
              if (value >= 15) return 4;
              if (value >= 11) return 3;
              if (value >= 8) return 2;
              return 1;
          }
          if (testName === 'jangkauanMelunjur') {
              if (value >= 37) return 5;
              if (value >= 32) return 4;
              if (value >= 25) return 3;
              if (value >= 19) return 2;
              return 1;
          }
      } else {
          // 10 Perempuan
          if (testName === 'naikTurunBangku') {
              if (value <= 78) return 5;
              if (value <= 101) return 4;
              if (value <= 124) return 3;
              if (value <= 147) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
               if (value >= 16) return 5;
               if (value >= 13) return 4;
               if (value >= 9) return 3;
               if (value >= 7) return 2;
               return 1;
          }
          if (testName === 'ringkukTubiSepara') {
               if (value >= 19) return 5;
               if (value >= 16) return 4;
               if (value >= 12) return 3;
               if (value >= 8) return 2;
               return 1;
          }
          if (testName === 'jangkauanMelunjur') {
               if (value >= 39) return 5;
               if (value >= 32) return 4;
               if (value >= 25) return 3;
               if (value >= 18) return 2;
               return 1;
          }
      }
  }

  if (age === 11) {
      if (isMale) {
          if (testName === 'naikTurunBangku') {
              if (value <= 77) return 5;
              if (value <= 100) return 4;
              if (value <= 123) return 3;
              if (value <= 146) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
              if (value >= 18) return 5;
              if (value >= 15) return 4;
              if (value >= 11) return 3;
              if (value >= 8) return 2;
              return 1;
          }
          if (testName === 'ringkukTubiSepara') {
              if (value >= 20) return 5;
              if (value >= 16) return 4;
              if (value >= 12) return 3;
              if (value >= 8) return 2;
              return 1;
          }
          if (testName === 'jangkauanMelunjur') {
              if (value >= 39) return 5;
              if (value >= 32) return 4;
              if (value >= 25) return 3;
              if (value >= 19) return 2;
              return 1;
          }
      } else {
           if (testName === 'naikTurunBangku') {
              if (value <= 83) return 5;
              if (value <= 107) return 4;
              if (value <= 132) return 3;
              if (value <= 156) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
              if (value >= 21) return 5;
              if (value >= 18) return 4;
              if (value >= 13) return 3;
              if (value >= 9) return 2;
              return 1;
          }
          if (testName === 'ringkukTubiSepara') {
              if (value >= 18) return 5;
              if (value >= 15) return 4;
              if (value >= 11) return 3;
              if (value >= 8) return 2;
              return 1;
          }
          if (testName === 'jangkauanMelunjur') {
              if (value >= 38) return 5;
              if (value >= 32) return 4;
              if (value >= 25) return 3;
              if (value >= 20) return 2;
              return 1;
          }
      }
  }

  if (age === 12) {
       if (isMale) {
          if (testName === 'naikTurunBangku') {
              if (value <= 76) return 5;
              if (value <= 98) return 4;
              if (value <= 121) return 3;
              if (value <= 143) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
              if (value >= 25) return 5;
              if (value >= 21) return 4;
              if (value >= 15) return 3;
              if (value >= 11) return 2;
              return 1;
          }
          if (testName === 'ringkukTubiSepara') {
              if (value >= 21) return 5;
              if (value >= 17) return 4;
              if (value >= 13) return 3;
              if (value >= 9) return 2;
              return 1;
          }
          if (testName === 'jangkauanMelunjur') {
              if (value >= 42) return 5;
              if (value >= 34) return 4;
              if (value >= 25) return 3;
              if (value >= 16) return 2;
              return 1;
          }
      } else {
           if (testName === 'naikTurunBangku') {
              if (value <= 82) return 5;
              if (value <= 106) return 4;
              if (value <= 130) return 3;
              if (value <= 154) return 2;
              return 1;
          }
          if (testName === 'tekanTubi') {
              if (value >= 22) return 5;
              if (value >= 18) return 4;
              if (value >= 13) return 3;
              if (value >= 9) return 2;
              return 1;
          }
          if (testName === 'ringkukTubiSepara') {
              if (value >= 19) return 5;
              if (value >= 16) return 4;
              if (value >= 11) return 3;
              if (value >= 8) return 2;
              return 1;
          }
          if (testName === 'jangkauanMelunjur') {
              if (value >= 39) return 5;
              if (value >= 33) return 4;
              if (value >= 26) return 3;
              if (value >= 20) return 2;
              return 1;
          }
      }
  }
  return 0;
}

export const getOverallSegakResult = (totalScore: number) => {
  if (totalScore >= 18) return { gred: 'A', status: 'KECERGASAN SANGAT TINGGI' };
  if (totalScore >= 15) return { gred: 'B', status: 'KECERGASAN TINGGI' };
  if (totalScore >= 12) return { gred: 'C', status: 'CERGAS' };
  if (totalScore >= 8) return { gred: 'D', status: 'KURANG CERGAS' };
  if (totalScore > 0) return { gred: 'E', status: 'TIDAK CERGAS' };
  return { gred: '', status: '' };
};

const isEmpty = (v: any) => v === "" || v === null || v === undefined;

export const getRowStatus = (student: any, yearLevel: number) => {
  const hasTinggi = !isEmpty(student.tinggi);
  const hasBerat = !isEmpty(student.berat);

  if (yearLevel <= 3) {
      if (!hasTinggi && !hasBerat) return 'BELUM ISI';
      if (hasTinggi && hasBerat) return 'SELESAI';
      return 'SEPARA SIAP';
  } else {
      const hasNaikTurunBangku = !isEmpty(student.naikTurunBangku);
      const hasTekanTubi = !isEmpty(student.tekanTubi);
      const hasRingkukTubiSepara = !isEmpty(student.ringkukTubiSepara);
      const hasJangkauanMelunjur = !isEmpty(student.jangkauanMelunjur);

      const fields = [hasTinggi, hasBerat, hasNaikTurunBangku, hasTekanTubi, hasRingkukTubiSepara, hasJangkauanMelunjur];
      const filledCount = fields.filter(Boolean).length;

      if (filledCount === 0) return 'BELUM ISI';
      if (filledCount === fields.length) return 'SELESAI';
      return 'SEPARA SIAP';
  }
};
