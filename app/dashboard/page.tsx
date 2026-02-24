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

const availableClassesList = ['Level 3', 'Level 4', 'A1', 'A2', 'A3'];

const getUserTheme = (email: string | undefined) => {
  if (!email) return THEMES['emerald'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash += email.charCodeAt(i);
  return THEMES[THEME_KEYS[hash % THEME_KEYS.length]];
};

const getProgressColor = (val: number) => {
  if (val >= 80) return '#10b981';
  if (val >= 50) return '#f59e0b';
  return '#ef4444';
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

export default function Dashboard() {
  const [teacher, setTeacher] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('All Sections');
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
    } else {
      setSubjects([]);
      setActiveSubject(null);
    }
  }

 async function fetchClassData() {
    if (!activeSubject) return;

    const { data: classesData } = await supabase.from('classes').select('id, name');
    const classMap: Record<string, string> = {};
    classesData?.forEach(c => { classMap[c.id] = c.name; });

    const { data: progData } = await supabase.from('subject_progress').select('student_id, progress').eq('subject_id', activeSubject.id);
    const progMap: Record<string, any> = {};

    progData?.forEach((p: any) => {
      let parsed = {};
      try {
        if (typeof p.progress === 'string') {
          parsed = JSON.parse(p.progress);
        } else if (typeof p.progress === 'object' && p.progress !== null) {
          parsed = p.progress;
        } else if (typeof p.progress === 'number') {
          parsed = { 0: p.progress };
        }
      } catch (e) {
        console.error("Failed to parse progress for student", p.student_id);
      }
      progMap[p.student_id] = parsed;
    });

    const { data } = await supabase
      .from('students')
      .select('id, name, class_id, exam_entries(p1, p2, p3, p4, session_name, subject_id)')
      .eq('subject_id', activeSubject.id);

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

      // LOGIC FIX: Keep exact percentage for sorting, rounded for display
      const exactPercentage = maxPossible > 0 ? (grandTotal / maxPossible) * 100 : 0;
      const displayPercentage = Math.round(exactPercentage);

      return {
        ...s, className, maxPossible,
        total: grandTotal,
        percentage: displayPercentage,
        exactPercentage: exactPercentage, // Hidden exact value to break ties
        progress: progMap[s.id] || {},
        all_entries: currentSubjectEntries,
        globalRank: 0,
        classRank: 0
      };
    });

    // Sort by EXACT percentage to break 89% vs 88.75% ties
    processed.sort((a, b) => b.exactPercentage - a.exactPercentage);

    let gRank = 1;
    processed.forEach((s, i) => {
      // Rank updates only if the exact percentage is strictly less
      if (i > 0 && s.exactPercentage < processed[i - 1].exactPercentage) gRank = i + 1;
      s.globalRank = gRank;
    });

    activeSubject.classes.forEach((cls: string) => {
      const clsStudents = processed.filter(s => s.className === cls);
      let cRank = 1;
      clsStudents.forEach((s, i) => {
        if (i > 0 && s.exactPercentage < clsStudents[i - 1].exactPercentage) cRank = i + 1;
        s.classRank = cRank;
      });
    });

    setStudents(processed);
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

  const handleProgressChange = async (studentId: string, paperIndex: number, newProgress: number) => {
    const student = students.find(s => s.id === studentId);
    const currentProg = student?.progress || {};
    const updatedProg = { ...currentProg, [paperIndex]: newProgress };

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, progress: updatedProg } : s));
    if (selectedStudent?.id === studentId) {
      setSelectedStudent({ ...selectedStudent, progress: updatedProg });
    }

    // LOGIC FIX: Robust DB checking to prevent onConflict silent failures
    const { data: existing } = await supabase
      .from('subject_progress')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', activeSubject.id)
      .single();

    if (existing) {
      await supabase.from('subject_progress').update({ progress: updatedProg }).eq('id', existing.id);
    } else {
      await supabase.from('subject_progress').insert({ student_id: studentId, subject_id: activeSubject.id, progress: updatedProg });
    }
  };

  const sessions = useMemo(() => {
    if (!activeSubject) return [];
    const arr = [];
    for (let y = activeSubject.end_year; y >= activeSubject.start_year; y--) { arr.push(`May/June ${y}`); arr.push(`Oct/Nov ${y}`); }
    return arr;
  }, [activeSubject]);

  useEffect(() => { if (activeSubject) fetchClassData(); }, [activeSubject, selectedClass]);

  const displayedStudents = selectedClass === 'All Sections' ? students : students.filter(s => s.className === selectedClass);
  const top10 = displayedStudents.slice(0, 10);

  // CHART LOGIC FIX: Feeding calculated Percentage to charts
  const chartData = top10.map(s => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    score: s.percentage, // Graph specifically tracks the accurate %
    totalMarks: s.total,
    maxMarks: s.maxPossible
  }));

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
    const headerRow = showClassCol ? ['Rank', 'Class', 'Student Name', 'Grand Total'] : ['Rank', 'Student Name', 'Grand Total'];
    activeSubject.papers.forEach((p: string) => headerRow.push(`${p} Progress %`));
    sessions.forEach(session => { activeSubject.papers.forEach((p: string) => headerRow.push(`${session} ${p}`)); });

    sheet.addRow(['']);
    const headerRowObj = sheet.addRow(headerRow);
    headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRowObj.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColorHex } }; cell.alignment = { horizontal: 'center' }; });

    displayedStudents.forEach((student) => {
      const rank = showClassCol ? student.globalRank : student.classRank;
      const totalStr = `${student.total} / ${student.maxPossible} (${student.percentage}%)`;
      const rowData = showClassCol ? [rank, student.className, student.name, totalStr] : [rank, student.name, totalStr];

      activeSubject.papers.forEach((_: any, idx: number) => rowData.push(student.progress[idx] || 0));
      sessions.forEach(session => {
        const entry = student.all_entries.find((e: any) => e.session_name === session) || {};
        activeSubject.papers.forEach((_: any, idx: number) => rowData.push(entry[`p${idx+1}`] || 0));
      });
      sheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${teacher.name}_${activeSubject.name}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSubject || selectedClass === 'All Sections') return;

    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('name', selectedClass)
        .single();

      if (classError || !classData) {
        alert(`Error finding database ID for class: ${selectedClass}.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const sheet = workbook.worksheets[0];
          const studentsToInsert: any[] = [];

          sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              const nameValue = row.getCell(1).text?.trim();
              if (nameValue && nameValue !== '') {
                studentsToInsert.push({ name: nameValue, subject_id: activeSubject.id, class_id: classData.id });
              }
            }
          });

          if (studentsToInsert.length > 0) {
            const { error } = await supabase.from('students').insert(studentsToInsert);
            if (error) {
              console.error(error);
              alert("Database Error: Failed to import students.");
            } else {
              alert(`Successfully imported ${studentsToInsert.length} students to ${selectedClass}!`);
              fetchClassData();
            }
          } else {
            alert("No students found. Ensure names are in the first column and row 1 is a header.");
          }
        } catch (err) {
          console.error(err);
          alert("Failed to parse the Excel file.");
        }
        e.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred during import.");
    }
  };

  if (!teacher) {
    const loginTheme = THEMES['emerald'];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: loginTheme.bg }}>
        <FloatingBackground lightColor={loginTheme.lightColor} onSymbolClick={handleSymbolClick} />
        <div style={{ backgroundColor: 'white', padding: '50px 40px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', width: '100%', maxWidth: '450px', textAlign: 'center', position: 'relative', zIndex: 10, borderTop: `8px solid ${loginTheme.color}` }}>
          <img src="/logo.png" alt="Baitussalam Logo" style={{ height: '90px', marginBottom: '25px', objectFit: 'contain' }} />
          <h1 style={{ color: loginTheme.color, fontSize: '32px', fontWeight: '900', margin: '0 0 5px 0' }}>Faculty Portal</h1>
          <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '30px' }}>Enter your credentials to access your dashboard.</p>
          {loginError && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', fontSize: '14px' }}>{loginError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Email Address</label>
              <input type="text" placeholder="teacher@baitussalam.edu" value={email} onChange={e=>setEmail(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = loginTheme.color} onBlur={e => e.target.style.borderColor = '#e5e7eb'} required />
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = loginTheme.color} onBlur={e => e.target.style.borderColor = '#e5e7eb'} required />
            </div>
            <button type="submit" style={{ padding: '16px', backgroundColor: loginTheme.color, color: 'white', fontWeight: 'bold', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', border: 'none', marginTop: '10px' }}>Secure Login</button>
          </form>
        </div>
      </div>
    );
  }

  const themeKey = THEMES[teacher.theme] ? teacher.theme : 'emerald';
  const theme = THEMES[themeKey];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: `1px solid ${theme.lightColor}`, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 'bold', color: theme.color, margin: 0 }}>{data.fullName}</p>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Performance: <strong style={{ color: '#111827' }}>{data.score}%</strong></p>
          <p style={{ color: '#888', margin: '2px 0 0 0', fontSize: '12px' }}>Score: {data.totalMarks} / {data.maxMarks}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', padding: '30px', fontFamily: 'sans-serif', backgroundColor: theme.bg, transition: 'background 0.5s', position: 'relative' }}>
      <FloatingBackground lightColor={theme.lightColor} onSymbolClick={handleSymbolClick} />
      {dialogueBox && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: theme.color, color: 'white', padding: '30px 40px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 99999, fontWeight: 'bold', fontSize: '24px', textAlign: 'center', maxWidth: '600px', animation: 'popIn 0.3s ease-out forwards', pointerEvents: 'auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>💡</div>
          {dialogueBox}
          <button onClick={() => setDialogueBox(null)} style={{ display: 'block', margin: '20px auto 0', padding: '10px 25px', backgroundColor: 'white', color: theme.color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>Awesome!</button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>

        <div style={{ position: 'absolute', top: '0px', right: '0px', textAlign: 'right', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h3 style={{ margin: 0, color: theme.color, fontSize: '18px' }}>Welcome, {teacher.name}</h3>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Logout Portal</button>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ padding: '8px 16px', backgroundColor: 'white', color: theme.color, border: `2px solid ${theme.color}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>🎨 Theme <span style={{ fontSize: '10px' }}>▼</span></button>
            {showThemePicker && (
              <div style={{ position: 'absolute', top: '120%', right: 0, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '220px', zIndex: 100, display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', border: `1px solid #e5e7eb` }}>
                {THEME_KEYS.map((tk) => <button key={tk} onClick={() => { handleThemeChange(tk); setShowThemePicker(false); }} title={`Change theme to ${tk}`} style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: THEMES[tk].color, cursor: 'pointer', border: theme.key === tk ? '3px solid #111827' : '2px solid transparent', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />)}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px', pointerEvents: 'auto' }}>
          <img src="/logo.png" alt="Baitussalam Logo" style={{ height: '140px', marginBottom: '15px', objectFit: 'contain' }} />
          <h1 style={{ color: theme.color, fontSize: '42px', fontWeight: '900', margin: '0' }}>{teacher.name}'s Portal</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
            <select value={activeSubject?.id || ''} onChange={(e) => setActiveSubject(subjects.find(s => s.id === e.target.value))} style={{ padding: '10px 20px', borderRadius: '10px', border: `2px solid ${theme.color}`, fontWeight: 'bold', fontSize: '18px', outline: 'none', cursor: 'pointer' }}>{subjects.length === 0 && <option>No Subjects Yet</option>}{subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name} ({sub.start_year}-{sub.end_year})</option>)}</select>
            <button onClick={openAddSubject} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)' }}>+ Add Subject</button>
            <button onClick={exportToExcel} style={{ backgroundColor: '#4f46e5', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)' }}>📊 Export Data</button>
            {activeSubject && <button onClick={handleDeleteSubject} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)' }}>🗑️ Delete Subject</button>}
          </div>
        </div>

        {activeSubject && (
          <>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '40px', pointerEvents: 'auto' }}>
              {['All Sections', ...activeSubject.classes].map((cls) => (<button key={cls} onClick={() => setSelectedClass(cls)} style={{ padding: '12px 35px', borderRadius: '8px', border: `2px solid ${theme.color}`, backgroundColor: selectedClass === cls ? theme.color : 'white', color: selectedClass === cls ? 'white' : theme.color, fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedClass === cls ? `0 4px 10px ${theme.color}40` : 'none' }}>{cls}</button>))}
            </div>

            {top10.length > 0 && (
              <div style={{ maxWidth: '1200px', margin: '0 auto 40px auto', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: theme.color }}>Top Performers ({selectedClass})</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setChartType('bar')} title="Bar Chart" style={{ padding: '8px', borderRadius: '6px', border: chartType === 'bar' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'bar' ? theme.bg : 'white', cursor: 'pointer', color: theme.color }}>📊</button>
                    <button onClick={() => setChartType('line')} title="Line Chart" style={{ padding: '8px', borderRadius: '6px', border: chartType === 'line' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'line' ? theme.bg : 'white', cursor: 'pointer', color: theme.color }}>📈</button>
                    <button onClick={() => setChartType('pie')} title="Pie Chart" style={{ padding: '8px', borderRadius: '6px', border: chartType === 'pie' ? `2px solid ${theme.color}` : '1px solid #e5e7eb', backgroundColor: chartType === 'pie' ? theme.bg : 'white', cursor: 'pointer', color: theme.color }}>🥧</button>
                  </div>
                </div>

                <div style={{ height: '350px', width: '100%' }}>
                  <ResponsiveContainer>
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: theme.color }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: theme.color }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.bg }} />
                        <Bar dataKey="score" fill={theme.lightColor} radius={[4, 4, 0, 0]} animationDuration={1000} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: theme.color }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: theme.color }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="score" stroke={theme.color} strokeWidth={3} dot={{ fill: theme.color, r: 6 }} activeDot={{ r: 8 }} animationDuration={1000} />
                      </LineChart>
                    ) : (
                      <PieChart>
                         <Tooltip content={<CustomTooltip />} />
                         <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value, entry: any) => <span style={{ color: theme.color, fontWeight: 'bold' }}>{entry.payload.fullName}</span>} />
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="score" animationDuration={1000}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', pointerEvents: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.color, color: 'white' }}>
                    <th style={{ padding: '20px' }}>Rank</th>
                    <th style={{ padding: '20px' }}>Student Name</th>
                    {activeSubject.papers?.map((pName: string, i: number) => (<th key={i} style={{ padding: '20px', textAlign: 'center' }}>{pName} <br/><span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.8 }}>Max: {activeSubject.max_marks?.[i] || 75}</span></th>))}
                    <th style={{ padding: '20px', textAlign: 'right' }}>Total (Obtained / Max)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((student) => {
                    const rank = selectedClass === 'All Sections' ? student.globalRank : student.classRank;
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                        <td style={{ padding: '20px', fontWeight: 'bold', color: theme.lightColor, fontSize: '22px' }}><Crown rank={rank} themeColor={theme.color} /> #{rank}</td>
                        <td style={{ padding: '20px', fontWeight: 'bold', fontSize: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => setSelectedStudent(student)} style={{ background: 'none', border: 'none', color: theme.color, textDecoration: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', padding: 0 }}>{student.name}</button>
                            {selectedClass === 'All Sections' && <span style={{ fontSize: '12px', backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', color: '#4b5563' }}>{student.className}</span>}
                            <button onClick={() => handleDeleteStudent(student.id, student.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.5, marginLeft: '5px' }} title={`Delete ${student.name}`}>🗑️</button>
                          </div>
                        </td>
                        {activeSubject.papers?.map((_: any, i: number) => {
                          const progVal = student.progress[i] || 0;
                          return (
                            <td key={i} style={{ padding: '20px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progVal}%`, backgroundColor: getProgressColor(progVal), height: '100%', transition: 'width 0.3s ease, background-color 0.3s ease' }} />
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px', color: getProgressColor(progVal) }}>{progVal}%</div>
                            </td>
                          );
                        })}
                        <td style={{ padding: '20px', textAlign: 'right' }}>
                          <span style={{ fontWeight: '900', fontSize: '20px', color: '#111827' }}><span style={{ color: theme.color }}>{student.total}</span> <span style={{ fontSize: '14px', color: '#6b7280' }}>/ {student.maxPossible}</span></span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {selectedClass !== 'All Sections' && (
                <div style={{ padding: '30px', backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', pointerEvents: 'auto', display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <AddStudent
                     classId={selectedClass}
                     subjectId={activeSubject.id}
                     onAdded={fetchClassData}
                     customText="Add Student"
                     buttonStyle={{ background: 'linear-gradient(45deg, #FFD700, #FFA500)', boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)', color: 'black', border: 'none', padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                  />
                  <label style={{ backgroundColor: '#10b981', color: 'white', padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center' }}>
                    📥 Import from Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
                  </label>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddSubject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, pointerEvents: 'auto' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px', pointerEvents: 'auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '25px 30px', backgroundColor: theme.color, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2 style={{ margin: 0, fontSize: '32px', fontWeight: '900' }}>{selectedStudent.name}</h2><p style={{ margin: '5px 0 0 0', color: theme.bg, fontSize: '16px', fontWeight: 'bold' }}>Class {selectedStudent.className} | {selectedClass === 'All Sections' ? 'Global Rank' : 'Class Rank'}: #{selectedClass === 'All Sections' ? selectedStudent.globalRank : selectedStudent.classRank}</p></div>
              <div style={{ textAlign: 'right' }}><h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Instructor: {teacher.name}</h3><button onClick={() => setSelectedStudent(null)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background 0.2s' }}>Close ✕</button></div>
            </div>

            <div style={{ padding: '25px 30px', backgroundColor: '#f0fdf4', borderBottom: '2px solid #d1d5db', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {activeSubject.papers.map((pName: string, i: number) => {
                const progVal = selectedStudent.progress[i] || 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <strong style={{ fontSize: '18px', color: theme.color, minWidth: '150px' }}>{pName} Syllabus:</strong>
                    <input type="range" min="0" max="100" value={progVal} onChange={(e) => handleProgressChange(selectedStudent.id, i, Number(e.target.value))} style={{ flex: 1, cursor: 'pointer', accentColor: getProgressColor(progVal) }} />
                    <span style={{ fontSize: '24px', fontWeight: '900', color: getProgressColor(progVal), minWidth: '70px', textAlign: 'right' }}>{progVal}%</span>
                  </div>
                );
              })}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead><tr style={{ backgroundColor: '#e5e7eb', color: '#374151' }}><th style={{ padding: '15px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: 'bold' }}>Exam Session</th>{activeSubject.papers?.map((pName: string, i: number) => <th key={i} style={{ padding: '15px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{pName}</th>)}</tr></thead>
                <tbody>{sessions.map(session => { const entry = selectedStudent.all_entries?.find((e: any) => e.session_name === session) || {}; let hasMarks = false; activeSubject.papers?.forEach((_: any, i: number) => { if (entry[`p${i+1}`] > 0) hasMarks = true; }); return (<tr key={session} style={{ backgroundColor: hasMarks ? theme.bg : 'white' }}><td style={{ padding: '15px', textAlign: 'left', border: '1px solid #d1d5db', fontWeight: hasMarks ? 'bold' : 'normal', color: hasMarks ? theme.color : 'black' }}>{session}</td>{activeSubject.papers?.map((_: any, i: number) => { const maxM = activeSubject.max_marks ? activeSubject.max_marks[i] : 75; return (<td key={i} style={{ padding: '10px', border: '1px solid #d1d5db' }}><MarkInput studentId={selectedStudent.id} session={session} subjectId={activeSubject.id} paper={`p${i+1}`} maxMark={maxM} initialValue={entry[`p${i+1}`]} themeColor={theme.color} onUpdate={fetchClassData} /></td>); })}</tr>); })}</tbody>
              </table>
            </div>
            <div style={{ padding: '20px 30px', backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', textAlign: 'right' }}><button onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}>🗑️ Delete Student Record</button></div>
          </div>
        </div>
      )}
    </div>
  );
}