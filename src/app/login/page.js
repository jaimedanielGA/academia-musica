'use client';

import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, User, AlertCircle, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const clean = username.trim().toLowerCase().replace(/\s+/g, '');
    const loginEmail = clean === 'profesor' ? 'profesor@academia.com' : `${clean}@academia.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.trim()
    });

    if (error) {
      setErrorMsg('Usuario o contraseña incorrectos.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <header className="mb-6">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Aula Virtual</span>
          <h1 className="text-2xl font-bold text-white mt-1">Iniciar Sesión</h1>
          <p className="text-slate-400 text-xs mt-1">Ingresa tu cuenta asignada.</p>
        </header>

        {errorMsg && (
          <div className="mb-5 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Usuario</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3 text-slate-500" />
              <input 
                type="text" 
                required
                placeholder="profesor o nombre de alumno"
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Contraseña</label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 absolute left-3 text-slate-500" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Accediendo...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}