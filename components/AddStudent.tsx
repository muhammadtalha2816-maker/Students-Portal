'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as ExcelJS from 'exceljs';

export default function AddStudent({ classId, onAdded }: any) {
  const [name, setName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to ensure the class exists in the DB
  const getOrCreateClass = async (className: string) => {
    const { data: existingClass } = await supabase.from('classes').select('id').ilike('name', className).single();
    if (existingClass) return existingClass;

    const { data: newClass, error } = await supabase.from('classes').insert({ name: className }).select('id').single();
    if (error) return null;
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
        if (studentName && !['name', 'student name'].includes(studentName.toLowerCase())) {
          newStudents.push({ name: studentName, class_id: classData.id });
        }
      });

      if (newStudents.length > 0) {
        const { error } = await supabase.from('students').insert(newStudents);
        if (error) throw error;
        alert(`✅ Imported ${newStudents.length} students!`);
        onAdded();
      }
    } catch (err) { alert("Import failed."); }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Input Section */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student Full Name..."
            style={{
              flex: '1 1 250px',
              padding: '14px 20px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            style={{
              flex: '1 1 120px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)'
            }}
          >
            + Add Student
          </button>
        </div>
      </form>

      {/* Divider for Mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
      </div>

      {/* Excel Section */}
      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        style={{
          width: '100%',
          backgroundColor: isImporting ? '#9ca3af' : '#10b981',
          color: 'white',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: isImporting ? 'wait' : 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        {isImporting ? '⏳ Processing...' : '📥 Bulk Import (Excel)'}
      </button>
    </div>
  );
}