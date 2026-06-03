import { useState } from 'react'
import { supabase } from '../supabase'
import { BookOpen } from 'lucide-react'

const TEACHER_EMAIL = 'pereyrapablo128@gmail.com'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos.')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (!name.trim()) { setError('Ingresá tu nombre.'); setLoading(false); return }
    if (!classCode.trim()) { setError('Ingresá el código de clase.'); setLoading(false); return }

    // Validate class code
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('code', classCode.toUpperCase())
      .single()

    if (!classData) { setError('Código de clase inválido.'); setLoading(false); return }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Create profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name,
      role: 'student',
    })

    // Enroll in class
    await supabase.from('enrollments').insert({
      student_id: data.user.id,
      class_id: classData.id,
    })

    setSuccess('Cuenta creada. Ya podés iniciar sesión.')
    setTab('login')
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
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Iniciar sesión
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            Unirse a una clase
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Juan Pérez" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Código de clase</label>
              <input
                className="form-input"
                type="text"
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                required
                placeholder="Ej: ABC123"
                style={{ letterSpacing: 3, fontWeight: 600, fontSize: '1.1rem' }}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Registrando...' : 'Unirse'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
