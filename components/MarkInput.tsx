'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MarkInput({ studentId, session, subjectId, paper, maxMark = 75, initialValue, themeColor = '#475569', onUpdate }: any) {
  // 1. Strictly catch undefined/null values on the first render
  const [val, setVal] = useState<string | number>(
    initialValue !== undefined && initialValue !== null ? initialValue : ''
  );

  // 2. Strictly catch undefined/null values when the database updates
  useEffect(() => {
    setVal(initialValue !== undefined && initialValue !== null ? initialValue : '');
  }, [initialValue]);

  const saveMark = async () => {
    const numVal = val === '' ? 0 : Number(val);

    if (numVal < 0 || numVal > maxMark) {
      alert(`Max marks for this paper is ${maxMark}!`);
      setVal(initialValue !== undefined && initialValue !== null ? initialValue : '');
      return;
    }

    const { error } = await supabase
      .from('exam_entries')
      .upsert(
        { student_id: studentId, session_name: session, subject_id: subjectId, [paper]: numVal },
        { onConflict: 'student_id, session_name, subject_id' }
      );

    if (!error) onUpdate();
  };

  return (
    <input
      type="number"
      // 3. THE MAGIC FIX: The ?? operator guarantees it never passes 'undefined' to the HTML input
      value={val ?? ''}
      placeholder="0"
      onChange={(e) => setVal(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={saveMark}
      style={{
        width: '70px',
        padding: '10px',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#111827',
        backgroundColor: '#ffffff',
        outline: 'none',
        transition: 'border 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
    />
  );
}