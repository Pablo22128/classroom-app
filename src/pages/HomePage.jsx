import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, X, Copy } from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const COLORS = [
  '#1a73e8', '#0f9d58', '#f4b400', '#db4437',
  '#ab47bc', '#00838f', '#e64a19', '#37474f'
]

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function HomePage() {
  const { isTeacher, user } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', section: '', color: COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchClasses() }, [])

  async function fetchClasses() {
    setLoading(true)
    if (isTeacher) {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      setClasses(data || [])
    } else {
      const { data } = await supabase
        .from('enrollments')
        .select('class_id, classes(*)')
        .eq('student_id', user.id)
      setClasses((data || []).map(e => e.classes).filter(Boolean))
    }
    setLoading(false)
  }

  async function createClass(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const code = generateCode()
    const { error: err } = await supabase.from('classes').insert({
      name: form.name,
      section: form.section,
      color: form.color,
      code,
      teacher_id: user.id,
    })
    if (err) { setError('Error al crear la clase.'); setSaving(false); return }
    setShowModal(false)
    setForm({ name: '', section: '', color: COLORS[0] })
    fetchClasses()
    setSaving(false)
  }

  return (
    <div className="page">
      <Navbar />
      <main className="home-main">
        <div className="container-wide">
          <div className="section-header">
            <h1 className="section-title">
              {isTeacher ? 'Mis clases' : 'Mis clases'}
            </h1>
            {isTeacher && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Nueva clase
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : classes.length === 0 ? (
            <div className="empty-state">
              <Users size={64} />
              <p>
                {isTeacher
                  ? 'Todavía no tenés clases. ¡Creá la primera!'
                  : 'No estás inscripto en ninguna clase.'}
              </p>
            </div>
          ) : (
            <div className="class-grid">
              {classes.map(cls => (
                <div key={cls.id} className="class-card" onClick={() => navigate(`/class/${cls.id}`)}>
                  <div className="class-card-header" style={{ background: `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)` }}>
                    <div className="class-card-name">{cls.name}</div>
                    {cls.section && <div className="class-card-section">{cls.section}</div>}
                    {isTeacher && <div className="class-card-code">Código: {cls.code}</div>}
                  </div>
                  <div className="class-card-footer">
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Copiar código"
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(cls.code) }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva clase</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createClass}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Nombre de la clase *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ej: Matemáticas 3°A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sección / Descripción</label>
                  <input className="form-input" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="Ej: Turno mañana" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-picker">
                    {COLORS.map(c => (
                      <div
                        key={c}
                        className={`color-dot ${form.color === c ? 'selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
