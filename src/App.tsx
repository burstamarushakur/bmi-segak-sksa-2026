import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileDown,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  calculateBmi,
  getAgeFromClassName,
  getBmiStatusByAgeGender,
  getOverallSegakResult,
  getRowStatus,
  getSegakScore,
  getYearFromClassName,
} from './lib/calculations';
import { apiCall, hasApiUrl } from './lib/api';
import { BssrHistory, downloadClassBssrPdf, downloadStudentBssrPdf } from './lib/bssrPdf';

interface Student {
  rowNumber: number;
  bil: number;
  studentKey: string;
  studentId: string;
  namaMurid: string;
  className?: string;
  classFullName?: string;
  yearLevel?: number;
  classTeacherName?: string;
  jantina: string;
  mykid: string;
  noTelPenjaga: string;
  umur: number | string;
  tinggi: number | string;
  berat: number | string;
  bmi: number | string;
  statusBmi: string;
  naikTurunBangku: number | string;
  tekanTubi: number | string;
  ringkukTubiSepara: number | string;
  jangkauanMelunjur: number | string;
  jumlahSkor: number | string;
  gred: string;
  statusKecergasan: string;
  tarikhUjian?: string;
  jantinaPerluSemak?: boolean;
}

type Message = { type: 'success' | 'error' | 'info'; text: string };

type ClassStatus = {
  className: string;
  yearLevel: number;
  totalStudents: number;
  bmiComplete: boolean;
  segakComplete: boolean;
};

const emptyToNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizedGender = (value: string) => {
  const v = String(value || '').toUpperCase();
  if (v.startsWith('L')) return 'LELAKI';
  if (v.startsWith('P')) return 'PEREMPUAN';
  return '';
};

const sortClasses = (list: string[]) => {
  const order = ['S', 'K', 'B'];
  return [...list].sort((a, b) => {
    const ya = parseInt(a, 10);
    const yb = parseInt(b, 10);
    if (ya !== yb) return ya - yb;
    const sa = a.replace(String(ya), '');
    const sb = b.replace(String(yb), '');
    return order.indexOf(sa) - order.indexOf(sb);
  });
};

const recomputeStudent = (student: Student, className: string): Student => {
  const yearLevel = getYearFromClassName(className);
  const age = emptyToNumber(student.umur) ?? getAgeFromClassName(className);
  const height = emptyToNumber(student.tinggi);
  const weight = emptyToNumber(student.berat);
  const gender = normalizedGender(student.jantina);
  const bmi = height && weight ? calculateBmi(height, weight) : 0;
  const statusBmi = bmi && gender ? getBmiStatusByAgeGender(age, gender, bmi) : '';

  let jumlahSkor: number | string = '';
  let gred = '';
  let statusKecergasan = '';

  if (yearLevel >= 4) {
    const raw = {
      naikTurunBangku: emptyToNumber(student.naikTurunBangku),
      tekanTubi: emptyToNumber(student.tekanTubi),
      ringkukTubiSepara: emptyToNumber(student.ringkukTubiSepara),
      jangkauanMelunjur: emptyToNumber(student.jangkauanMelunjur),
    };
    const complete = Object.values(raw).every(v => v !== null);
    if (complete && gender) {
      const scores = [
        getSegakScore(age, gender, 'naikTurunBangku', raw.naikTurunBangku as number),
        getSegakScore(age, gender, 'tekanTubi', raw.tekanTubi as number),
        getSegakScore(age, gender, 'ringkukTubiSepara', raw.ringkukTubiSepara as number),
        getSegakScore(age, gender, 'jangkauanMelunjur', raw.jangkauanMelunjur as number),
      ];
      if (scores.every(score => score > 0)) {
        jumlahSkor = scores.reduce((a, b) => a + b, 0);
        const result = getOverallSegakResult(Number(jumlahSkor));
        gred = result.gred;
        statusKecergasan = result.status;
      }
    }
  }

  return {
    ...student,
    jantina: gender,
    umur: age,
    bmi: bmi || '',
    statusBmi: statusBmi === 'Tiada Data' ? '' : statusBmi,
    jumlahSkor,
    gred,
    statusKecergasan,
  };
};

