import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, X, Copy, Pencil, Trash2, ImagePlus } from 'lucide-react'
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

async function uploadBanner(file) {
  const ext = file.name.split('.').pop()
  const path = `banners/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('attachments').getPublicUrl(path)
  return data.publicUrl
}

function ClassFormFields({ form, setForm, bannerPreview, setBannerPreview, bannerFileRef, onBannerChange }) {
  return (
    <>
      {/* Banner image */}
      <div className="form-group">
        <label className="form-label">Imagen de portada</label>
        <div
          onClick={() => bannerFileRef.current.click()}
          style={{
            height: 120,
            borderRadius: 8,
            border: '2px dashed #dadce0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            background: bannerPreview ? 'none' : '#f8f9fa',
            position: 'relative',
          }}
        >
          {bannerPreview ? (
            <>
              <img src={bannerPreview} alt="portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                <ImagePlus size={24} color="white" />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#5f6368' }}>
              <ImagePlus size={28} />
              <span style={{ fontSize: '.8rem' }}>Subir imagen de portada</span>
            </div>
          )}
        </div>
        <input ref={bannerFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onBannerChange} />
        {bannerPreview && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, color: '#d93025' }}
            onClick={() => { setBannerPreview(null); setForm(f => ({ ...f, banner_url: null })) }}>
            Quitar imagen
          </button>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Nombre de la clase *</label>
        <input className="form-input" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required placeholder="Ej: Matemáticas 3°A" />
      </div>
      <div className="form-group">
        <label className="form-label">Sección / Descripción</label>
        <input className="form-input" value={form.section}
          onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
          placeholder="Ej: Turno mañana" />
      </div>
      <div className="form-group">
        <label className="form-label">Color de fondo {bannerPreview ? '(cuando no hay imagen)' : ''}</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <div key={c} className={`color-dot ${form.color === c ? 'selected' : ''}`}
              style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
          ))}
        </div>
      </div>
    </>
  )
}

export default function HomePage() {
  const { isTeacher, user, profile } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // Crear
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', section: '', color: COLORS[0], banner_url: null })
  const [bannerPreview, setBannerPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const bannerFileRef = useRef()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Editar
  const [editingClass, setEditingClass] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', section: '', color: COLORS[0], banner_url: null })
  const [editBannerPreview, setEditBannerPreview] = useState(null)
  const [editBannerFile, setEditBannerFile] = useState(null)
  const editBannerFileRef = useRef()
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Eliminar
  const [deletingClass, setDeletingClass] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (user && profile !== undefined) fetchClasses() }, [user?.id, isTeacher])

  async function fetchClasses() {
    setLoading(true)
    if (isTeacher) {
      const { data } = await supabase.from('classes').select('*')
        .eq('teacher_id', user.id).order('created_at', { ascending: false })
      setClasses(data || [])
    } else {
      const { data } = await supabase.from('enrollments').select('class_id, classes(*)')
        .eq('student_id', user.id)
      setClasses((data || []).map(e => e.classes).filter(Boolean))
    }
    setLoading(false)
  }

  function handleBannerChange(e, setPreview, setFile) {
    const file = e.target.files[0]
    if (!file) return
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function createClass(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      let banner_url = null
      if (bannerFile) banner_url = await uploadBanner(bannerFile)
      const code = generateCode()
      const { error: err } = await supabase.from('classes').insert({
        name: form.name, section: form.section, color: form.color,
        banner_url, code, teacher_id: user.id,
      })
      if (err) throw err
      setShowModal(false)
      setForm({ name: '', section: '', color: COLORS[0], banner_url: null })
      setBannerPreview(null); setBannerFile(null)
      fetchClasses()
    } catch {
      setError('Error al crear la clase.')
    }
    setSaving(false)
  }

  function openEdit(e, cls) {
    e.stopPropagation()
    setEditingClass(cls)
    setEditForm({ name: cls.name, section: cls.section || '', color: cls.color, banner_url: cls.banner_url })
    setEditBannerPreview(cls.banner_url || null)
    setEditBannerFile(null)
    setEditError('')
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSavingEdit(true); setEditError('')
    try {
      let banner_url = editForm.banner_url
      if (editBannerFile) banner_url = await uploadBanner(editBannerFile)
      const { error: err } = await supabase.from('classes')
        .update({ name: editForm.name, section: editForm.section, color: editForm.color, banner_url })
        .eq('id', editingClass.id)
      if (err) throw err
      setEditingClass(null)
      fetchClasses()
    } catch {
      setEditError('Error al guardar.')
    }
    setSavingEdit(false)
  }

  function openDelete(e, cls) {
    e.stopPropagation()
    setDeletingClass(cls)
  }

  async function confirmDelete() {
    setDeleting(true)
    await supabase.from('classes').delete().eq('id', deletingClass.id)
    setDeletingClass(null); setDeleting(false)
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
                  <div className="class-card-header" style={{
                    background: cls.banner_url
                      ? `url(${cls.banner_url}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)`
                  }}>
                    {/* overlay oscuro para legibilidad si hay imagen */}
                    {cls.banner_url && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', borderRadius: 0 }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div className="class-card-name">{cls.name}</div>
                      {cls.section && <div className="class-card-section">{cls.section}</div>}
                      {isTeacher && <div className="class-card-code">Código: {cls.code}</div>}
                    </div>
                  </div>
                  <div className="class-card-footer">
                    <button className="btn btn-ghost btn-icon btn-sm" title="Copiar código"
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(cls.code) }}>
                      <Copy size={14} />
                    </button>
                    {isTeacher && <>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={e => openEdit(e, cls)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Eliminar"
                        style={{ color: '#d93025' }} onClick={e => openDelete(e, cls)}>
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
                <ClassFormFields
                  form={form} setForm={setForm}
                  bannerPreview={bannerPreview} setBannerPreview={setBannerPreview}
                  bannerFileRef={bannerFileRef}
                  onBannerChange={e => handleBannerChange(e, setBannerPreview, setBannerFile)}
                />
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
                <ClassFormFields
                  form={editForm} setForm={setEditForm}
                  bannerPreview={editBannerPreview} setBannerPreview={setEditBannerPreview}
                  bannerFileRef={editBannerFileRef}
                  onBannerChange={e => handleBannerChange(e, setEditBannerPreview, setEditBannerFile)}
                />
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
                ¿Estás seguro que querés eliminar <strong>"{deletingClass.name}"</strong>?<br />
                <span style={{ color: '#d93025', fontSize: '.875rem' }}>
                  Se eliminarán también todas las publicaciones, trabajos e inscripciones. Esta acción no se puede deshacer.
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
