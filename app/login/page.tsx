'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Your supabase client
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-6">Sir Anique's Portal</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" placeholder="Email"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Password"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}