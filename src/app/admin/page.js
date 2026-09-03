'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [instruments, setInstruments] = useState([]);
  const [formData, setFormData] = useState({
    instrument_id: '',
    title: '',
    description: '',
    order_index: 1,
    video_url: '',
    sheet_music_url: '',
    audio_url: '',
    content: ''
  });

  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  useEffect(() => {
    async function loadInstruments() {
      const { data } = await supabase.from('instruments').select('*').order('name');
      if (data && data.length > 0) {
        setInstruments(data);
        setFormData((prev) => ({ ...prev, instrument_id: data[0].id }));
      }
    }
    loadInstruments();
  }, []);

  // Función para convertir links comunes de YouTube a formato embed
  function formatYoutubeUrl(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    const payload = {
      ...formData,
      order_index: parseInt(formData.order_index, 10),
      video_url: formatYoutubeUrl(formData.video_url)
    };

    const { error } = await supabase.from('lessons').insert([payload]);

    if (error) {
      setStatus({ loading: false, success: false, error: error.message });
    } else {
      setStatus({ loading: false, success: true, error: null });
      setFormData((prev) => ({
        ...prev,
        title: '',
        description: '',
        order_index: prev.order_index + 1,
        video_url: '',
        sheet_music_url: '',
        audio_url: '',
        content: ''
      }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la plataforma
        </Link>

        <header className="mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Panel de Administración</h1>
          <p className="text-slate-400 text-sm mt-1">Carga lecciones fijas al plan de estudio general.</p>
        </header>

        {status.success && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Lección guardada exitosamente en la base de datos.
          </div>
        )}

        {status.error && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Error al guardar: {status.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          {/* Instrumento y Orden */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Instrumento</label>
              <select 
                value={formData.instrument_id}
                onChange={(e) => setFormData({ ...formData, instrument_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Nivel / Orden</label>
              <input 
                type="number" 
                min="1"
                required
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase">Título de la Lección</label>
            <input 
              type="text" 
              required
              placeholder="Ej. Coordinación de corcheas y acentos"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Descripción corta */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase">Descripción Breve</label>
            <input 
              type="text" 
              placeholder="Resumen de objetivos del ejercicio..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Enlaces: Video, Partitura, Audio */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">URL de Video (YouTube)</label>
              <input 
                type="url" 
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">URL de Partitura / PDF (Drive, Cloud, etc.)</label>
              <input 
                type="url" 
                placeholder="https://.../partitura.pdf"
                value={formData.sheet_music_url}
                onChange={(e) => setFormData({ ...formData, sheet_music_url: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">URL de Pista de Audio / Metrónomo</label>
              <input 
                type="url" 
                placeholder="https://.../audio.mp3"
                value={formData.audio_url}
                onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Guía de Estudio / Texto */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300 uppercase">Guía de Estudio (Instrucciones)</label>
            <textarea 
              rows="4"
              placeholder="Instrucciones para la práctica, digitación, bpm sugerido..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={status.loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 mt-4"
          >
            <PlusCircle className="w-4 h-4" />
            {status.loading ? 'Guardando en Supabase...' : 'Guardar Lección'}
          </button>
        </form>
      </div>
    </main>
  );
}