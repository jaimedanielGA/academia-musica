'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../supabaseClient';
import { ArrowLeft, BookOpen, Play, AlertCircle, Plus, X, Pencil, Lock, ShieldCheck } from 'lucide-react';

export default function SectionLessonsPage({ params }) {
  const resolvedParams = use(params);
  const { slug, sectionId } = resolvedParams;

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [section, setSection] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  // Estados modal edición (solo profesor)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', order_index: 1, video_url: '', sheet_music_url: '', audio_url: '', content: ''
  });

  async function fetchData() {
    // 1. Obtener sesión y perfil
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let userRole = 'student';
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
      userRole = prof?.role || 'student';

      // Progreso del alumno
      const { data: prog } = await supabase
        .from('student_section_progress')
        .select('unlocked_level')
        .eq('student_id', user.id)
        .eq('section_id', sectionId)
        .maybeSingle();

      setUnlockedLevel(prog?.unlocked_level || 1);
    }

    // 2. Obtener apartado y lecciones
    const { data: sec } = await supabase
      .from('sections')
      .select('*, instruments(id, name, slug)')
      .eq('id', sectionId)
      .single();

    if (sec) {
      setSection(sec);
      const { data: less } = await supabase
        .from('lessons')
        .select('*')
        .eq('section_id', sectionId)
        .order('order_index');
      if (less) setLessons(less);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [sectionId]);

  function formatYoutubeUrl(url) {
    if (!url) return '';
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url;
  }

  function openCreateModal() {
    setEditingId(null);
    setFormData({
      title: '', description: '', order_index: lessons.length + 1, video_url: '', sheet_music_url: '', audio_url: '', content: ''
    });
    setIsModalOpen(true);
  }

  function openEditModal(lesson) {
    setEditingId(lesson.id);
    setFormData({
      title: lesson.title || '', description: lesson.description || '', order_index: lesson.order_index || 1,
      video_url: lesson.video_url || '', sheet_music_url: lesson.sheet_music_url || '',
      audio_url: lesson.audio_url || '', content: lesson.content || ''
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!section) return;
    setSaving(true);

    const payload = {
      title: formData.title,
      description: formData.description,
      order_index: parseInt(formData.order_index, 10),
      video_url: formatYoutubeUrl(formData.video_url),
      sheet_music_url: formData.sheet_music_url,
      audio_url: formData.audio_url,
      content: formData.content,
      section_id: section.id,
      instrument_id: section.instruments.id
    };

    if (editingId) {
      await supabase.from('lessons').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lessons').insert([payload]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    await fetchData();
    setSaving(false);
  }

  const isAdmin = profile?.role === 'admin';

  if (loading) return <main className="min-h-screen bg-slate-950 text-slate-400 p-8">Cargando niveles...</main>;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/instrumentos/${slug}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Volver a apartados de {section?.instruments?.name}
        </Link>

        <header className="mb-10 pb-6 border-b border-slate-800 flex justify-between items-end">
          <div>
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">{section?.instruments?.name} • Apartado</span>
            <h1 className="text-3xl font-bold capitalize mt-1 text-white">{section?.title}</h1>
            <p className="text-slate-400 text-sm mt-2">{section?.description}</p>
          </div>

          {isAdmin && (
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition">
              <Plus className="w-4 h-4" /> Nuevo Nivel
            </button>
          )}
        </header>

        {/* Lista de Niveles */}
        <div className="space-y-4">
          {lessons.length > 0 ? (
            lessons.map((lesson) => {
              // Si es admin tiene acceso a todos. Si es alumno, según unlockedLevel
              const isUnlocked = isAdmin || lesson.order_index <= unlockedLevel;

              return (
                <div 
                  key={lesson.id} 
                  className={`border rounded-xl p-5 flex items-center justify-between transition ${
                    isUnlocked ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/40' : 'bg-slate-950/60 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isUnlocked ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-900 text-slate-600'
                    }`}>
                      {isUnlocked ? <BookOpen className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={`font-medium text-base ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                        Nivel {lesson.order_index}: {lesson.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{lesson.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button onClick={() => openEditModal(lesson)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Modificar nivel">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {isUnlocked ? (
                      <Link 
                        href={`/instrumentos/${slug}/leccion/${lesson.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition text-white"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Iniciar
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-500 text-sm">No hay niveles creados aún en este apartado.</p>
          )}
        </div>
      </div>

      {/* Modal solo disponible para el profesor */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Editar Nivel' : `Nuevo Nivel para ${section.title}`}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Título</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nivel #</label>
                  <input type="number" required value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descripción</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">URL Video YouTube</label>
                <input type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">URL Partitura / PDF</label>
                <input type="url" value={formData.sheet_music_url} onChange={(e) => setFormData({ ...formData, sheet_music_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">URL Audio / Metrónomo</label>
                <input type="url" value={formData.audio_url} onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Guía de Estudio</label>
                <textarea rows="3" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-300 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium rounded-lg text-white transition disabled:opacity-50">{saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Publicar Nivel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}