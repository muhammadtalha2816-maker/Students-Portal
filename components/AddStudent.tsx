'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as ExcelJS from 'exceljs';

export default function AddStudent({ classId, onAdded }: any) {
  const [name, setName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FAIL-SAFE CLASS MATCHER
  const getOrCreateClass = async (className: string) => {
    // Try to find the class
    const { data: existingClass } = await supabase.from('classes').select('id').ilike('name', className).single();
    if (existingClass) return existingClass;

    // If it doesn't exist, automatically create it!
    const { data: newClass, error } = await supabase.from('classes').insert({ name: className }).select('id').single();
    if (error) { console.error("Could not auto-create class:", error); return null; }
    return newClass;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const classData = await getOrCreateClass(classId);
    if (classData) {
      const { error } = await supabase.from('students').insert({ name, class_id: classData.id });
      if (!error) { setName(''); onAdded(); }
      else { alert("Error adding student."); }
    } else {
      alert("Critical Error: Database refused to verify or create the class.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const classData = await getOrCreateClass(classId);
      if (!classData) throw new Error("Class verification failed.");

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      const newStudents: any[] = [];
      worksheet.eachRow((row) => {
        const studentName = row.getCell(1).value?.toString().trim();
        if (studentName && studentName.toLowerCase() !== 'name' && studentName.toLowerCase() !== 'student name') {
          newStudents.push({ name: studentName, class_id: classData.id });
        }
      });

      if (newStudents.length > 0) {
        const { error } = await supabase.from('students').insert(newStudents);
        if (error) throw error;
        alert(`✅ Imported ${newStudents.length} students into ${classId}!`);
        onAdded();
      } else {
        alert("No valid names found in Column A.");
      }
    } catch (err) { alert("Error processing import."); }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flex: 1, minWidth: '300px' }}>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Type new student name here..."
          style={{ flex: 1, padding: '12px 20px', border: '2px solid #d1d5db', borderRadius: '10px', fontSize: '16px', outline: 'none' }}
        />
        <button type="submit" style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '12px 35px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)' }}>
          + Add Student
        </button>
      </form>
      <div style={{ width: '2px', height: '40px', backgroundColor: '#d1d5db', margin: '0 10px' }}></div>
      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} style={{ backgroundColor: isImporting ? '#9ca3af' : '#10b981', color: 'white', padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: isImporting ? 'wait' : 'pointer' }}>
        {isImporting ? '⏳ Importing...' : '📥 Import Excel Sheet'}
      </button>
    </div>
  );
}