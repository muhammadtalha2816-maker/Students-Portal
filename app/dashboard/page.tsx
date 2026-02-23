'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import MarkInput from '@/components/MarkInput';
import AddStudent from '@/components/AddStudent';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- 1. THEME CONFIGURATION ---
const THEMES: Record<string, any> = {
  black: { key: 'black', color: '#09090b', lightColor: '#52525b', bg: '#f4f4f5' },
  midnight: { key: 'midnight', color: '#020617', lightColor: '#64748b', bg: '#f8fafc' },
  navy: { key: 'navy', color: '#0f172a', lightColor: '#3b82f6', bg: '#eff6ff' },
  ocean: { key: 'ocean', color: '#083344', lightColor: '#06b6d4', bg: '#ecfeff' },
  denim: { key: 'denim', color: '#1e3a8a', lightColor: '#60a5fa', bg: '#eff6ff' },
  sky: { key: 'sky', color: '#0369a1', lightColor: '#38bdf8', bg: '#f0f9ff' },
  emerald: { key: 'emerald', color: '#064e3b', lightColor: '#10b981', bg: '#f0fdf4' },
  forest: { key: 'forest', color: '#14532d', lightColor: '#4ade80', bg: '#f0fdf4' },
  teal: { key: 'teal', color: '#0f766e', lightColor: '#14b8a6', bg: '#f0fdfa' },
  rust: { key: 'rust', color: '#78350f', lightColor: '#f97316', bg: '#fff7ed' },
  coffee: { key: 'coffee', color: '#451a03', lightColor: '#d97706', bg: '#fef3c7' },
  gold: { key: 'gold', color: '#713f12', lightColor: '#eab308', bg: '#fefce8' },
  steel: { key: 'steel', color: '#334155', lightColor: '#94a3b8', bg: '#f8fafc' },
  stone: { key: 'stone', color: '#57534e', lightColor: '#a8a29e', bg: '#fafaf9' },
  crimson: { key: 'crimson', color: '#831843', lightColor: '#f43f5e', bg: '#fff1f2' },
  indigo: { key: 'indigo', color: '#312e81', lightColor: '#818cf8', bg: '#e0e7ff' },
};
const THEME_KEYS = Object.keys(THEMES);

const PIE_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#d946ef', '#84cc16', '#f97316', '#64748b'];
const UNIVERSAL_SYMBOLS = ['0', '1', 'A', 'Ω', '∑', 'π', '✓', 'Δ', '{ }', '< />', '?', '∞', '⚛'];
const UNIVERSAL_QUOTES = ["Knowledge is power.", "Education is the passport to the future.", "Discipline equals freedom.", "Consistency is key to mastery.", "Every expert was once a beginner.", "Keep pushing forward!", "Success is built one day at a time."];

const getUserTheme = (email: string | undefined) => {
  if (!email) return THEMES['emerald'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash += email.charCodeAt(i);
  return THEMES[THEME_KEYS[hash % THEME_KEYS.length]];
};

const Crown = ({ rank, themeColor }: { rank: number, themeColor: string }) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  if (rank > 3) return <span style={{ width: '24px', display: 'inline-block' }}></span>;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
      <path fill={colors[rank - 1]} d="M2 20h20v-2H2v2zm2-3h16v-2H4v2zm16-4l-4-9-4 7-4-7-4 9H4v2h16v-2z" />
    </svg>
  );
};

