'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { Music, ArrowRight, UserPlus, Users, X, BookOpen, Check, User, Lock, Play, LogOut, KeyRound, AlertCircle, Eye, EyeOff, Save, Key, Edit3, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Datos
  const [instruments, setInstruments] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentHomeworks, setStudentHomeworks] = useState([]);

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);

  // Formulario Alumno
  const [newStudent, setNewStudent] = useState({ username: '', password: '', instrumentId: '' });
  const [addStatus, setAddStatus] = useState({ loading: false, msg: null, error: null });

  // Gestión Alumno Seleccionado
  const [filterInstrumentId, setFilterInstrumentId] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSections, setStudentSections] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [homeworkMap, setHomeworkMap] = useState({});
  const [studentLogs, setStudentLogs] = useState([]);
  const [saveStatus, setSaveStatus] = useState(false);

  // Contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, msg: null, error: null });

  // Gestor de Contenidos (Profesor)
  const [contentLessons, setContentLessons] = useState([]);
  const [selectedLessonToEdit, setSelectedLessonToEdit] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', content: '', video_url: '', backing_track_url: '', sheet_music_url: '' });
  const [lessonSaveStatus, setLessonSaveStatus] = useState(false);

  async function fetchStudentsList() {
    const { data: stData } = await supabase
      .from('profiles')
      .select('*, instruments(id, name, slug)')
      .neq('role', 'admin')
      .order('full_name');

    if (stData) setStudents(stData);
  }

  async function checkSession() {
    setLoading(true);

    const { data: instData } = await supabase.from('instruments').select('*').order('name');
    if (instData) {
      setInstruments(instData);
      if (instData.length > 0 && !newStudent.instrumentId) {
        setNewStudent((prev) => ({ ...prev, instrumentId: instData[0].id }));
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email === 'profesor@academia.com') {
      setCurrentUser({ id: user.id, role: 'admin', username: 'profesor', full_name: 'Profesor' });
      await fetchStudentsList();
      setLoading(false);
      return;
    }

    const savedStudent = localStorage.getItem('academia_student_session');
    if (savedStudent) {
      try {
        const studentObj = JSON.parse(savedStudent);
        const { data: prof } = await supabase
          .from('profiles')
          .select('*, instruments(id, name, slug)')
          .eq('id', studentObj.id)
          .maybeSingle();

        if (prof) {
          setCurrentUser(prof);
          const { data: myProgress } = await supabase
            .from('student_section_progress')
            .select('section_id, homework_lesson_id, sections(title), lessons:homework_lesson_id(id, title, order_index)')
            .eq('student_id', prof.id)
            .not('homework_lesson_id', 'is', null);

          if (myProgress) setStudentHomeworks(myProgress);
          setLoading(false);
          return;
        }
      } catch (err) {
        localStorage.removeItem('academia_student_session');
      }
    }

    setCurrentUser(null);
    setLoading(false);
  }

  useEffect(() => {
    checkSession();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const input = loginUsername.trim();
    const pass = loginPassword.trim();

    if (input.toLowerCase() === 'profesor') {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'profesor@academia.com',
        password: pass
      });

      if (error) {
        setLoginError('Contraseña de profesor incorrecta.');
        setLoginLoading(false);
      } else {
        localStorage.removeItem('academia_student_session');
        setLoginUsername('');
        setLoginPassword('');
        await checkSession();
        setLoginLoading(false);
      }
      return;
    }

    const { data: studentMatch, error: searchError } = await supabase
      .from('profiles')
      .select('*, instruments(id, name, slug)')
      .or(`username.ilike.${input},full_name.ilike.${input}`)
      .maybeSingle();

    if (searchError || !studentMatch) {
      setLoginError('Usuario no encontrado.');
      setLoginLoading(false);
      return;
    }

    if (studentMatch.raw_password !== pass) {
      setLoginError('Contraseña incorrecta.');
      setLoginLoading(false);
      return;
    }

    localStorage.setItem('academia_student_session', JSON.stringify(studentMatch));
    setCurrentUser(studentMatch);
    setLoginUsername('');
    setLoginPassword('');

    const { data: myProgress } = await supabase
      .from('student_section_progress')
      .select('section_id, homework_lesson_id, sections(title), lessons:homework_lesson_id(id, title, order_index)')
      .eq('student_id', studentMatch.id)
      .not('homework_lesson_id', 'is', null);

    if (myProgress) setStudentHomeworks(myProgress);
    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('academia_student_session');
    setCurrentUser(null);
    window.location.reload();
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    setAddStatus({ loading: true, msg: null, error: null });

    const cleanUser = newStudent.username.trim();
    const cleanPass = newStudent.password.trim();

    const { error } = await supabase
      .from('profiles')
      .insert({
        full_name: cleanUser,
        username: cleanUser,
        raw_password: cleanPass,
        instrument_id: newStudent.instrumentId,
        role: 'student'
      });

    if (error) {
      setAddStatus({ loading: false, msg: null, error: error.message });
    } else {
      setAddStatus({ loading: false, msg: `Alumno "${cleanUser}" creado exitosamente.`, error: null });
      setNewStudent((prev) => ({ ...prev, username: '', password: '' }));
      await fetchStudentsList();
    }
  }

  async function handleSelectStudent(student) {
    setSelectedStudent(student);
    setShowCurrentPassword(false);
    setNewPasswordInput('');
    setPasswordStatus({ loading: false, msg: null, error: null });

    if (!student.instrument_id) return;

    const { data: secs } = await supabase
      .from('sections')
      .select('*, lessons(id, title, order_index)')
      .eq('instrument_id', student.instrument_id)
      .order('order_index');

    if (secs) {
      secs.forEach((s) => {
        if (s.lessons) s.lessons.sort((a, b) => a.order_index - b.order_index);
      });
      setStudentSections(secs);
    }

    const { data: prog } = await supabase
      .from('student_section_progress')
      .select('section_id, unlocked_level, homework_lesson_id')
      .eq('student_id', student.id);

    const progMapping = {};
    const hwMapping = {};
    if (prog) {
      prog.forEach((p) => {
        progMapping[p.section_id] = p.unlocked_level;
        hwMapping[p.section_id] = p.homework_lesson_id || '';
      });
    }
    setProgressMap(progMapping);
    setHomeworkMap(hwMapping);

    // Cargar bitácoras de este alumno
    const { data: logs } = await supabase
      .from('lesson_practice_logs')
      .select('*, lessons(title)')
      .eq('student_id', student.id);
    if (logs) setStudentLogs(logs);
  }

  async function handleUpdatePassword() {
    if (!selectedStudent || !newPasswordInput) return;
    setPasswordStatus({ loading: true, msg: null, error: null });

    const { error } = await supabase
      .from('profiles')
      .update({ raw_password: newPasswordInput.trim() })
      .eq('id', selectedStudent.id);

    if (error) {
      setPasswordStatus({ loading: false, msg: null, error: error.message });
    } else {
      setPasswordStatus({ loading: false, msg: 'Contraseña actualizada correctamente.', error: null });
      setSelectedStudent((prev) => ({ ...prev, raw_password: newPasswordInput.trim() }));
      setNewPasswordInput('');
      await fetchStudentsList();
    }
  }

  async function handleSaveStudentProgress() {
    if (!selectedStudent) return;
    setSaveStatus(true);

    for (const sec of studentSections) {
      const level = progressMap[sec.id] || 1;
      const hwLessonId = homeworkMap[sec.id] || null;

      await supabase
        .from('student_section_progress')
        .upsert(
          {
            student_id: selectedStudent.id,
            section_id: sec.id,
            unlocked_level: parseInt(level, 10),
            homework_lesson_id: hwLessonId,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'student_id,section_id' }
        );
    }

    await fetchStudentsList();
    setSaveStatus(false);
    alert('Niveles y tareas guardados correctamente.');
  }

  async function handleOpenContentEditor() {
    setIsContentModalOpen(true);
    const { data: allL } = await supabase
      .from('lessons')
      .select('*, sections(title, instruments(name))')
      .order('order_index');
    if (allL) {
      setContentLessons(allL);
      if (allL.length > 0) handleSelectLessonToEdit(allL[0]);
    }
  }

  function handleSelectLessonToEdit(l) {
    setSelectedLessonToEdit(l);
    setLessonForm({
      title: l.title || '',
      description: l.description || '',
      content: l.content || '',
      video_url: l.video_url || '',
      backing_track_url: l.backing_track_url || '',
      sheet_music_url: l.sheet_music_url || ''
    });
  }

  async function handleSaveLessonContent() {
    if (!selectedLessonToEdit) return;
    setLessonSaveStatus(true);

    await supabase
      .from('lessons')
      .update(lessonForm)
      .eq('id', selectedLessonToEdit.id);

    setLessonSaveStatus(false);
    alert('Contenido y recursos actualizados.');
  }

  async function handleSaveFeedback(logId, feedbackText) {
    await supabase
      .from('lesson_practice_logs')
      .update({ teacher_feedback: feedbackText })
      .eq('id', logId);
    alert('Retroalimentación enviada al alumno.');
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Cargando aula...</main>;
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/30">
            <Music className="w-6 h-6" />
          </div>

          <header className="mb-6">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Aula Virtual</span>
            <h1 className="text-2xl font-bold text-white mt-1">Iniciar Sesión</h1>
            <p className="text-slate-400 text-xs mt-1">Ingresa tu cuenta para acceder a la plataforma.</p>
          </header>

          {loginError && (
            <div className="mb-5 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginError}
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
                  placeholder="profesor o tu nombre de alumno"
                  value={loginUsername} 
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
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
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loginLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 mt-2 shadow-lg shadow-indigo-600/30"
            >
              {loginLoading ? 'Verificando...' : 'Entrar a la Academia'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const filteredStudents = filterInstrumentId === 'ALL'
    ? students
    : students.filter((s) => s.instrument_id === filterInstrumentId);

  const displayedInstruments = !isAdmin && currentUser?.instrument_id
    ? instruments.filter((i) => i.id === currentUser.instrument_id)
    : instruments;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Academia de Música</h1>
              <p className="text-xs text-slate-400">
                Sesión: <span className="text-indigo-400 font-semibold">{currentUser.full_name || currentUser.username}</span> ({isAdmin ? 'Profesor' : 'Alumno'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button 
                  onClick={handleOpenContentEditor}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" /> Editar Recursos / Videos
                </button>
                <button 
                  onClick={() => { setIsAddModalOpen(true); setAddStatus({ loading: false, msg: null, error: null }); }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20"
                >
                  <UserPlus className="w-4 h-4" /> Agregar Alumno
                </button>
                <button 
                  onClick={() => { setIsManageModalOpen(true); setSelectedStudent(null); fetchStudentsList(); }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700"
                >
                  <Users className="w-4 h-4 text-indigo-400" /> Administrar Alumnos
                </button>
              </>
            )}

            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium transition border border-rose-900/50"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
            </button>
          </div>
        </header>

        {/* TAREAS DE LA SEMANA */}
        {!isAdmin && studentHomeworks.length > 0 && (
          <section className="mb-10 bg-indigo-950/30 border border-indigo-800/50 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Tu Tarea Asignada de la Semana
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studentHomeworks.map((hw) => (
                <div key={hw.section_id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">{hw.sections?.title}</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      Nivel {hw.lessons?.order_index}: {hw.lessons?.title}
                    </p>
                  </div>
                  <Link 
                    href={`/instrumentos/${currentUser?.instruments?.slug}/leccion/${hw.lessons?.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Practicar
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INSTRUMENTOS */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {!isAdmin && currentUser?.instruments ? `Tu Instrumento: ${currentUser.instruments.name}` : 'Selecciona tu Instrumento'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Explora tus apartados, niveles y material técnico.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {displayedInstruments.map((inst) => (
              <Link 
                key={inst.id} 
                href={`/instrumentos/${inst.slug}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-slate-850 transition group min-h-[150px]"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center text-indigo-400 mb-4">
                    <Music className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition capitalize">
                    {inst.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Ruta de estudio</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-indigo-400 mt-4">
                  <span>Entrar al aula</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL EDITAR CONTENIDOS / VIDEOS / PDFS */}
      {isAdmin && isContentModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Editor de Contenidos y Recursos
              </h3>
              <button onClick={() => setIsContentModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 overflow-y-auto flex-1">
              {/* Lista de lecciones */}
              <div className="space-y-2 border-r border-slate-800 pr-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Niveles:</p>
                {contentLessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelectLessonToEdit(l)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                      selectedLessonToEdit?.id === l.id ? 'bg-indigo-950/60 border-indigo-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-indigo-400 block font-bold capitalize">{l.sections?.instruments?.name} - {l.sections?.title}</span>
                    Nivel {l.order_index}: {l.title}
                  </button>
                ))}
              </div>

              {/* Formulario de Recursos */}
              <div className="md:col-span-2 space-y-4">
                {selectedLessonToEdit && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Título</label>
                      <input
                        type="text"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">URL Video (YouTube Embed o enlace directo)</label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/embed/..."
                        value={lessonForm.video_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">URL Backing Track (Audio MP3)</label>
                      <input
                        type="text"
                        placeholder="https://enlace-a-tu-audio.mp3"
                        value={lessonForm.backing_track_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, backing_track_url: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">URL Partitura / PDF</label>
                      <input
                        type="text"
                        placeholder="https://enlace-a-tu-pdf.pdf"
                        value={lessonForm.sheet_music_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, sheet_music_url: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Instrucciones Técnicas / Contenido</label>
                      <textarea
                        rows="4"
                        value={lessonForm.content}
                        onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveLessonContent}
                      disabled={lessonSaveStatus}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    >
                      {lessonSaveStatus ? 'Guardando...' : 'Guardar Cambios en este Nivel'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR ALUMNO */}
      {isAdmin && isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" /> Agregar Alumno
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {addStatus.msg && <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs">{addStatus.msg}</div>}
            {addStatus.error && <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-xs">{addStatus.error}</div>}

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre del Alumno (Usuario)</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3 text-slate-500" />
                  <input type="text" required placeholder="Ej. Mateo Gómez" value={newStudent.username} onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Instrumento Asignado</label>
                <select value={newStudent.instrumentId} onChange={(e) => setNewStudent({ ...newStudent, instrumentId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize">
                  {instruments.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contraseña Asignada</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3 text-slate-500" />
                  <input type="text" required placeholder="Contraseña visible" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-300 transition">Cerrar</button>
                <button type="submit" disabled={addStatus.loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium rounded-lg text-white transition disabled:opacity-50">{addStatus.loading ? 'Registrando...' : 'Guardar Alumno'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMINISTRAR ALUMNOS Y RETROALIMENTACIÓN */}
      {isAdmin && isManageModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> Administrar Alumnos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Controla contraseñas, niveles, tareas y revisa bitácoras.</p>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex gap-2 pt-4 pb-3 overflow-x-auto border-b border-slate-800">
              <button onClick={() => setFilterInstrumentId('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterInstrumentId === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}>Todos ({students.length})</button>
              {instruments.map((inst) => {
                const count = students.filter((s) => s.instrument_id === inst.id).length;
                return <button key={inst.id} onClick={() => setFilterInstrumentId(inst.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filterInstrumentId === inst.id ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}>{inst.name} ({count})</button>;
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 overflow-y-auto flex-1">
              <div className="space-y-2 border-r border-slate-800 pr-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Alumnos:</p>
                {filteredStudents.length > 0 ? filteredStudents.map((st) => (
                  <button key={st.id} onClick={() => handleSelectStudent(st)} className={`w-full text-left p-3 rounded-xl border transition ${selectedStudent?.id === st.id ? 'bg-indigo-950/50 border-indigo-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                    <p className="font-semibold text-xs text-white">{st.full_name || st.username}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 capitalize font-medium">{st.instruments?.name || 'Sin instrumento'}</span>
                  </button>
                )) : <p className="text-xs text-slate-500 py-4">No hay alumnos en esta sección.</p>}
              </div>

              <div className="md:col-span-2 space-y-5">
                {selectedStudent ? (
                  <>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-white">{selectedStudent.full_name || selectedStudent.username}</h4>
                      <p className="text-xs text-slate-400">Instrumento: <span className="capitalize text-indigo-400 font-semibold">{selectedStudent.instruments?.name || 'No asignado'}</span></p>
                    </div>

                    {/* CONTRASEÑA */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-indigo-400" /> Contraseña</label>
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                          {showCurrentPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs flex justify-between font-mono">
                        <span className="text-slate-400">Clave:</span>
                        <span className="text-emerald-400 font-bold">{selectedStudent.raw_password ? (showCurrentPassword ? selectedStudent.raw_password : '••••••') : '(Sin clave)'}</span>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-900">
                        <input type="text" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="Nueva clave" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
                        <button type="button" onClick={handleUpdatePassword} disabled={!newPasswordInput} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"><Save className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* NIVELES */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nivel desbloqueado:</p>
                      {studentSections.map((sec) => (
                        <div key={sec.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <p className="text-xs font-semibold text-white">{sec.title}</p>
                          <select value={progressMap[sec.id] || 1} onChange={(e) => setProgressMap({ ...progressMap, [sec.id]: parseInt(e.target.value, 10) })} className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-400">
                            {(sec.lessons || []).map((l) => <option key={l.id} value={l.order_index}>Nivel {l.order_index}: {l.title}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* TAREAS */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tarea semanal:</p>
                      {studentSections.map((sec) => (
                        <div key={sec.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-xs font-semibold text-indigo-300">{sec.title}</span>
                          <select value={homeworkMap[sec.id] || ''} onChange={(e) => setHomeworkMap({ ...homeworkMap, [sec.id]: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                            <option value="">Sin tarea</option>
                            {(sec.lessons || []).map((l) => <option key={l.id} value={l.id}>Nivel {l.order_index}: {l.title}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* REVISIÓN DE BITÁCORA Y FEEDBACK */}
                    {studentLogs.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Bitácoras y Dudas del Alumno:
                        </p>
                        {studentLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between font-semibold text-white">
                              <span>{log.lessons?.title}</span>
                              <span className={log.completed ? 'text-emerald-400' : 'text-slate-500'}>
                                {log.completed ? '✓ Dominado' : 'En práctica'}
                              </span>
                            </div>
                            <p className="text-slate-400 bg-slate-900 p-2 rounded">{log.student_notes || '(Sin notas del alumno)'}</p>
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                defaultValue={log.teacher_feedback || ''}
                                id={`fb-${log.id}`}
                                placeholder="Escribe tu corrección/feedback..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                              <button
                                onClick={() => {
                                  const val = document.getElementById(`fb-${log.id}`).value;
                                  handleSaveFeedback(log.id, val);
                                }}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                              >
                                Responder
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={handleSaveStudentProgress} disabled={saveStatus} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 mt-4">
                      <Check className="w-4 h-4" /> {saveStatus ? 'Guardando...' : 'Guardar Niveles y Tareas'}
                    </button>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12"><Users className="w-8 h-8 mb-2 stroke-1" /><p className="text-xs">Selecciona un alumno para gestionar.</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}