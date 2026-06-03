import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, X, Copy, Pencil, Trash2 } from 'lucide-react'
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
  const { isTeacher, user, profile } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // Crear
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', section: '', color: COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Editar
  const [editingClass, setEditingClass] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', section: '', color: COLORS[0] })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Eliminar
  const [deletingClass, setDeletingClass] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (user && profile !== undefined) fetchClasses() }, [user?.id, isTeacher])

  async function fetchClasses() {
    setLoading(true)
    if (isTeacher) {
      const { data } = await supabase
        .from('classes').select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      setClasses(data || [])
    } else {
      const { data } = await supabase
        .from('enrollments').select('class_id, classes(*)')
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
      name: form.name, section: form.section, color: form.color, code, teacher_id: user.id,
    })
    if (err) { setError('Error al crear la clase.'); setSaving(false); return }
    setShowModal(false)
    setForm({ name: '', section: '', color: COLORS[0] })
    fetchClasses()
    setSaving(false)
  }

  function openEdit(e, cls) {
    e.stopPropagation()
    setEditingClass(cls)
    setEditForm({ name: cls.name, section: cls.section || '', color: cls.color })
    setEditError('')
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSavingEdit(true); setEditError('')
    const { error: err } = await supabase.from('classes')
      .update({ name: editForm.name, section: editForm.section, color: editForm.color })
      .eq('id', editingClass.id)
    if (err) { setEditError('Error al guardar.'); setSavingEdit(false); return }
    setEditingClass(null)
    fetchClasses()
    setSavingEdit(false)
  }

  function openDelete(e, cls) {
    e.stopPropagation()
    setDeletingClass(cls)
  }

  async function confirmDelete() {
    setDeleting(true)
    await supabase.from('classes').delete().eq('id', deletingClass.id)
    setDeletingClass(null)
    setDeleting(false)
    fetchClasses()
  }

  return (
    <div className="page">
      <Navbar />
      <main className="home-main">
        <div className="container-wide">
          <div className="section-header">
            <h1 className="section-title">Mis clases</h1>
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
              <p>{isTeacher ? 'Todavía no tenés clases. ¡Creá la primera!' : 'No estás inscripto en ninguna clase.'}</p>
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
                    <button className="btn btn-ghost btn-icon btn-sm" title="Copiar código"
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(cls.code) }}>
                      <Copy size={14} />
                    </button>
                    {isTeacher && <>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Editar clase"
                        onClick={e => openEdit(e, cls)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Eliminar clase"
                        style={{ color: '#d93025' }}
                        onClick={e => openDelete(e, cls)}>
                        <Trash2 size={14} />
                      </button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Nueva clase */}
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
                      <div key={c} className={`color-dot ${form.color === c ? 'selected' : ''}`}
                        style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
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

      {/* Modal: Editar clase */}
      {editingClass && (
        <div className="modal-overlay" onClick={() => setEditingClass(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar clase</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingClass(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="modal-body">
                {editError && <div className="alert alert-error">{editError}</div>}
                <div className="form-group">
                  <label className="form-label">Nombre de la clase *</label>
                  <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sección / Descripción</label>
                  <input className="form-input" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} placeholder="Ej: Turno mañana" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-picker">
                    {COLORS.map(c => (
                      <div key={c} className={`color-dot ${editForm.color === c ? 'selected' : ''}`}
                        style={{ background: c }} onClick={() => setEditForm(f => ({ ...f, color: c }))} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingClass(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar eliminación */}
      {deletingClass && (
        <div className="modal-overlay" onClick={() => setDeletingClass(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">Eliminar clase</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeletingClass(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '.95rem', lineHeight: 1.6 }}>
                ¿Estás seguro que querés eliminar <strong>"{deletingClass.name}"</strong>?
                <br />
                <span style={{ color: '#d93025', fontSize: '.875rem' }}>
                  Se eliminarán también todas las publicaciones, trabajos e inscripciones de esta clase. Esta acción no se puede deshacer.
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletingClass(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
