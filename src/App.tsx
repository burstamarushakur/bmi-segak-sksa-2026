import React, { useEffect, useState } from 'react';
import {
  calculateBmi,
  getAgeFromClassName,
  getBmiStatusByAgeGender,
  getOverallSegakResult,
  getRowStatus,
  getSegakScore,
  getYearFromClassName
} from './lib/calculations';
import { Loader2, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbziQkmvtOm-dcKRDFPffpC6hAnrzmb117CBBqtw8p47KtnE6HX5O5VcjM2EIHTIBg8/exec";
const DEFAULT_PASSWORD = "pjkjba5095";

interface Student {
  rowNumber: number;
  bil?: number;
  namaMurid: string;
  mykid?: string;
  jantina: string;
  umur: number;
  tinggi: string | number;
  berat: string | number;
  bmi: string | number;
  statusBmi: string;
  naikTurunBangku: string | number;
  tekanTubi: string | number;
  ringkukTubiSepara: string | number;
  jangkauanMelunjur: string | number;
  jumlahSkor: string | number;
  gred: string;
  statusKecergasan: string;
  [key: string]: any;
}

export default function App() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [originalStudents, setOriginalStudents] = useState<Student[]>([]);
  
  const [selectedPengisian, setSelectedPengisian] = useState<string>('1');

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isAuthorizedToFill, setIsAuthorizedToFill] = useState(false);
  const [editableRows, setEditableRows] = useState<number[]>([]);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordAction, setPasswordAction] = useState<'fill' | 'edit' | null>(null);
  const [targetRowNumber, setTargetRowNumber] = useState<number | null>(null);

  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const bottomDiv = bottomScrollRef.current;
    const topDiv = topScrollRef.current;
    if (!bottomDiv || !topDiv) return;
    const topHelper = topDiv.firstElementChild as HTMLDivElement;
    if (!topHelper) return;

    let isSyncingTop = false;
    let isSyncingBottom = false;

    const onTopScroll = () => {
        if (!isSyncingTop) {
            isSyncingBottom = true;
            bottomDiv.scrollLeft = topDiv.scrollLeft;
        }
        isSyncingTop = false;
    };

    const onBottomScroll = () => {
        if (!isSyncingBottom) {
            isSyncingTop = true;
            topDiv.scrollLeft = bottomDiv.scrollLeft;
        }
        isSyncingBottom = false;
    };

    topDiv.addEventListener('scroll', onTopScroll, { passive: true });
    bottomDiv.addEventListener('scroll', onBottomScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
            topHelper.style.width = `${bottomDiv.scrollWidth}px`;
        });
        resizeObserver.observe(bottomDiv);
        const table = bottomDiv.querySelector('table');
        if (table) {
            resizeObserver.observe(table);
        }
    } else {
        topHelper.style.width = `${bottomDiv.scrollWidth}px`;
    }

    return () => {
        topDiv.removeEventListener('scroll', onTopScroll);
        bottomDiv.removeEventListener('scroll', onBottomScroll);
        if (resizeObserver) resizeObserver.disconnect();
    };
  }, [selectedClass, students.length]);

 const fetchClasses = async () => {
  try {
    setLoadingClasses(true);
    setMessage(null);

    const res = await fetch(`${API_URL}?action=getClasses`);
    const data = await res.json();

    // Format sebenar dari GAS:
    // { success: true, classes: ["1B","1K","1S", ...] }
    let classList: string[] = [];

    if (Array.isArray(data)) {
      classList = data;
    } else if (data && Array.isArray(data.classes)) {
      classList = data.classes;
    } else if (data && Array.isArray(data.data)) {
      classList = data.data;
    }

    if (!classList.length) {
      throw new Error("Senarai kelas tidak diterima dalam format yang betul.");
    }

    setClasses(classList);
  } catch (err) {
    console.error("Failed to fetch classes", err);
    setClasses([]);
    setMessage({
      type: 'error',
      text: 'Gagal mendapatkan senarai kelas dari pelayan.'
    });
  } finally {
    setLoadingClasses(false);
  }
};

