import { useState } from 'react'
import { supabase } from '../supabase'
import { BookOpen } from 'lucide-react'

// Genera email y password fijos a partir del nombre + código
// Así el alumno siempre puede volver a entrar con los mismos datos
function buildCredentials(name, code) {
  const normalized = name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, '.') // espacios → puntos
    .replace(/[^a-z0-9.]/g, '') // solo letras, números y puntos
  const email = `${normalized}.${code.toLowerCase()}@miclase.app`
  const password = `mc-${code.toLowerCase()}-${normalized}`
  return { email, password }
}

export default function AuthPage() {
  const [tab, setTab] = useState('login')

  // Login docente
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Registro/acceso alumno
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

    if (!name.trim()) { setError('Ingresá tu nombre completo.'); setLoading(false); return }
    if (!classCode.trim()) { setError('Ingresá el código de clase.'); setLoading(false); return }

    const code = classCode.toUpperCase()

    // Validar código de clase
    const { data: classData } = await supabase
      .from('classes').select('id')
      .eq('code', code).single()

    if (!classData) { setError('Código de clase inválido. Verificá con tu docente.'); setLoading(false); return }

    const { email: autoEmail, password: autoPassword } = buildCredentials(name, code)

    // Intentar login primero (por si ya existe)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: autoEmail, password: autoPassword
    })

    if (!loginError) {
      // Ya existía → entró directo
      setLoading(false)
      return
    }

    // No existía → registrar
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: autoEmail, password: autoPassword
    })

    if (signUpError) {
      setError('No se pudo crear la cuenta. Intentá de nuevo.')
      setLoading(false)
      return
    }

    // Crear perfil
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name.trim(),
      role: 'student',
    })

    // Inscribir en la clase
    await supabase.from('enrollments').insert({
      student_id: data.user.id,
      class_id: classData.id,
    })

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
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>
            Soy docente
          </button>
          <button className={`auth-tab ${tab === 'student' ? 'active' : ''}`} onClick={() => { setTab('student'); setError('') }}>
            Soy alumno
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'login' ? (
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
        ) : (
          <form onSubmit={handleStudentJoin}>
            <p style={{ fontSize: '.85rem', color: '#5f6368', marginBottom: 16, lineHeight: 1.5 }}>
              Ingresá tu nombre y el código que te dio tu docente. La próxima vez usá los mismos datos para volver a entrar.
            </p>
            <div className="form-group">
              <label className="form-label">Nombre y apellido</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Código de clase</label>
              <input
                className="form-input"
                type="text"
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                required
                placeholder="Ej: X6XBJ1"
                style={{ letterSpacing: 3, fontWeight: 600, fontSize: '1.1rem' }}
                maxLength={6}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar a la clase'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
