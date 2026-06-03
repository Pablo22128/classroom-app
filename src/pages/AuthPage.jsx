import { useState } from 'react'
import { supabase } from '../supabase'
import { BookOpen } from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState('student')

  // Login docente
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Acceso alumno
  const [name, setName] = useState('')
  const [classCode, setClassCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos.')
    setLoading(false)
  }

  async function handleStudentJoin(e) {
    e.preventDefault()
    setLoading(true); setError('')

    const trimmedName = name.trim()
    const code = classCode.trim().toUpperCase()

    if (!trimmedName) { setError('Ingresá tu nombre completo.'); setLoading(false); return }
    if (!code) { setError('Ingresá el código de clase.'); setLoading(false); return }

    // Validar código de clase
    const { data: classData } = await supabase
      .from('classes').select('id').eq('code', code).single()
    if (!classData) { setError('Código de clase inválido. Verificá con tu docente.'); setLoading(false); return }

    // Verificar si ya existe un alumno con ese nombre en esa clase
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, enrollments!inner(class_id)')
      .eq('full_name', trimmedName)
      .eq('role', 'student')
      .eq('enrollments.class_id', classData.id)
      .maybeSingle()

    if (existing) {
      // Ya existe — crear sesión anónima nueva y reasociar
      const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
      if (anonErr) { setError('No se pudo iniciar sesión. Intentá de nuevo.'); setLoading(false); return }

      // Actualizar perfil al nuevo uid anónimo
      await supabase.from('profiles').delete().eq('id', existing.id)
      await supabase.from('profiles').insert({ id: anonData.user.id, full_name: trimmedName, role: 'student' })
      await supabase.from('enrollments').insert({ student_id: anonData.user.id, class_id: classData.id })
      setLoading(false)
      return
    }

    // Alumno nuevo — inicio anónimo
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
    if (anonErr) { setError('No se pudo iniciar sesión. Intentá de nuevo.'); setLoading(false); return }

    // Crear perfil e inscribir
    await supabase.from('profiles').insert({ id: anonData.user.id, full_name: trimmedName, role: 'student' })
    await supabase.from('enrollments').insert({ student_id: anonData.user.id, class_id: classData.id })

    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <BookOpen size={32} color="#1a73e8" />
          <span>MiClase</span>
        </div>
        <p className="auth-subtitle">Plataforma educativa</p>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'student' ? 'active' : ''}`} onClick={() => { setTab('student'); setError('') }}>
            Soy alumno
          </button>
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>
            Soy docente
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'student' ? (
          <form onSubmit={handleStudentJoin}>
            <p style={{ fontSize: '.85rem', color: '#5f6368', marginBottom: 16, lineHeight: 1.5 }}>
              Ingresá tu nombre y el código que te dio tu docente.
            </p>
            <div className="form-group">
              <label className="form-label">Nombre y apellido</label>
              <input className="form-input" type="text" value={name}
                onChange={e => setName(e.target.value)} required placeholder="Ej: Juan Pérez" />
            </div>
            <div className="form-group">
              <label className="form-label">Código de clase</label>
              <input className="form-input" type="text" value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                required placeholder="Ej: C6Z0W3"
                style={{ letterSpacing: 3, fontWeight: 600, fontSize: '1.1rem' }}
                maxLength={6} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar a la clase'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
