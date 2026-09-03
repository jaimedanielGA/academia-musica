'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Minus, Volume2 } from 'lucide-react';

export default function Metronomo() {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioCtxRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const currentBeatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    beatsPerBarRef.current = beatsPerBar;
  }, [beatsPerBar]);

  function playClick(time, isAccent) {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();

    osc.frequency.value = isAccent ? 1200 : 800;
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  function scheduler() {
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      const isAccent = currentBeatRef.current === 0;
      playClick(nextNoteTimeRef.current, isAccent);
      setCurrentBeat(currentBeatRef.current);

      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += secondsPerBeat;

      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerBarRef.current;
    }
    timerIdRef.current = setTimeout(scheduler, 25);
  }

  function toggleMetronome() {
    if (isPlaying) {
      clearTimeout(timerIdRef.current);
      setIsPlaying(false);
      setCurrentBeat(0);
      currentBeatRef.current = 0;
    } else {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      currentBeatRef.current = 0;
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      setIsPlaying(true);
      scheduler();
    }
  }

  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
          <Volume2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Herramienta</span>
          <h3 className="text-xs font-bold text-white">Metrónomo Integrado</h3>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Indicadores de pulso */}
        <div className="flex gap-1.5">
          {Array.from({ length: beatsPerBar }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                isPlaying && currentBeat === i
                  ? i === 0 ? 'bg-amber-400 scale-125' : 'bg-indigo-400 scale-110'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Control BPM */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBpm((b) => Math.max(40, b - 5))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-mono font-bold text-white w-12 text-center">
            {bpm} <span className="text-[9px] text-slate-500 font-sans block">BPM</span>
          </span>
          <button
            onClick={() => setBpm((b) => Math.min(260, b + 5))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compás */}
        <select
          value={beatsPerBar}
          onChange={(e) => setBeatsPerBar(parseInt(e.target.value, 10))}
          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-semibold focus:outline-none"
        >
          <option value="2">2/4</option>
          <option value="3">3/4</option>
          <option value="4">4/4</option>
          <option value="6">6/8</option>
        </select>

        {/* Botón Encendido */}
        <button
          onClick={toggleMetronome}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          {isPlaying ? 'Detener' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
}