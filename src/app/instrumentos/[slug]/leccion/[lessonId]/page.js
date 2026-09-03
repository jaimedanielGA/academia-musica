'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../supabaseClient';
import Metronomo from '../../../../Metronomo';
import { ArrowLeft, BookOpen, Music, CheckCircle2, Lock, FileText, Headphones, MessageSquare, Check, Save } from 'lucide-react';

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;
  const lessonId = params?.lessonId;

  const [lesson, setLesson] = useState(null);
  const [section, setSection] = useState(null);
  const [instrument, setInstrument] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bitácora y retroalimentación
  const [practiceLog, setPracticeLog] = useState({ completed: false, student_notes: '', teacher_feedback: '' });
  const [logStatus, setLogStatus] = useState({ loading: false, msg: null });

  useEffect(() => {
    async function loadLesson() {
      setLoading(true);

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

      if (!userId) {
        router.push('/');
        return;
      }

      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*, sections(*, instruments(*))')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lessonData) {
        setLoading(false);
        return;
      }

      setLesson(lessonData);
      setSection(lessonData.sections);
      setInstrument(lessonData.sections?.instruments);

      if (isAdmin) {
        setIsAllowed(true);
      } else {
        const { data: prog } = await supabase
          .from('student_section_progress')
          .select('unlocked_level')
          .eq('student_id', userId)
          .eq('section_id', lessonData.section_id)
          .maybeSingle();

        const unlockedLevel = prog?.unlocked_level || 1;
        setIsAllowed(lessonData.order_index <= unlockedLevel);

        // Cargar bitácora del alumno
        const { data: logData } = await supabase
          .from('lesson_practice_logs')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('student_id', userId)
          .maybeSingle();

        if (logData) setPracticeLog(logData);
      }

      setLoading(false);
    }

    if (lessonId) loadLesson();
  }, [lessonId, router]);

  async function handleSaveStudentPractice() {
    if (!currentUser || currentUser.role === 'admin') return;
    setLogStatus({ loading: true, msg: null });

    const { error } = await supabase
      .from('lesson_practice_logs')
      .upsert(
        {
          lesson_id: lessonId,
          student_id: currentUser.id,
          completed: practiceLog.completed,
          student_notes: practiceLog.student_notes,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'lesson_id,student_id' }
      );

    setLogStatus({
      loading: false,
      msg: error ? 'Error al guardar.' : 'Práctica y notas guardadas.'
    });
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Cargando lección...</main>;
  }

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8 text-center">
        <p>Lección no encontrada.</p>
        <Link href="/" className="text-indigo-400 text-xs mt-4 inline-block">Volver al inicio</Link>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-900/50 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Nivel Bloqueado</h2>
          <p className="text-xs text-slate-400 mb-6">Aún no tienes habilitado este nivel. Tu profesor debe asignártelo primero.</p>
          <Link href={`/instrumentos/${slug}`} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition">
            Volver a la ruta
          </Link>
        </div>
      </main>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="pb-6 border-b border-slate-800">
          <Link href={`/instrumentos/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a {instrument?.name || 'la ruta'}
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">{section?.title}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
                Nivel {lesson.order_index}: {lesson.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" /> Desbloqueado
            </div>
          </div>
        </header>

        {/* METRÓNOMO INTEGRADO */}
        <Metronomo />

        {/* MATERIAL DE ESTUDIO */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          {lesson.description && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Objetivo</h2>
              <p className="text-sm text-slate-200 leading-relaxed">{lesson.description}</p>
            </div>
          )}

          {lesson.content && (
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Instrucciones y Patrones</h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {lesson.content}
              </div>
            </div>
          )}

          {/* BACKING TRACK / AUDIO DE PRÁCTICA */}
          {lesson.backing_track_url && (
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-indigo-400" /> Backing Track de Práctica
              </h2>
              <audio controls className="w-full mt-2 rounded-lg bg-slate-950 border border-slate-800">
                <source src={lesson.backing_track_url} type="audio/mpeg" />
                Tu navegador no soporta el reproductor de audio.
              </audio>
            </div>
          )}

          {/* PARTITURA / PDF */}
          {lesson.sheet_music_url && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" /> Material en Partitura / Tablatura
                </h2>
                <p className="text-xs text-slate-400">PDF descargable para imprimir o leer en atril.</p>
              </div>
              <a
                href={lesson.sheet_music_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Abrir PDF
              </a>
            </div>
          )}

          {/* VIDEO DEMOSTRACIÓN */}
          {lesson.video_url && (
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Video Demostración</h2>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            </div>
          )}
        </section>

        {/* BITÁCORA DE PRÁCTICA (Solo visible para alumnos) */}
        {!isAdmin && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" /> Registro de Práctica Semanal
              </h2>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={practiceLog.completed}
                  onChange={(e) => setPracticeLog({ ...practiceLog, completed: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                />
                Marcar como dominado
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Tus dudas o notas sobre este ejercicio:</label>
              <textarea
                rows="3"
                value={practiceLog.student_notes || ''}
                onChange={(e) => setPracticeLog({ ...practiceLog, student_notes: e.target.value })}
                placeholder="Ej. Me costó el cambio al tempo de 120 bpm, logré mantenerlo a 100 bpm..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {practiceLog.teacher_feedback && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Comentario de tu Profesor:</span>
                <p className="text-xs text-slate-300 mt-1">{practiceLog.teacher_feedback}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-400">{logStatus.msg}</span>
              <button
                onClick={handleSaveStudentPractice}
                disabled={logStatus.loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> {logStatus.loading ? 'Guardando...' : 'Guardar Notas'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}