const fetchStudents = async (className: string, pengisian: string) => {
  if (!className) return;

  try {
    setLoadingStudents(true);
    setMessage(null);

    const res = await fetch(`${API_URL}?action=getStudentsByClass&className=${encodeURIComponent(className)}&pengisian=${pengisian}`);
    const data = await res.json();

    const computedAge = getAgeFromClassName(className);

    // Format sebenar dari GAS:
    // { success: true, className: "1S", students: [...] }
    let rawStudents: any[] = [];

    if (Array.isArray(data)) {
      rawStudents = data;
    } else if (data && Array.isArray(data.students)) {
      rawStudents = data.students;
    } else if (data && Array.isArray(data.data)) {
      rawStudents = data.data;
    }

    if (!rawStudents.length) {
      setStudents([]);
      setOriginalStudents([]);
      return;
    }

    const normalizedData: Student[] = rawStudents.map((item: any, index: number) => {
      const nama = item.namaMurid || item["NAMA MURID"] || item.nama || item.name || '';
      const jantina = item.jantina || item["JANTINA"] || item.gender || '';

      return {
        ...item,
        rowNumber: item.rowNumber || item.ROW_NUMBER || item.Row || (index + 10),
        bil: item.bil || item["BIL"] || (index + 1),
        namaMurid: nama,
        mykid: String(item.mykid || item.MYKID || item["MY KID"] || item.Mykid || ''),
        jantina: String(jantina || ''),
        umur: computedAge,
        tinggi: String(item.tinggi ?? item["TINGGI"] ?? ''),
        berat: String(item.berat ?? item["BERAT"] ?? ''),
        bmi: String(item.bmi ?? item["BMI"] ?? ''),
        statusBmi: String(item.statusBmi ?? item["STATUS BMI"] ?? ''),
        naikTurunBangku: String(item.naikTurunBangku ?? item["NAIK TURUN BANGKU"] ?? ''),
        tekanTubi: String(item.tekanTubi ?? item["TEKAN TUBI"] ?? ''),
        ringkukTubiSepara: String(item.ringkukTubiSepara ?? item["RINGKUK TUBI SEPARA"] ?? ''),
        jangkauanMelunjur: String(item.jangkauanMelunjur ?? item["JANGKAUAN MELUNJUR"] ?? ''),
        jumlahSkor: String(item.jumlahSkor ?? item["JUMLAH SKOR"] ?? ''),
        gred: String(item.gred ?? item["GRED"] ?? ''),
        statusKecergasan: String(item.statusKecergasan ?? item["STATUS KECERGASAN"] ?? '')
      };
    });

    setStudents(JSON.parse(JSON.stringify(normalizedData)));
    setOriginalStudents(JSON.parse(JSON.stringify(normalizedData)));
  } catch (err) {
    console.error("Failed to fetch students", err);
    setStudents([]);
    setOriginalStudents([]);
    setMessage({
      type: 'error',
      text: 'Gagal memuat turun data murid. Sila cuba sebentar lagi.'
    });
  } finally {
    setLoadingStudents(false);
  }
};

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedClass(val);
    setStudents([]);
    setOriginalStudents([]);
    setIsAuthorizedToFill(false);
    setEditableRows([]);
    if (val) {
      fetchStudents(val, selectedPengisian);
    }
  };

  const handlePengisianChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPengisian(val);
    setStudents([]);
    setOriginalStudents([]);
    setIsAuthorizedToFill(false);
    setEditableRows([]);
    if (selectedClass) {
      fetchStudents(selectedClass, val);
    }
  };

  const handleInputChange = (index: number, field: keyof Student, value: string) => {
    setStudents(prev => {
      const newData = [...prev];
      const student = { ...newData[index], [field]: value };
      
      const yearLevel = getYearFromClassName(selectedClass);

      if (field === 'tinggi' || field === 'berat') {
        const t = parseFloat(student.tinggi as string);
        const b = parseFloat(student.berat as string);
        if (!isNaN(t) && !isNaN(b)) {
           const bmiVal = calculateBmi(t, b);
           student.bmi = String(bmiVal);
           student.statusBmi = String(getBmiStatusByAgeGender(student.umur, student.jantina, bmiVal));
        } else {
           student.bmi = '';
           student.statusBmi = '';
        }
      }

      if (yearLevel >= 4 && ['naikTurunBangku', 'tekanTubi', 'ringkukTubiSepara', 'jangkauanMelunjur'].includes(field as string)) {
          const s1 = getSegakScore(student.umur, student.jantina, 'naikTurunBangku', parseFloat(student.naikTurunBangku as string));
          const s2 = getSegakScore(student.umur, student.jantina, 'tekanTubi', parseFloat(student.tekanTubi as string));
          const s3 = getSegakScore(student.umur, student.jantina, 'ringkukTubiSepara', parseFloat(student.ringkukTubiSepara as string));
          const s4 = getSegakScore(student.umur, student.jantina, 'jangkauanMelunjur', parseFloat(student.jangkauanMelunjur as string));
          
          const isEmpty = (v: any) => v === "" || v === undefined || v === null;
          
          const hasAnySegak = !isEmpty(student.naikTurunBangku) || !isEmpty(student.tekanTubi) || !isEmpty(student.ringkukTubiSepara) || !isEmpty(student.jangkauanMelunjur);

          if (hasAnySegak) {
              const total = s1 + s2 + s3 + s4;
              student.jumlahSkor = String(total);
              const { gred, status } = getOverallSegakResult(total);
              student.gred = String(gred);
              student.statusKecergasan = String(status);
          } else {
              student.jumlahSkor = '';
              student.gred = '';
              student.statusKecergasan = '';
          }
      }

      newData[index] = student;
      return newData;
    });
  };

  const handleSave = async () => {
    if (!selectedClass) return;

    const changedStudents = students.filter((student, index) => {
        const original = originalStudents[index];
        return JSON.stringify(student) !== JSON.stringify(original);
    });

    if (changedStudents.length === 0) {
       setMessage({ type: 'success', text: 'Tiada perubahan rekod untuk disimpan.' });
       return;
    }

    try {
        setSaving(true);
        setMessage(null);
        
        const payload = {
            action: "saveClassRecords",
            className: selectedClass,
            pengisian: Number(selectedPengisian),
            students: changedStudents.map(s => ({
                rowNumber: s.rowNumber,
                umur: s.umur,
                tinggi: s.tinggi,
                berat: s.berat,
                bmi: s.bmi,
                statusBmi: s.statusBmi,
                naikTurunBangku: s.naikTurunBangku,
                tekanTubi: s.tekanTubi,
                ringkukTubiSepara: s.ringkukTubiSepara,
                jangkauanMelunjur: s.jangkauanMelunjur,
                jumlahSkor: s.jumlahSkor,
                gred: s.gred,
                statusKecergasan: s.statusKecergasan
            }))
        };

        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            }
        });
        
        const result = await res.json();
        // Allow fallback to success checking, GAS may return varied cases
        if (result.status === 'success' || result.success || result.result === 'success') {
            setMessage({ type: 'success', text: 'Data kelas berjaya disimpan!' });
            setOriginalStudents(JSON.parse(JSON.stringify(students)));
            setIsAuthorizedToFill(false);
            setEditableRows([]);
        } else {
            throw new Error(result.message || 'Ralat semasa menyimpan data');
        }
        
    } catch (err: any) {
        console.error("Save error", err);
        setMessage({ type: 'error', text: err.message || 'Gagal menyimpan rekod. Sila semak sambungan internet dan cuba lagi.' });
    } finally {
        setSaving(false);
    }
  };

  const requestFillAccess = () => {
      setPasswordAction('fill');
      setPasswordInput('');
      setPasswordError(null);
      setShowPasswordModal(true);
  };

  const lockFillAccess = () => {
      setIsAuthorizedToFill(false);
      setEditableRows([]);
  };

  const requestEditRow = (rowNumber: number) => {
      setPasswordAction('edit');
      setTargetRowNumber(rowNumber);
      setPasswordInput('');
      setPasswordError(null);
      setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (passwordInput === DEFAULT_PASSWORD) {
          if (passwordAction === 'fill') {
              setIsAuthorizedToFill(true);
              setMessage(null);
          } else if (passwordAction === 'edit' && targetRowNumber !== null) {
              setEditableRows(prev => [...prev, targetRowNumber]);
          }
          closePasswordModal();
      } else {
          setPasswordError('Password salah');
      }
  };

  const closePasswordModal = () => {
      setShowPasswordModal(false);
      setPasswordAction(null);
      setTargetRowNumber(null);
      setPasswordInput('');
      setPasswordError(null);
  };

  const yearLevel = getYearFromClassName(selectedClass);
  const showSegak = yearLevel >= 4;

  const totalStudents = students.length;
  const completedStudents = students.filter(s => getRowStatus(s, yearLevel) === 'SELESAI').length;
  const incompleteStudents = totalStudents - completedStudents;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center justify-center text-center gap-3">
          <img 
            src="https://i.postimg.cc/3RF9M05N/Logo-SKSA.png" 
            alt="Logo SKSA" 
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md" 
            referrerPolicy="no-referrer" 
          />
          <div className="flex flex-col items-center gap-0.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">SISTEM BMI 5-9T DAN SEGAK</h1>
            <h2 className="text-sm sm:text-base font-semibold text-blue-100 tracking-wide uppercase">SEKOLAH KEBANGSAAN SUNGAI ABONG</h2>
            <p className="text-xs sm:text-sm font-medium text-blue-200">2026</p>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-start sm:items-center gap-4">
                <div className="w-full sm:w-64">
                    <label htmlFor="classSelect" className="block text-sm text-slate-600 font-medium mb-1.5 uppercase tracking-wide">
                        PILIH KELAS
                    </label>
                    <div className="relative">
                      <select 
                          id="classSelect"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-base font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none disabled:opacity-50 transition-colors"
                          value={selectedClass}
                          onChange={handleClassChange}
                          disabled={loadingClasses || saving}
                      >
                          <option value="">-- Sila Pilih Kelas --</option>
                          {classes.map((cls, idx) => (
                              <option key={idx} value={cls}>{cls}</option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {loadingClasses ? (
                               <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                          ) : (
                               <svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                               </svg>
                          )}
                      </div>
                    </div>
                </div>

                <div className="w-full sm:w-48">
                    <label htmlFor="pengisianSelect" className="block text-sm text-slate-600 font-medium mb-1.5 uppercase tracking-wide">
                        PILIH PENGISIAN
                    </label>
                    <div className="relative">
                      <select 
                          id="pengisianSelect"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-base font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none disabled:opacity-50 transition-colors"
                          value={selectedPengisian}
                          onChange={handlePengisianChange}
                          disabled={saving}
                      >
                          <option value="1">PENGISIAN 1</option>
                          <option value="2">PENGISIAN 2</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                      </div>
                    </div>
                </div>
            </div>

            {selectedClass && !loadingStudents && totalStudents > 0 && (
                 <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto mt-4 xl:mt-0">
                     <span className="hidden sm:inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                         Paparan semasa: Pengisian {selectedPengisian}
                     </span>
                     <div className="flex bg-slate-50 border border-slate-100 rounded-lg p-3 sm:px-6 gap-6 sm:gap-8 w-full sm:w-auto shadow-sm">
                        <div className="text-center flex-1 sm:flex-initial">
                            <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Murid</div>
                        </div>
                        <div className="w-px bg-slate-200"></div>
                        <div className="text-center flex-1 sm:flex-initial">
                            <div className="text-2xl font-bold text-emerald-600">{completedStudents}</div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Selesai</div>
                        </div>
                        <div className="w-px bg-slate-200"></div>
                        <div className="text-center flex-1 sm:flex-initial">
                            <div className="text-2xl font-bold text-amber-600">{incompleteStudents}</div>
                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Belum Isi</div>
                        </div>
                    </div>
                    <button
                        onClick={isAuthorizedToFill ? lockFillAccess : requestFillAccess}
                        className={`w-full sm:w-auto px-5 py-3 text-sm font-bold rounded-lg shadow-sm transition-colors border outline-none focus:ring-2 ${
                            isAuthorizedToFill 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 focus:ring-amber-500' 
                            : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700 focus:ring-slate-500'
                        }`}
                    >
                        {isAuthorizedToFill ? 'KUNCI SEMULA' : 'BUKA ISI'}
                    </button>
                </div>
            )}
        </div>

        {message && (
             <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <AlertCircle className="w-6 h-6 flex-shrink-0" />}
                <p className="font-semibold text-sm sm:text-base">{message.text}</p>
            </div>
        )}

        {loadingStudents ? (
            <div className="bg-white border flex flex-col border-slate-200 rounded-xl overflow-hidden shadow-sm p-24 items-center justify-center text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                <p className="font-medium">Memuatkan baris data murid...</p>
            </div>
        ) : (
            selectedClass && students.length > 0 && (
                <div className="bg-white border flex flex-col border-slate-300 rounded-md shadow-sm text-sm relative">
                    <div ref={bottomScrollRef} className="overflow-x-auto w-full pb-1">
                        <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
                            <thead className="text-[11px] text-slate-700 bg-slate-200 uppercase sticky top-0 z-20 border-b border-slate-300 shadow-sm font-semibold tracking-wider">
                                <tr>
                                    <th className="px-2 py-2 text-center align-middle w-10 border-r border-slate-300">Bil</th>
                                    <th className="px-3 py-2 text-center align-middle sticky left-0 bg-slate-200 z-30 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)] border-r border-slate-300 tracking-wider">Nama Murid / MyKID</th>
                                    <th className="px-2 py-2 text-center align-middle w-20 border-r border-slate-300">Status</th>
                                    <th className="px-2 py-2 text-center align-middle w-16 border-r border-slate-300">Tindakan</th>
                                    <th className="px-2 py-2 text-center align-middle w-16 border-r border-slate-300">Jantina</th>
                                    <th className="px-2 py-2 text-center align-middle w-12 border-r border-slate-300">Umur</th>
                                    <th className="px-2 py-2 text-center align-middle w-24 border-r border-slate-300">Tinggi (cm)</th>
                                    <th className="px-2 py-2 text-center align-middle w-24 border-r border-slate-300">Berat (kg)</th>
                                    <th className="px-3 py-2 text-center align-middle bg-blue-100 text-blue-900 w-20 border-r border-blue-200">BMI</th>
                                    <th className="px-3 py-2 text-center align-middle bg-blue-100 text-blue-900 w-36 border-r border-blue-200">Status BMI</th>
                                    {showSegak && (
                                        <>
                                            <th className="px-2 py-2 w-28 border-r border-slate-300 whitespace-normal text-center align-middle leading-tight">NAIK TURUN BANGKU</th>
                                            <th className="px-2 py-2 w-24 border-r border-slate-300 whitespace-normal text-center align-middle leading-tight">TEKAN TUBI</th>
                                            <th className="px-2 py-2 w-28 border-r border-slate-300 whitespace-normal text-center align-middle leading-tight">RINGKUK TUBI SEPARA</th>
                                            <th className="px-2 py-2 w-28 border-r border-slate-300 whitespace-normal text-center align-middle leading-tight">JANGKAUAN MELUNJUR</th>
                                            <th className="px-3 py-2 align-middle bg-emerald-100 text-emerald-900 text-center w-20 border-r border-emerald-200">Skor</th>
                                            <th className="px-3 py-2 align-middle bg-emerald-100 text-emerald-900 text-center w-16 border-r border-emerald-200">Gred</th>
                                            <th className="px-3 py-2 align-middle bg-emerald-100 text-emerald-900 w-36 text-center">Status K.</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                                {students.map((student, idx) => {
                                    const status = getRowStatus(student, yearLevel);
                                    
                                    const originalStudent = originalStudents[idx];
                                    const isOriginallyComplete = originalStudent ? getRowStatus(originalStudent, yearLevel) === 'SELESAI' : false;
                                    const isRowExplicitlyUnlocked = editableRows.includes(student.rowNumber);
                                    
                                    const canEdit = (isAuthorizedToFill && !isOriginallyComplete) || isRowExplicitlyUnlocked;
                                    const isCompletedVisual = !canEdit;
                                    
                                    return (
                                        <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${isCompletedVisual ? 'bg-slate-50 text-slate-500' : 'bg-white group'}`}>
                                            <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-200">{student.bil}</td>
                                            <td className={`px-3 py-1.5 font-medium sticky left-0 z-10 border-r border-slate-200 drop-shadow-[2px_0_2px_rgba(0,0,0,0.02)] ${isCompletedVisual ? 'bg-slate-50' : 'bg-white group-hover:bg-blue-50/50'} min-w-[220px] whitespace-normal leading-tight flex flex-col justify-center`}>
                                                <span className="text-slate-900">{student.namaMurid}</span>
                                                {student.mykid && <span className="text-[10px] text-slate-500 font-normal">{student.mykid}</span>}
                                            </td>
                                            <td className="px-2 py-1.5 text-center border-r border-slate-200">
                                                {status === 'SELESAI' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-300 text-[9px] font-bold bg-emerald-50 text-emerald-700 tracking-wider">SELESAI</span>}
                                                {status === 'SEPARA SIAP' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-amber-300 text-[9px] font-bold bg-amber-50 text-amber-700 tracking-wider">SEPARA</span>}
                                                {status === 'BELUM ISI' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-300 text-[9px] font-bold bg-slate-100 text-slate-500 tracking-wider">KOSONG</span>}
                                            </td>
                                            <td className="px-2 py-1.5 text-center border-r border-slate-200">
                                                {isOriginallyComplete && !isRowExplicitlyUnlocked && (
                                                    <button 
                                                        onClick={() => requestEditRow(student.rowNumber)}
                                                        className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded font-bold transition-colors shadow-sm"
                                                        title="Edit Baris Ini"
                                                    >
                                                        EDIT
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-2 py-1.5 text-center border-r border-slate-200">{student.jantina}</td>
                                            <td className="px-2 py-1.5 text-center border-r border-slate-200">{student.umur}</td>
                                            
                                            <td className="px-1 py-1 border-r border-slate-200">
                                                <input
                                                    type="number"
                                                    value={student.tinggi}
                                                    onChange={e => handleInputChange(idx, 'tinggi', e.target.value)}
                                                    disabled={!canEdit}
                                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                    placeholder="cm"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200">
                                                <input
                                                    type="number"
                                                    value={student.berat}
                                                    onChange={e => handleInputChange(idx, 'berat', e.target.value)}
                                                    disabled={!canEdit}
                                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                    placeholder="kg"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="px-3 py-1.5 font-bold text-blue-800 bg-blue-50/50 text-center border-r border-slate-200">{student.bmi || '-'}</td>
                                            <td className="px-3 py-1.5 font-semibold text-blue-800 bg-blue-50/50 min-w-[140px] whitespace-normal leading-tight uppercase text-[10px] tracking-wide border-r border-slate-200">{student.statusBmi || '-'}</td>

                                            {showSegak && (
                                                <>
                                                    <td className="px-1 py-1 border-r border-slate-200">
                                                        <input
                                                            type="number"
                                                            value={student.naikTurunBangku}
                                                            onChange={e => handleInputChange(idx, 'naikTurunBangku', e.target.value)}
                                                            disabled={!canEdit}
                                                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1 border-r border-slate-200">
                                                        <input
                                                            type="number"
                                                            value={student.tekanTubi}
                                                            onChange={e => handleInputChange(idx, 'tekanTubi', e.target.value)}
                                                            disabled={!canEdit}
                                                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1 border-r border-slate-200">
                                                        <input
                                                            type="number"
                                                            value={student.ringkukTubiSepara}
                                                            onChange={e => handleInputChange(idx, 'ringkukTubiSepara', e.target.value)}
                                                            disabled={!canEdit}
                                                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1 border-r border-slate-200">
                                                        <input
                                                            type="number"
                                                            value={student.jangkauanMelunjur}
                                                            onChange={e => handleInputChange(idx, 'jangkauanMelunjur', e.target.value)}
                                                            disabled={!canEdit}
                                                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded shadow-inner focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 outline-none"
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 font-bold text-emerald-800 bg-emerald-50/50 text-center text-[13px] border-r border-slate-200">{student.jumlahSkor || '-'}</td>
                                                    <td className="px-3 py-1.5 font-bold text-emerald-800 bg-emerald-50/50 text-center text-[13px] border-r border-slate-200">{student.gred || '-'}</td>
                                                    <td className="px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-50/50 min-w-[140px] whitespace-normal leading-tight uppercase text-[10px] tracking-wide">{student.statusKecergasan || '-'}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="sticky bottom-0 z-40 flex flex-col drop-shadow-[0_-4px_8px_rgba(0,0,0,0.05)] rounded-b-md">
                        {/* Floating Horizontal Scrollbar */}
                        <div ref={topScrollRef} className="overflow-x-auto w-full bg-white/70 hover:bg-slate-50/90 backdrop-blur-md transition-colors border-t border-slate-300">
                            <div style={{ height: '12px' }}></div>
                        </div>

                        {/* Save Footer Container (Also acts as anchor) */}
                        <div className="bg-slate-100 px-4 py-3 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-md relative z-20">
                            <div className="text-[11px] text-slate-600 font-medium tracking-wide">
                                Hanya baris yang diubah (SEPARA/SELESAI) akan dihantar.
                                Pastikan data tepat sebelum klik butang simpan.
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-sm shadow-sm focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Simpan ({students.filter((s, idx) => JSON.stringify(s) !== JSON.stringify(originalStudents[idx])).length})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )
        )}
      </main>

      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                  <div className="bg-blue-800 px-4 py-3 border-b border-blue-900">
                      <h3 className="text-white font-semibold text-sm tracking-wide">MASUKKAN PASSWORD</h3>
                  </div>
                  <form onSubmit={handlePasswordSubmit} className="p-5 flex flex-col gap-4">
                      <div>
                          <input
                              type="password"
                              value={passwordInput}
                              onChange={(e) => {
                                  setPasswordInput(e.target.value);
                                  setPasswordError(null);
                              }}
                              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${passwordError ? 'border-red-500' : 'border-slate-300'}`}
                              placeholder="Kata Laluan"
                              autoFocus
                          />
                          {passwordError && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium">{passwordError}</p>
                          )}
                      </div>
                      <div className="flex justify-end gap-3 mt-2">
                          <button
                              type="button"
                              onClick={closePasswordModal}
                              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded text-sm font-semibold transition-colors"
                          >
                              BATAL
                          </button>
                          <button
                              type="submit"
                              className="px-4 py-2 text-white bg-blue-700 hover:bg-blue-800 rounded text-sm font-semibold transition-colors shadow-sm"
                          >
                              SAHKAN
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