const FloatingBackground = ({ lightColor, onSymbolClick }: { lightColor: string, onSymbolClick: () => void }) => {
  const [elements, setElements] = useState<any[]>([]);
  useEffect(() => {
    setElements(Array.from({ length: 30 }).map((_, i) => ({
      id: i, val: UNIVERSAL_SYMBOLS[Math.floor(Math.random() * UNIVERSAL_SYMBOLS.length)],
      left: `${Math.random() * 100}vw`, top: `${100 + Math.random() * 20}vh`,
      size: `${16 + Math.random() * 30}px`, duration: `${15 + Math.random() * 20}s`, delay: `${Math.random() * 15}s`
    })));
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {elements.map((el) => (
        <div key={el.id} onPointerDown={onSymbolClick} className="floating-number" style={{ left: el.left, top: el.top, fontSize: el.size, animationDuration: el.duration, animationDelay: el.delay, color: lightColor, cursor: 'pointer', pointerEvents: 'auto' }}>
          {el.val}
        </div>
      ))}
    </div>
  );
};

// --- 3. MAIN DASHBOARD COMPONENT ---
export default function Dashboard() {
  const [teacher, setTeacher] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('All Sections');
  const [selectedSession, setSelectedSession] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [dialogueBox, setDialogueBox] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [showThemePicker, setShowThemePicker] = useState(false);

  const [newSubName, setNewSubName] = useState('');
  const [newSubStart, setNewSubStart] = useState(2020);
  const [newSubEnd, setNewSubEnd] = useState(2025);
  const [newSubClasses, setNewSubClasses] = useState<string[]>([]);
  const [newSubPapersStr, setNewSubPapersStr] = useState('P1, P2');
  const [newSubMaxMarksStr, setNewSubMaxMarksStr] = useState('75, 50');

  const availableClassesList = ['Level 3', 'Level 4', 'A1', 'A2', 'A3'];

  useEffect(() => {
    const stored = localStorage.getItem('school_teacher_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTeacher(parsed);
      fetchSubjects(parsed.id);
    }
  }, []);

  async function fetchSubjects(tId: string) {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tId);
    if (data && data.length > 0) {
      setSubjects(data);
      setActiveSubject(data[0]);
      setSelectedSession(`May/June ${data[0].end_year}`);
    } else {
      setSubjects([]);
      setActiveSubject(null);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const safeEmail = email.trim().toLowerCase();
    const { data } = await supabase.from('teachers').select('*').eq('email', safeEmail).eq('password', password).single();
    if (data) {
      if (!data.theme) data.theme = getUserTheme(data.email).key;
      localStorage.setItem('school_teacher_auth', JSON.stringify(data));
      setTeacher(data);
      fetchSubjects(data.id);
    } else { setLoginError('Incorrect email or password.'); }
  };

  const handleLogout = () => { localStorage.removeItem('school_teacher_auth'); setTeacher(null); setSubjects([]); setEmail(''); setPassword(''); };

  const handleThemeChange = async (newThemeKey: string) => {
    const updatedTeacher = { ...teacher, theme: newThemeKey };
    setTeacher(updatedTeacher);
    localStorage.setItem('school_teacher_auth', JSON.stringify(updatedTeacher));
    await supabase.from('teachers').update({ theme: newThemeKey }).eq('id', teacher.id);
  };

  const sessions = useMemo(() => {
    if (!activeSubject) return [];
    const arr = [];
    for (let y = activeSubject.end_year; y >= activeSubject.start_year; y--) { arr.push(`May/June ${y}`); arr.push(`Oct/Nov ${y}`); }
    return arr;
  }, [activeSubject]);

  useEffect(() => { if (activeSubject && selectedSession) fetchClassData(); }, [activeSubject, selectedClass, selectedSession]);

  async function fetchClassData() {
    if (!activeSubject) return;
    const { data: classesData } = await supabase.from('classes').select('id, name');
    const classMap: Record<string, string> = {};
    classesData?.forEach(c => { classMap[c.id] = c.name; });

    const { data: progData } = await supabase.from('subject_progress').select('student_id, progress').eq('subject_id', activeSubject.id);
    const progMap: Record<string, number> = {};
    progData?.forEach((p: any) => { progMap[p.student_id] = p.progress; });

    const { data } = await supabase.from('students').select('id, name, class_id, exam_entries(p1, p2, p3, p4, session_name, subject_id)');
    const relevantStudents = (data || []).filter(s => activeSubject.classes.includes(classMap[s.class_id]));

    const processed: any[] = relevantStudents.map(s => {
      let activeSessionsCount = 0;
      let grandTotal = 0;
      const currentSubjectEntries = s.exam_entries.filter((e: any) => e.subject_id === activeSubject.id);
      currentSubjectEntries.forEach((e: any) => {
        let sessionTotal = 0;
        activeSubject.papers?.forEach((_: any, i: number) => { sessionTotal += (Number(e[`p${i+1}`]) || 0); });
        grandTotal += sessionTotal;
        if (sessionTotal > 0) activeSessionsCount++;
      });
      const className = classMap[s.class_id] || 'Unknown';
      const sessionMaxSum = activeSubject.max_marks ? activeSubject.max_marks.reduce((a:number, b:number) => a + b, 0) : (activeSubject.papers?.length || 4) * 75;
      const maxPossible = activeSessionsCount === 0 ? sessionMaxSum : activeSessionsCount * sessionMaxSum;
      const currentEntry = currentSubjectEntries.find((e: any) => e.session_name === selectedSession) || {};

      return {
        ...s, className, maxPossible, currentEntry,
        total: grandTotal, progress: progMap[s.id] || 0, all_entries: currentSubjectEntries,
        globalRank: 0, classRank: 0
      };
    });

    processed.sort((a, b) => b.total - a.total);
    let gRank = 1;
    processed.forEach((s, i) => { if (i > 0 && s.total < processed[i - 1].total) gRank = i + 1; s.globalRank = gRank; });

    activeSubject.classes.forEach((cls: string) => {
      const clsStudents = processed.filter(s => s.className === cls);
      let cRank = 1;
      clsStudents.forEach((s, i) => { if (i > 0 && s.total < clsStudents[i - 1].total) cRank = i + 1; s.classRank = cRank; });
    });
    setStudents(processed);
  }

  const handleSymbolClick = () => { setDialogueBox(UNIVERSAL_QUOTES[Math.floor(Math.random() * UNIVERSAL_QUOTES.length)]); };

  const openAddSubject = () => { setNewSubName(''); setNewSubStart(2020); setNewSubEnd(2025); setNewSubClasses([]); setNewSubPapersStr('P1, P2'); setNewSubMaxMarksStr('75, 50'); setShowAddSubject(true); };

  const handleSaveSubject = async () => {
    if (!newSubName || newSubClasses.length === 0) return alert("Please fill name and select at least one class.");
    const papersArray = newSubPapersStr.split(',').map(p => p.trim()).filter(p => p);
    const maxMarksArray = newSubMaxMarksStr.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
    if (papersArray.length > 4) return alert("Maximum 4 papers allowed currently.");
    if (papersArray.length !== maxMarksArray.length) return alert("The number of papers MUST match the number of max marks!");
    const { data, error } = await supabase.from('subjects').insert({ teacher_id: teacher.id, name: newSubName, classes: newSubClasses, start_year: newSubStart, end_year: newSubEnd, papers: papersArray, max_marks: maxMarksArray }).select().single();
    if (!error && data) { setSubjects([...subjects, data]); setActiveSubject(data); setShowAddSubject(false); }
  };

  const handleDeleteSubject = async () => {
    if (!activeSubject) return;
    if (window.confirm(`Are you absolutely sure you want to delete ${activeSubject.name}?`)) {
      const { error } = await supabase.from('subjects').delete().eq('id', activeSubject.id);
      if (!error) { const updatedSubjects = subjects.filter(s => s.id !== activeSubject.id); setSubjects(updatedSubjects); setActiveSubject(updatedSubjects.length > 0 ? updatedSubjects[0] : null); } else { alert("Failed to delete subject."); }
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${studentName}?`)) {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (!error) { if (selectedStudent?.id === studentId) setSelectedStudent(null); fetchClassData(); }
    }
  };

  const handleProgressChange = async (studentId: string, newProgress: number) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, progress: newProgress } : s));
    if (selectedStudent?.id === studentId) setSelectedStudent({ ...selectedStudent, progress: newProgress });
    await supabase.from('subject_progress').upsert({ student_id: studentId, subject_id: activeSubject.id, progress: newProgress }, { onConflict: 'student_id, subject_id' });
  };

  const displayedStudents = selectedClass === 'All Sections' ? students : students.filter(s => s.className === selectedClass);
  const top10 = displayedStudents.slice(0, 10);
  const chartData = top10.map(s => ({ name: s.name.split(' ')[0], fullName: s.name, score: s.total }));

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = selectedClass === 'All Sections' ? 'Master Leaderboard' : `${selectedClass} - Archive`;
    const sheet = workbook.addWorksheet(sheetName);
    const themeInfo = THEMES[teacher?.theme] || THEMES['emerald'];
    const themeColorHex = themeInfo.color.replace('#', 'FF');

    sheet.mergeCells('A1', 'E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Baitussalam Educational Complex';
    titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColorHex } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 40;
    sheet.mergeCells('A2', 'E2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Instructor: ${teacher.name} | Subject: ${activeSubject.name} | View: ${selectedClass}`;
    subtitleCell.font = { size: 14, bold: true, color: { argb: themeColorHex } };
    subtitleCell.alignment = { horizontal: 'center' };
    const showClassCol = selectedClass === 'All Sections';
    const headerRow = showClassCol ? ['Rank', 'Class', 'Student Name', 'Grand Total', 'Progress %'] : ['Rank', 'Student Name', 'Grand Total', 'Progress %'];
    sessions.forEach(session => { activeSubject.papers.forEach((p: string) => headerRow.push(`${session} ${p}`)); });
    sheet.addRow(['']);
    const headerRowObj = sheet.addRow(headerRow);
    headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRowObj.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColorHex } }; cell.alignment = { horizontal: 'center' }; });
    const progColIndex = showClassCol ? 5 : 4;
    displayedStudents.forEach((student) => {
      const rank = showClassCol ? student.globalRank : student.classRank;
      const totalStr = `${student.total} / ${student.maxPossible}`;
      const rowData = showClassCol ? [rank, student.className, student.name, totalStr, student.progress] : [rank, student.name, totalStr, student.progress];
      sessions.forEach(session => {
        const entry = student.all_entries.find((e: any) => e.session_name === session) || {};
        activeSubject.papers.forEach((_: any, idx: number) => rowData.push(entry[`p${idx+1}`] || 0));
      });
      sheet.addRow(rowData);
    });
    sheet.addConditionalFormatting({ ref: `${sheet.getColumn(progColIndex).letter}4:${sheet.getColumn(progColIndex).letter}${3 + displayedStudents.length}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min', value: 0 }, { type: 'max', value: 100 }], color: { argb: themeColorHex }, gradient: false } as any] });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${teacher.name}_${activeSubject.name}.xlsx`);
  };

  // ================= RENDER: LOGIN =================
  if (!teacher) {
    const loginTheme = THEMES['emerald'];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: loginTheme.bg, padding: '20px' }}>
        <FloatingBackground lightColor={loginTheme.lightColor} onSymbolClick={handleSymbolClick} />
        {dialogueBox && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: loginTheme.color, color: 'white', padding: '30px', width: '90%', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 99999, fontWeight: 'bold', fontSize: '20px', textAlign: 'center', maxWidth: '500px', animation: 'popIn 0.3s ease-out forwards' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>💡</div>{dialogueBox}
            <button onClick={() => setDialogueBox(null)} style={{ display: 'block', margin: '20px auto 0', padding: '10px 25px', backgroundColor: 'white', color: loginTheme.color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>Awesome!</button>
          </div>
        )}
        <div style={{ backgroundColor: 'white', padding: '40px 20px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', width: '100%', maxWidth: '450px', textAlign: 'center', position: 'relative', zIndex: 10, borderTop: `8px solid ${loginTheme.color}` }}>
          <img src="/logo.png" alt="Baitussalam Logo" style={{ height: '70px', marginBottom: '20px', objectFit: 'contain' }} />
          <h1 style={{ color: loginTheme.color, fontSize: '28px', fontWeight: '900', margin: '0 0 5px 0' }}>Faculty Portal</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '30px' }}>Enter your credentials to access your dashboard.</p>
          {loginError && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', fontSize: '14px' }}>{loginError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Email Address</label><input type="text" placeholder="teacher@baitussalam.edu" value={email} onChange={e=>setEmail(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = loginTheme.color} onBlur={e => e.target.style.borderColor = '#e5e7eb'} required /></div>
            <div style={{ textAlign: 'left' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Password</label><input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = loginTheme.color} onBlur={e => e.target.style.borderColor = '#e5e7eb'} required /></div>
            <button type="submit" style={{ padding: '16px', backgroundColor: loginTheme.color, color: 'white', fontWeight: 'bold', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', border: 'none', marginTop: '10px' }}>Secure Login</button>
          </form>
        </div>
      </div>
    );
  }

  // ================= RENDER: DASHBOARD =================
  const themeKey = THEMES[teacher.theme] ? teacher.theme : 'emerald';
  const theme = THEMES[themeKey];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: `1px solid ${theme.lightColor}`, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 'bold', color: theme.color, margin: 0 }}>{payload[0].payload.fullName}</p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>Total Score: <strong style={{ color: '#111827' }}>{payload[0].value}</strong></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(15px, 3vw, 30px)', fontFamily: 'sans-serif', backgroundColor: theme.bg, transition: 'background 0.5s', position: 'relative' }}>
      <FloatingBackground lightColor={theme.lightColor} onSymbolClick={handleSymbolClick} />

      {dialogueBox && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: theme.color, color: 'white', padding: '30px', width: '90%', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 99999, fontWeight: 'bold', fontSize: '20px', textAlign: 'center', maxWidth: '500px', animation: 'popIn 0.3s ease-out forwards', pointerEvents: 'auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>💡</div>{dialogueBox}
          <button onClick={() => setDialogueBox(null)} style={{ display: 'block', margin: '20px auto 0', padding: '10px 25px', backgroundColor: 'white', color: theme.color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>Awesome!</button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>

        {/* --- RESPONSIVE HEADER: Groups Logo/Title left, User/Theme right --- */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', pointerEvents: 'auto', gap: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.png" alt="Baitussalam Logo" style={{ height: '60px', objectFit: 'contain' }} />
            <h1 style={{ color: theme.color, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', margin: '0' }}>{teacher.name}'s Portal</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ padding: '8px 16px', backgroundColor: theme.bg, color: theme.color, border: `2px solid ${theme.color}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎨 Theme <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {showThemePicker && (
                <div style={{ position: 'absolute', top: '120%', right: 0, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '220px', zIndex: 100, display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', border: `1px solid #e5e7eb` }}>
                  {THEME_KEYS.map((tk) => (<button key={tk} onClick={() => { handleThemeChange(tk); setShowThemePicker(false); }} title={`Change theme to ${tk}`} style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: THEMES[tk].color, cursor: 'pointer', border: theme.key === tk ? '3px solid #111827' : '2px solid transparent', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />))}
                </div>
              )}
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '14px' }}>Logout</button>
          </div>

        </div>

        {/* --- CONTROLS AREA --- */}
        <div style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <select value={activeSubject?.id || ''} onChange={(e) => setActiveSubject(subjects.find(s => s.id === e.target.value))} style={{ padding: '12px 20px', borderRadius: '10px', border: `2px solid ${theme.color}`, fontWeight: 'bold', fontSize: '16px', outline: 'none', cursor: 'pointer', flex: '1 1 200px' }}>
            {subjects.length === 0 && <option>No Subjects Yet</option>}
            {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name} ({sub.start_year}-{sub.end_year})</option>)}
          </select>

          {activeSubject && (
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} style={{ padding: '12px 20px', borderRadius: '10px', border: `2px solid ${theme.lightColor}`, fontWeight: 'bold', outline: 'none', cursor: 'pointer', flex: '1 1 150px' }}>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={openAddSubject} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 auto', whiteSpace: 'nowrap' }}>+ Add Subject</button>
            <button onClick={exportToExcel} style={{ backgroundColor: '#4f46e5', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 auto', whiteSpace: 'nowrap' }}>📊 Export Data</button>
            {activeSubject && <button onClick={handleDeleteSubject} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 auto', whiteSpace: 'nowrap' }}>🗑️ Delete Subject</button>}
          </div>
        </div>

        {activeSubject && (
          <>
            {/* CLASS TABS */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px', pointerEvents: 'auto' }}>
              {['All Sections', ...activeSubject.classes].map((cls) => (<button key={cls} onClick={() => setSelectedClass(cls)} style={{ padding: '10px 25px', borderRadius: '8px', border: `2px solid ${theme.color}`, backgroundColor: selectedClass === cls ? theme.color : 'white', color: selectedClass === cls ? 'white' : theme.color, fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', flex: '1 1 auto', maxWidth: '200px' }}>{cls}</button>))}
            </div>

            {/* --- CHART SECTION --- */}
            {top10.length > 0 && (
              <div style={{ maxWidth: '1200px', margin: '0 auto 30px auto', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: theme.color, fontSize: '20px' }}>Top Performers: {selectedClass}</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setChartType('bar')} title="Bar Chart" style={{ padding: '8px 12px', borderRadius: '6px', border: chartType === 'bar' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'bar' ? theme.bg : 'white', cursor: 'pointer' }}>📊</button>
                    <button onClick={() => setChartType('line')} title="Line Chart" style={{ padding: '8px 12px', borderRadius: '6px', border: chartType === 'line' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'line' ? theme.bg : 'white', cursor: 'pointer' }}>📈</button>
                    <button onClick={() => setChartType('pie')} title="Pie Chart" style={{ padding: '8px 12px', borderRadius: '6px', border: chartType === 'pie' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'pie' ? theme.bg : 'white', cursor: 'pointer' }}>🥧</button>
                  </div>
                </div>

                <div style={{ height: '300px', width: '100%', minWidth: '250px' }}>
                  <ResponsiveContainer>
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: theme.color, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: theme.color, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.bg }} />
                        <Bar dataKey="score" fill={theme.lightColor} radius={[4, 4, 0, 0]} animationDuration={1000} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: theme.color, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: theme.color, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 'dataMax + 50']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="score" stroke={theme.color} strokeWidth={3} dot={{ fill: theme.color, r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} />
                      </LineChart>
                    ) : (
                      <PieChart>
                         <Tooltip content={<CustomTooltip />} />
                         <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} formatter={(value, entry: any) => <span style={{ color: '#374151', fontWeight: 'bold' }}>{entry.payload.fullName}</span>} />
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="score" animationDuration={1000}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* --- MAIN TABLE (WITH HORIZONTAL SCROLL) --- */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', pointerEvents: 'auto' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.color, color: 'white' }}>
                      <th style={{ padding: '15px 20px', whiteSpace: 'nowrap' }}>Rank</th>
                      <th style={{ padding: '15px 20px', whiteSpace: 'nowrap' }}>Student Name</th>
                      {activeSubject.papers?.map((pName: string, i: number) => (<th key={i} style={{ padding: '15px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{pName} <br/><span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.8 }}>Max: {activeSubject.max_marks?.[i] || 75}</span></th>))}
                      <th style={{ padding: '15px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>Total Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((student) => {
                      const rank = selectedClass === 'All Sections' ? student.globalRank : student.classRank;
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                          <td style={{ padding: '15px 20px', fontWeight: 'bold', color: theme.lightColor, fontSize: '18px' }}><Crown rank={rank} themeColor={theme.color} /> #{rank}</td>
                          <td style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button onClick={() => setSelectedStudent(student)} style={{ background: 'none', border: 'none', color: theme.color, textDecoration: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: 0, whiteSpace: 'nowrap' }}>{student.name}</button>
                              {selectedClass === 'All Sections' && <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '12px', color: '#4b5563', whiteSpace: 'nowrap' }}>{student.className}</span>}
                              <button onClick={() => handleDeleteStudent(student.id, student.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5, marginLeft: '5px' }} title={`Delete ${student.name}`}>🗑️</button>
                            </div>
                          </td>
                          {activeSubject.papers?.map((_: any, i: number) => {
                            const maxM = activeSubject.max_marks ? activeSubject.max_marks[i] : 75;
                            return (<td key={i} style={{ padding: '10px', textAlign: 'center' }}><MarkInput studentId={student.id} session={selectedSession} subjectId={activeSubject.id} paper={`p${i+1}`} maxMark={maxM} initialValue={student.currentEntry[`p${i+1}`]} themeColor={theme.color} onUpdate={fetchClassData} /></td>);
                          })}
                          <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                              <span style={{ fontWeight: '900', fontSize: '18px', color: '#111827' }}><span style={{ color: theme.color }}>{student.total}</span> <span style={{ fontSize: '12px', color: '#6b7280' }}>/ {student.maxPossible}</span></span>
                              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>Prog:</span><div style={{ flex: 1, backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${student.progress}%`, backgroundColor: theme.color, height: '100%' }}></div></div><span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '30px' }}>{student.progress}%</span></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedClass !== 'All Sections' && (<div style={{ padding: '20px', backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', pointerEvents: 'auto' }}><AddStudent classId={selectedClass} onAdded={fetchClassData} /></div>)}
            </div>
          </>
        )}
      </div>

      {showAddSubject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, pointerEvents: 'auto', padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: theme.color, margin: '0 0 20px 0', fontSize: '24px' }}>Create New Subject</h2>
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Subject Name:</p><input placeholder="e.g. A-Level Math" value={newSubName} onChange={e=>setNewSubName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Custom Papers (Comma Separated):</p><input placeholder="e.g. P1, M1, P2, S1" value={newSubPapersStr} onChange={e=>setNewSubPapersStr(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Max Marks Per Paper (Comma Separated):</p><input placeholder="e.g. 75, 50, 75, 50" value={newSubMaxMarksStr} onChange={e=>setNewSubMaxMarksStr(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Past Paper Range:</p><div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}><input type="number" value={newSubStart} onChange={e=>setNewSubStart(Number(e.target.value))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none' }} /><span style={{ alignSelf: 'center', fontWeight: 'bold', color: '#6b7280' }}>to</span><input type="number" value={newSubEnd} onChange={e=>setNewSubEnd(Number(e.target.value))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none' }} /></div>
            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Select Classes:</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '25px' }}>{availableClassesList.map(c => (<label key={c} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}><input type="checkbox" checked={newSubClasses.includes(c)} onChange={(e) => { if (e.target.checked) setNewSubClasses([...newSubClasses, c]); else setNewSubClasses(newSubClasses.filter(x => x !== c)); }} style={{ accentColor: theme.color }} /> {c}</label>))}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><button onClick={() => setShowAddSubject(false)} style={{ padding: '10px 20px', border: 'none', background: '#f3f4f6', color: '#374151', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button><button onClick={handleSaveSubject} style={{ padding: '10px 20px', backgroundColor: theme.color, color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save Subject</button></div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '15px', pointerEvents: 'auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '1000px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '20px', backgroundColor: theme.color, color: 'white', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{selectedStudent.name}</h2><p style={{ margin: '5px 0 0 0', color: theme.bg, fontSize: '14px', fontWeight: 'bold' }}>Class {selectedStudent.className} | {selectedClass === 'All Sections' ? 'Global Rank' : 'Class Rank'}: #{selectedClass === 'All Sections' ? selectedStudent.globalRank : selectedStudent.classRank}</p></div>
              <div style={{ textAlign: 'right' }}><h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Instructor: {teacher.name}</h3><button onClick={() => setSelectedStudent(null)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', color: 'white', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background 0.2s' }}>Close ✕</button></div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderBottom: '2px solid #d1d5db', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}><strong style={{ fontSize: '16px', color: theme.color }}>Progress Report:</strong><input type="range" min="0" max="100" value={selectedStudent.progress} onChange={(e) => handleProgressChange(selectedStudent.id, Number(e.target.value))} style={{ flex: 1, minWidth: '150px', cursor: 'pointer', accentColor: theme.color }} /><span style={{ fontSize: '24px', fontWeight: '900', color: theme.color, minWidth: '60px', textAlign: 'right' }}>{selectedStudent.progress}%</span></div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '600px' }}>
                  <thead><tr style={{ backgroundColor: '#e5e7eb', color: '#374151' }}><th style={{ padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 'bold' }}>Exam Session</th>{activeSubject.papers?.map((pName: string, i: number) => <th key={i} style={{ padding: '12px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{pName}</th>)}</tr></thead>
                  <tbody>{sessions.map(session => { const entry = selectedStudent.all_entries?.find((e: any) => e.session_name === session) || {}; let hasMarks = false; activeSubject.papers?.forEach((_: any, i: number) => { if (entry[`p${i+1}`] > 0) hasMarks = true; }); return (<tr key={session} style={{ backgroundColor: hasMarks ? theme.bg : 'white' }}><td style={{ padding: '12px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: hasMarks ? 'bold' : 'normal', color: hasMarks ? theme.color : 'black' }}>{session}</td>{activeSubject.papers?.map((_: any, i: number) => { const maxM = activeSubject.max_marks ? activeSubject.max_marks[i] : 75; return (<td key={i} style={{ padding: '8px', border: '1px solid #d1d5db' }}><MarkInput studentId={selectedStudent.id} session={session} subjectId={activeSubject.id} paper={`p${i+1}`} maxMark={maxM} initialValue={entry[`p${i+1}`]} themeColor={theme.color} onUpdate={fetchClassData} /></td>); })}</tr>); })}</tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: '15px 20px', backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', textAlign: 'right' }}><button onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}>🗑️ Delete Student</button></div>
          </div>
        </div>
      )}
    </div>
  );
}