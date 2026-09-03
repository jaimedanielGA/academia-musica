'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../supabaseClient';
import { ArrowLeft, Lock, Play, Music, CheckCircle2 } from 'lucide-react';

export default function InstrumentRoutePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;

  const [instrument, setInstrument] = useState(null);
  const [sections, setSections] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Detectar usuario (Profesor vía Auth o Alumno vía localStorage)
      let userId = null;
      let isAdmin = false;

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === 'profesor@academia.com') {
        userId = user.id;
        isAdmin = true;
        setCurrentUser({ id: user.id, role: 'admin' });
      } else {
        const local = localStorage.getItem('academia_student_session');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            userId = parsed.id;
            setCurrentUser(parsed);
          } catch (e) {}
        }
      }

      // 2. Cargar instrumento
      const { data: instData } = await supabase
        .from('instruments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!instData) {
        setLoading(false);
        return;
      }
      setInstrument(instData);

      // 3. Cargar apartados y lecciones
      const { data: secsData } = await supabase
        .from('sections')
        .select('*, lessons(*)')
        .eq('instrument_id', instData.id)
        .order('order_index');

      if (secsData) {
        secsData.forEach((s) => {
          if (s.lessons) s.lessons.sort((a, b) => a.order_index - b.order_index);
        });
        setSections(secsData);
      }

      // 4. Cargar progreso del alumno
      if (userId) {
        const { data: progData } = await supabase
          .from('student_section_progress')
          .select('section_id, unlocked_level')
          .eq('student_id', userId);

        const mapping = {};
        if (progData) {
          progData.forEach((p) => {
            mapping[p.section_id] = p.unlocked_level;
          });
        }
        setProgressMap(mapping);
      }

      setLoading(false);
    }

    if (slug) loadData();
  }, [slug]);

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Cargando niveles...</main>;
  }

  if (!instrument) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8 text-center">
        <p>Instrumento no encontrado.</p>
        <Link href="/" className="text-indigo-400 text-xs mt-4 inline-block">Volver al inicio</Link>
      </main>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 pb-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al aula
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white capitalize">{instrument.name}</h1>
                <p className="text-xs text-slate-400">Ruta progresiva de aprendizaje</p>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          {sections.map((sec) => {
            // El profesor tiene todo desbloqueado; el alumno lee su progreso guardado
            const unlocked = isAdmin ? 999 : (progressMap[sec.id] || 1);

            return (
              <div key={sec.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Apartado</span>
                  <h2 className="text-lg font-bold text-white mt-0.5">{sec.title}</h2>
                  {sec.description && <p className="text-xs text-slate-400 mt-1">{sec.description}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(sec.lessons || []).map((lesson) => {
                    const isUnlocked = lesson.order_index <= unlocked;

                    return isUnlocked ? (
                      <Link
                        key={lesson.id}
                        href={`/instrumentos/${instrument.slug}/leccion/${lesson.id}`}
                        className="p-4 rounded-xl border bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition flex justify-between items-center group"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-indigo-400 uppercase">Nivel {lesson.order_index}</span>
                          <p className="text-xs font-bold text-white mt-0.5 group-hover:text-indigo-200 transition">{lesson.title}</p>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={lesson.id}
                        className="p-4 rounded-xl border bg-slate-950/40 border-slate-900 opacity-50 flex justify-between items-center cursor-not-allowed"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">Nivel {lesson.order_index}</span>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">{lesson.title}</p>
                        </div>
                        <Lock className="w-4 h-4 text-slate-600" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}