export default function App() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('segak_app_password') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [sessions, setSessions] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPengisian, setSelectedPengisian] = useState<'1' | '2'>('1');
  const [schoolName, setSchoolName] = useState('SEKOLAH KEBANGSAAN SUNGAI ABONG');

  const [students, setStudents] = useState<Student[]>([]);
  const [originalStudents, setOriginalStudents] = useState<Student[]>([]);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingClass, setDownloadingClass] = useState(false);
  const [downloadingStudent, setDownloadingStudent] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const yearLevel = selectedClass ? getYearFromClassName(selectedClass) : 0;
  const changedStudents = useMemo(
    () => students.filter((student, index) => JSON.stringify(student) !== JSON.stringify(originalStudents[index])),
    [students, originalStudents],
  );

  const authenticate = async (candidate: string) => {
    if (!candidate.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await apiCall('auth', {}, candidate);
      sessionStorage.setItem('segak_app_password', candidate);
      setPassword(candidate);
      setAuthReady(true);
      setPasswordInput('');
    } catch {
      sessionStorage.removeItem('segak_app_password');
      setPassword('');
      setAuthReady(false);
      setAuthError('Password tidak sah.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!hasApiUrl()) {
      setAuthError('Webapp belum disambungkan kepada Supabase SEGAK. Tetapkan VITE_SEGAK_API_URL dahulu.');
      return;
    }
    if (password) authenticate(password);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    (async () => {
      try {
        const config: any = await apiCall('getConfig');
        const years = (config.sessions || []).map(Number).filter(Number.isFinite).sort((a: number, b: number) => a - b);
        setSessions(years);
        if (config.schoolName) setSchoolName(config.schoolName);
        if (years.length) {
          const current = new Date().getFullYear();
          setSelectedYear(years.includes(current) ? current : years[years.length - 1]);
        }
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Gagal mendapatkan konfigurasi.' });
      }
    })();
  }, [authReady]);

  const fetchClasses = async () => {
    if (!authReady) return;
    setLoadingClasses(true);
    setSelectedClass('');
    setStudents([]);
    setOriginalStudents([]);
    try {
      const data: any = await apiCall('getClasses', { year: selectedYear });
      setClasses(sortClasses(Array.isArray(data.classes) ? data.classes : []));
    } catch (error: any) {
      setClasses([]);
      setMessage({ type: 'error', text: error.message || 'Gagal mendapatkan senarai kelas.' });
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStatuses = async () => {
    if (!authReady) return;
    setLoadingStatuses(true);
    try {
      const data: any = await apiCall('getClassStatuses', { year: selectedYear, pengisian: Number(selectedPengisian) });
      setClassStatuses(sortClasses((data.statuses || []).map((s: any) => s.className)).map(name => (data.statuses || []).find((s: any) => s.className === name)));
    } catch {
      setClassStatuses([]);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    fetchClasses();
  }, [selectedYear, authReady]);

  useEffect(() => {
    if (!authReady) return;
    fetchStatuses();
  }, [selectedYear, selectedPengisian, authReady]);

  const fetchStudents = async (className = selectedClass, pengisian = selectedPengisian) => {
    if (!className) return;
    setLoadingStudents(true);
    setMessage(null);
    try {
      const data: any = await apiCall('getStudentsByClass', {
        year: selectedYear,
        className,
        pengisian: Number(pengisian),
      });
      const normalized: Student[] = (data.students || []).map((item: any, index: number) => recomputeStudent({
        rowNumber: item.rowNumber || index + 1,
        bil: item.bil || index + 1,
        studentKey: item.studentKey || item.studentId,
        studentId: item.studentId || item.studentKey,
        namaMurid: item.namaMurid || '',
        className: item.className || className,
        classFullName: item.classFullName || '',
        yearLevel: item.yearLevel || getYearFromClassName(className),
        classTeacherName: item.classTeacherName || '',
        jantina: item.jantina || '',
        mykid: item.mykid || '',
        noTelPenjaga: item.noTelPenjaga || '',
        umur: item.umur || getAgeFromClassName(className),
        tinggi: item.tinggi ?? '',
        berat: item.berat ?? '',
        bmi: item.bmi ?? '',
        statusBmi: item.statusBmi || '',
        naikTurunBangku: item.naikTurunBangku ?? '',
        tekanTubi: item.tekanTubi ?? '',
        ringkukTubiSepara: item.ringkukTubiSepara ?? '',
        jangkauanMelunjur: item.jangkauanMelunjur ?? '',
        jumlahSkor: item.jumlahSkor ?? '',
        gred: item.gred || '',
        statusKecergasan: item.statusKecergasan || '',
        tarikhUjian: item.tarikhUjian || '',
        jantinaPerluSemak: item.jantinaPerluSemak,
      }, className));
      setStudents(normalized);
      setOriginalStudents(JSON.parse(JSON.stringify(normalized)));
      setClassInfo(data.classInfo || null);
    } catch (error: any) {
      setStudents([]);
      setOriginalStudents([]);
      setMessage({ type: 'error', text: error.message || 'Gagal mendapatkan data murid.' });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedClass) fetchStudents(selectedClass, selectedPengisian);
  }, [selectedClass, selectedPengisian]);

  const updateStudent = (index: number, field: keyof Student, value: any) => {
    setStudents(prev => prev.map((student, i) => i === index ? recomputeStudent({ ...student, [field]: value }, selectedClass) : student));
  };

  const handleSave = async () => {
    if (!selectedClass || !changedStudents.length) return;
    setSaving(true);
    setMessage(null);
    try {
      const data: any = await apiCall('saveClassRecords', {
        year: selectedYear,
        className: selectedClass,
        pengisian: Number(selectedPengisian),
        students: changedStudents,
      });
      setMessage({ type: 'success', text: `${data.saved || changedStudents.length} rekod berjaya disimpan ke Supabase SEGAK.` });
      await fetchStudents();
      await fetchStatuses();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan data.' });
    } finally {
      setSaving(false);
    }
  };

  const downloadStudent = async (student: Student) => {
    setDownloadingStudent(student.studentId);
    try {
      const data: any = await apiCall('getStudentBssr', {
        studentId: student.studentId,
        namaMurid: student.namaMurid,
      });
      await downloadStudentBssrPdf(data.history as BssrHistory, selectedYear);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'PDF murid gagal dijana.' });
    } finally {
      setDownloadingStudent(null);
    }
  };

  const downloadClass = async () => {
    if (!selectedClass || yearLevel < 4) return;
    setDownloadingClass(true);
    try {
      const data: any = await apiCall('getClassBssr', { year: selectedYear, className: selectedClass });
      await downloadClassBssrPdf((data.histories || []) as BssrHistory[], selectedYear, selectedClass);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'PDF kelas gagal dijana.' });
    } finally {
      setDownloadingClass(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('segak_app_password');
    setPassword('');
    setAuthReady(false);
    setStudents([]);
    setOriginalStudents([]);
    setPasswordInput('');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-blue-900 text-white p-6">
            <div className="flex items-center gap-3"><ShieldCheck className="w-8 h-8"/><div><h1 className="font-bold text-lg">BMI & SEGAK SKSA</h1><p className="text-blue-100 text-xs">Supabase Edition · Data kelas daripada Portal Koku</p></div></div>
          </div>
          <form onSubmit={e => { e.preventDefault(); authenticate(passwordInput); }} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Password Sistem</label>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Masukkan password"/>
              {authError && <p className="mt-2 text-xs text-red-600 flex items-start gap-1"><AlertCircle className="w-4 h-4 shrink-0"/>{authError}</p>}
            </div>
            <button disabled={authLoading || !passwordInput.trim()} className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4"/>} MASUK SISTEM
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-blue-950 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold tracking-wide">SISTEM BMI & SEGAK SKSA</h1>
            <p className="text-[11px] text-blue-200">{schoolName} · Master murid/kelas: Supabase Portal Koku</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-white text-slate-800 text-sm rounded px-3 py-2 font-semibold">
              {sessions.map(year => <option key={year} value={year}>SESI {year}</option>)}
            </select>
            <div className="flex rounded overflow-hidden border border-blue-400/40">
              {(['1','2'] as const).map(p => <button key={p} onClick={() => setSelectedPengisian(p)} className={`px-3 py-2 text-xs font-bold ${selectedPengisian===p?'bg-white text-blue-900':'bg-blue-800 text-white hover:bg-blue-700'}`}>PENGISIAN {p}</button>)}
            </div>
            <button onClick={logout} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"><LogOut className="w-4 h-4"/> Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-4 space-y-4">
        {message && <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${message.type==='error'?'bg-red-50 border-red-200 text-red-700':message.type==='success'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-blue-50 border-blue-200 text-blue-700'}`}>{message.type==='success'?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{message.text}</div>}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div><h2 className="font-bold text-sm">PILIH KELAS</h2><p className="text-xs text-slate-500">Senarai ini dibaca terus daripada Portal Koku untuk sesi {selectedYear}.</p></div>
            <button onClick={fetchClasses} disabled={loadingClasses} className="text-xs px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5"><RefreshCw className={`w-4 h-4 ${loadingClasses?'animate-spin':''}`}/>Muat Semula</button>
          </div>
          {loadingClasses ? <div className="py-5 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Memuatkan kelas...</div> : classes.length ? <div className="flex flex-wrap gap-2">{classes.map(cls => <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${selectedClass===cls?'bg-blue-700 border-blue-700 text-white':'bg-white border-slate-300 hover:border-blue-400 hover:text-blue-700'}`}>{cls}</button>)}</div> : <div className="py-5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3">Belum ada kelas/murid untuk sesi {selectedYear} dalam Supabase Portal Koku.</div>}
        </section>

        {selectedClass && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div><h2 className="font-bold">KELAS {selectedClass} · PENGISIAN {selectedPengisian}</h2><p className="text-xs text-slate-500">{classInfo?.className || ''}{classInfo?.classTeacherName ? ` · Guru Kelas: ${classInfo.classTeacherName}` : ''}</p></div>
              <div className="flex flex-wrap gap-2">
                {yearLevel >= 4 && <button onClick={downloadClass} disabled={downloadingClass || !students.length} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">{downloadingClass?<Loader2 className="w-4 h-4 animate-spin"/>:<FileDown className="w-4 h-4"/>} PDF KPM KELAS</button>}
                <button onClick={handleSave} disabled={saving || !changedStudents.length} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>} SIMPAN ({changedStudents.length})</button>
              </div>
            </div>

            {loadingStudents ? <div className="p-10 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>Memuatkan data murid...</div> : (
              <div className="overflow-x-auto">
                <table className="min-w-[1750px] w-full text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase sticky top-[64px] z-20">
                    <tr>
                      <th className="p-2 border border-slate-200 w-12">Bil</th>
                      <th className="p-2 border border-slate-200 min-w-[300px]">Nama Murid</th>
                      <th className="p-2 border border-slate-200 min-w-[125px]">Jantina</th>
                      <th className="p-2 border border-slate-200 min-w-[140px]">MyKid / Sijil Beranak</th>
                      <th className="p-2 border border-slate-200 min-w-[135px]">Tel. Penjaga</th>
                      <th className="p-2 border border-slate-200 w-20">Umur</th>
                      <th className="p-2 border border-slate-200 w-24">Tinggi (cm)</th>
                      <th className="p-2 border border-slate-200 w-24">Berat (kg)</th>
                      <th className="p-2 border border-slate-200 w-20">BMI</th>
                      <th className="p-2 border border-slate-200 min-w-[150px]">Status BMI</th>
                      {yearLevel >= 4 && <><th className="p-2 border border-slate-200 w-32">Tarikh Ujian</th><th className="p-2 border border-slate-200 w-28">Naik Turun Bangku</th><th className="p-2 border border-slate-200 w-24">Tekan Tubi</th><th className="p-2 border border-slate-200 w-28">Ringkuk Tubi</th><th className="p-2 border border-slate-200 w-24">Jangkauan</th><th className="p-2 border border-slate-200 w-20">Skor</th><th className="p-2 border border-slate-200 w-16">Gred</th><th className="p-2 border border-slate-200 min-w-[150px]">Kecergasan</th></>}
                      <th className="p-2 border border-slate-200 w-28">Status</th>
                      {yearLevel >= 4 && <th className="p-2 border border-slate-200 w-24">Borang KPM</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const status = getRowStatus(student, yearLevel);
                      const statusClass = status === 'SELESAI' ? 'bg-emerald-50 text-emerald-700' : status === 'SEPARA SIAP' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500';
                      return <tr key={student.studentId} className="hover:bg-blue-50/30">
                        <td className="p-2 border border-slate-200 text-center font-semibold">{student.bil}</td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-800">{student.namaMurid}</td>
                        <td className="p-1 border border-slate-200"><select value={student.jantina} onChange={e=>updateStudent(index,'jantina',e.target.value)} className={`w-full border rounded px-2 py-1.5 bg-white ${student.jantinaPerluSemak&&!student.jantina?'border-amber-400':'border-slate-300'}`}><option value="">-- PILIH --</option><option value="LELAKI">LELAKI</option><option value="PEREMPUAN">PEREMPUAN</option></select></td>
                        <td className="p-1 border border-slate-200"><input value={student.mykid} onChange={e=>updateStudent(index,'mykid',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" placeholder="Optional"/></td>
                        <td className="p-1 border border-slate-200"><input value={student.noTelPenjaga} onChange={e=>updateStudent(index,'noTelPenjaga',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" placeholder="Optional"/></td>
                        <td className="p-1 border border-slate-200"><input type="number" value={student.umur} onChange={e=>updateStudent(index,'umur',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                        <td className="p-1 border border-slate-200"><input type="number" step="0.1" value={student.tinggi} onChange={e=>updateStudent(index,'tinggi',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                        <td className="p-1 border border-slate-200"><input type="number" step="0.1" value={student.berat} onChange={e=>updateStudent(index,'berat',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                        <td className="p-2 border border-slate-200 text-center font-bold bg-blue-50">{student.bmi || '-'}</td>
                        <td className="p-2 border border-slate-200 font-semibold bg-blue-50">{student.statusBmi || (student.tinggi&&student.berat&&!student.jantina?'PILIH JANTINA':'-')}</td>
                        {yearLevel >= 4 && <>
                          <td className="p-1 border border-slate-200"><input type="date" value={student.tarikhUjian || ''} onChange={e=>updateStudent(index,'tarikhUjian',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                          <td className="p-1 border border-slate-200"><input type="number" value={student.naikTurunBangku} onChange={e=>updateStudent(index,'naikTurunBangku',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                          <td className="p-1 border border-slate-200"><input type="number" value={student.tekanTubi} onChange={e=>updateStudent(index,'tekanTubi',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                          <td className="p-1 border border-slate-200"><input type="number" value={student.ringkukTubiSepara} onChange={e=>updateStudent(index,'ringkukTubiSepara',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                          <td className="p-1 border border-slate-200"><input type="number" value={student.jangkauanMelunjur} onChange={e=>updateStudent(index,'jangkauanMelunjur',e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-center"/></td>
                          <td className="p-2 border border-slate-200 text-center font-bold bg-emerald-50">{student.jumlahSkor || '-'}</td>
                          <td className="p-2 border border-slate-200 text-center font-bold bg-emerald-50">{student.gred || '-'}</td>
                          <td className="p-2 border border-slate-200 text-[10px] font-semibold bg-emerald-50">{student.statusKecergasan || '-'}</td>
                        </>}
                        <td className={`p-2 border border-slate-200 text-center font-bold text-[10px] ${statusClass}`}>{status}</td>
                        {yearLevel >= 4 && <td className="p-1 border border-slate-200 text-center"><button onClick={()=>downloadStudent(student)} disabled={downloadingStudent===student.studentId} className="px-2 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[10px] font-semibold inline-flex items-center gap-1">{downloadingStudent===student.studentId?<Loader2 className="w-3 h-3 animate-spin"/>:<Download className="w-3 h-3"/>} PDF</button></td>}
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between text-[11px] text-slate-600"><span>Jumlah murid: <b>{students.length}</b></span><span>Skor/gred hanya dikira selepas semua 4 ujian SEGAK lengkap.</span></div>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3"><div><h2 className="font-bold text-sm">STATUS PENGISIAN</h2><p className="text-xs text-slate-500">Sesi {selectedYear} · Pengisian {selectedPengisian}</p></div>{loadingStatuses&&<Loader2 className="w-4 h-4 animate-spin text-blue-600"/>}</div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-3 text-left">KELAS</th><th className="p-3 text-left">MURID</th><th className="p-3 text-left">BMI</th><th className="p-3 text-left">SEGAK</th></tr></thead><tbody className="divide-y divide-slate-100">{classStatuses.map(s=><tr key={s.className}><td className="p-3 font-bold">{s.className}</td><td className="p-3">{s.totalStudents}</td><td className="p-3">{s.bmiComplete?<span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>SELESAI</span>:<span className="text-red-600 font-semibold flex items-center gap-1"><XCircle className="w-4 h-4"/>BELUM SELESAI</span>}</td><td className="p-3">{s.yearLevel<4?<span className="text-slate-400">-</span>:s.segakComplete?<span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>SELESAI</span>:<span className="text-red-600 font-semibold flex items-center gap-1"><XCircle className="w-4 h-4"/>BELUM SELESAI</span>}</td></tr>)}</tbody></table>
          </div>
        </section>
      </main>
    </div>
  );
}
