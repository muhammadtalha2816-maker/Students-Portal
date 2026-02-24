'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddStudent({ classId, subjectId, onAdded }: any) {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { data: classData } = await supabase.from('classes').select('id').eq('name', classId).single();

    if (classData) {
      // Logic: Create a new student record specifically for THIS subject_id
      const { error } = await supabase.from('students').insert({
        name: name,
        class_id: classData.id,
        subject_id: subjectId // Crucial: Student is now tied to this subject instance
      });

      if (!error) { setName(''); onAdded(); }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px' }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter student name for this subject..."
        style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }}
      />
      <button type="submit" style={{ padding: '15px 30px', backgroundColor: '#064e3b', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none' }}>+ Add to My List</button>
    </form>
  );
}
