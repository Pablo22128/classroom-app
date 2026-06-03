import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, FileText, ClipboardList, Send, Trash2, Copy, Paperclip, Download, ExternalLink } from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const DEFAULT_CATEGORIES = ['Trabajo en clase', 'Tarea', 'Evaluación', 'Material', 'Otro']

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return formatDate(d)
}

export default function ClassPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isTeacher, profile, user } = useAuth()
  const [cls, setCls] = useState(null)
  const [tab, setTab] = useState('wall')
  const [loading, setLoading] = useState(true)

  // Wall
  const [posts, setPosts] = useState([])
  const [postText, setPostText] = useState('')
  const [postExpanded, setPostExpanded] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postFile, setPostFile] = useState(null)
  const postFileRef = useRef()

  // Works
  const [works, setWorks] = useState([])
  const [showWorkModal, setShowWorkModal] = useState(false)
  const [workForm, setWorkForm] = useState({ title: '', description: '', category: '', due_date: '' })
  const [workFile, setWorkFile] = useState(null)
  const [savingWork, setSavingWork] = useState(false)
  const [selectedWork, setSelectedWork] = useState(null)
  const workFileRef = useRef()

  // Custom categories used in this class
  const [usedCategories, setUsedCategories] = useState(DEFAULT_CATEGORIES)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: classData }, { data: postsData }, { data: worksData }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('posts').select('*, profiles(full_name)').eq('class_id', id).order('created_at', { ascending: false }),
      supabase.from('works').select('*').eq('class_id', id).order('created_at', { ascending: false }),
    ])
    setCls(classData)
    setPosts(postsData || [])
    setWorks(worksData || [])

    // Build category list from existing works
    if (worksData?.length) {
      const existing = [...new Set(worksData.map(w => w.category))]
      const merged = [...new Set([...DEFAULT_CATEGORIES, ...existing])]
      setUsedCategories(merged)
    }
    setLoading(false)
  }

  async function uploadFile(file, folder) {
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('attachments').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('attachments').getPublicUrl(path)
    return { url: data.publicUrl, name: file.name }
  }

  async function publishPost(e) {
    e.preventDefault()
    if (!postText.trim() && !postFile) return
    setPosting(true)
    let attachment_url = null
    let attachment_name = null
    if (postFile) {
      try {
        const result = await uploadFile(postFile, 'posts')
        attachment_url = result.url
        attachment_name = result.name
      } catch { /* ignore upload error, post anyway */ }
    }
    await supabase.from('posts').insert({
      class_id: id, author_id: user.id,
      content: postText,
      attachment_url,
      attachment_name,
    })
    setPostText(''); setPostExpanded(false); setPostFile(null)
    const { data } = await supabase.from('posts').select('*, profiles(full_name)').eq('class_id', id).order('created_at', { ascending: false })
    setPosts(data || [])
    setPosting(false)
  }

  async function deletePost(postId) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
  }

  async function createWork(e) {
    e.preventDefault()
    setSavingWork(true)
    let attachment_url = null
    let attachment_name = null
    if (workFile) {
      try {
        const result = await uploadFile(workFile, 'works')
        attachment_url = result.url
        attachment_name = result.name
      } catch { /* ignore */ }
    }
    const category = workForm.category || 'Sin categoría'
    await supabase.from('works').insert({
      ...workForm, category,
      class_id: id, teacher_id: user.id,
      attachment_url, attachment_name,
    })
    // Update category list
    if (!usedCategories.includes(category)) {
      setUsedCategories(prev => [...prev, category])
    }
    setShowWorkModal(false)
    setWorkForm({ title: '', description: '', category: '', due_date: '' })
    setWorkFile(null)
    const { data } = await supabase.from('works').select('*').eq('class_id', id).order('created_at', { ascending: false })
    setWorks(data || [])
    setSavingWork(false)
  }

  async function deleteWork(workId) {
    await supabase.from('works').delete().eq('id', workId)
    setWorks(w => w.filter(x => x.id !== workId))
    setSelectedWork(null)
  }

  if (loading) return (
    <div className="page"><Navbar /><div className="loading-center"><div className="spinner" /></div></div>
  )

  if (!cls) return (
    <div className="page"><Navbar /><div className="empty-state"><p>Clase no encontrada.</p></div></div>
  )

  // Group works by category preserving order
  const categories = [...new Set(works.map(w => w.category))]
  const worksByCategory = categories.reduce((acc, cat) => {
    acc[cat] = works.filter(w => w.category === cat)
    return acc
  }, {})

  return (
    <div className="page">
      <Navbar />

      {/* Banner */}
      <div className="class-banner" style={{ background: `linear-gradient(135deg, ${cls.color}, ${cls.color}99)` }}>
        <div style={{ position: 'absolute', top: 16, left: 16 }}>
          <button className="btn btn-ghost btn-icon" style={{ color: 'white' }} onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="class-banner-info">
          <div className="class-banner-name">{cls.name}</div>
          {cls.section && <div className="class-banner-section">{cls.section}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="container-wide" style={{ marginTop: 24 }}>
        <div className="tabs">
          <button className={`tab-btn ${tab === 'wall' ? 'active' : ''}`} onClick={() => setTab('wall')}>Muro</button>
          <button className={`tab-btn ${tab === 'works' ? 'active' : ''}`} onClick={() => setTab('works')}>Trabajos</button>
          {isTeacher && (
            <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Alumnos</button>
          )}
        </div>

        {/* WALL */}
        {tab === 'wall' && (
          <div className="class-layout">
            <aside className="class-sidebar">
              {isTeacher && (
                <div className="code-card">
                  <div className="code-card-label">Código de clase</div>
                  <div className="code-card-value">{cls.code}</div>
                  <div className="code-card-hint">Compartí este código con tus alumnos para que se unan.</div>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigator.clipboard.writeText(cls.code)}>
                    <Copy size={13} /> Copiar código
                  </button>
                </div>
              )}
              <div className="code-card">
                <div className="code-card-label">Trabajos publicados</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#202124' }}>{works.length}</div>
                <div className="code-card-hint" style={{ marginTop: 4 }}>en esta clase</div>
              </div>
            </aside>

            <div className="wall">
              {isTeacher && (
                <div className="post-composer">
                  {!postExpanded ? (
                    <div className="post-composer-trigger" onClick={() => setPostExpanded(true)}>
                      <div className="avatar" style={{ fontSize: '.75rem' }}>
                        {profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="post-composer-placeholder">Compartir algo con la clase…</div>
                    </div>
                  ) : (
                    <form onSubmit={publishPost} className="post-composer-expanded">
                      <textarea
                        className="form-input"
                        autoFocus
                        value={postText}
                        onChange={e => setPostText(e.target.value)}
                        placeholder="Escribí tu publicación…"
                        rows={3}
                      />
                      {/* File preview */}
                      {postFile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#e8f0fe', borderRadius: 4, fontSize: '.8rem' }}>
                          <Paperclip size={13} color="#1a73e8" />
                          <span style={{ flex: 1, color: '#1a73e8' }}>{postFile.name}</span>
                          <button type="button" className="btn btn-ghost btn-icon" style={{ padding: 2 }} onClick={() => setPostFile(null)}>
                            <X size={13} />
                          </button>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Adjuntar archivo" onClick={() => postFileRef.current.click()}>
                          <Paperclip size={16} />
                        </button>
                        <input ref={postFileRef} type="file" style={{ display: 'none' }} onChange={e => setPostFile(e.target.files[0])} />
                        <div style={{ flex: 1 }} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPostExpanded(false); setPostText(''); setPostFile(null) }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={(!postText.trim() && !postFile) || posting}>
                          <Send size={13} /> Publicar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {posts.length === 0 && (
                <div className="empty-state"><FileText size={48} /><p>No hay publicaciones aún.</p></div>
              )}
              {posts.map(post => (
                <div key={post.id} className="post-card">
                  <div className="post-meta">
                    <div className="avatar" style={{ fontSize: '.75rem', width: 32, height: 32 }}>
                      {post.profiles?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="post-author">{post.profiles?.full_name}</div>
                      <div className="post-time">{timeAgo(post.created_at)}</div>
                    </div>
                    {isTeacher && (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={() => deletePost(post.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {post.content && <div className="post-content">{post.content}</div>}
                  {post.attachment_url && (
                    <a href={post.attachment_url} target="_blank" rel="noreferrer" className="post-attachment">
                      <Paperclip size={14} />
                      {post.attachment_name || 'Archivo adjunto'}
                      <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKS */}
        {tab === 'works' && (
          <div>
            {isTeacher && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setShowWorkModal(true)}>
                  <Plus size={16} /> Nuevo trabajo
                </button>
              </div>
            )}
            {works.length === 0 ? (
              <div className="empty-state"><ClipboardList size={48} /><p>No hay trabajos publicados aún.</p></div>
            ) : (
              <div className="works-list">
                {Object.entries(worksByCategory).map(([cat, items]) => (
                  <div key={cat} className="category-section">
                    <div className="category-title">{cat}</div>
                    {items.map(work => (
                      <div key={work.id} className="work-item" onClick={() => setSelectedWork(work)}>
                        <div className="work-icon" style={{ background: '#e8f0fe' }}>
                          <ClipboardList size={20} color="#1a73e8" />
                        </div>
                        <div className="work-info">
                          <div className="work-title">{work.title}</div>
                          <div className="work-meta">
                            {work.category}
                            {work.attachment_url && <span style={{ marginLeft: 8 }}><Paperclip size={11} style={{ verticalAlign: 'middle' }} /> adjunto</span>}
                          </div>
                        </div>
                        {work.due_date && <div className="work-due">Vence: {formatDate(work.due_date)}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS */}
        {tab === 'students' && isTeacher && <StudentsTab classId={id} />}
      </div>

      {/* New work modal */}
      {showWorkModal && (
        <div className="modal-overlay" onClick={() => setShowWorkModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo trabajo</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowWorkModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createWork}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={workForm.title} onChange={e => setWorkForm(f => ({ ...f, title: e.target.value }))} required placeholder="Ej: Tp 3 - Funciones" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-input" value={workForm.description} onChange={e => setWorkForm(f => ({ ...f, description: e.target.value }))} placeholder="Instrucciones, consignas…" rows={4} />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <input
                    className="form-input"
                    list="cat-list"
                    value={workForm.category}
                    onChange={e => setWorkForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Escribí o elegí una categoría…"
                  />
                  <datalist id="cat-list">
                    {usedCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
                  <div style={{ fontSize: '.75rem', color: '#5f6368', marginTop: 4 }}>
                    Podés escribir una categoría nueva o elegir una existente.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de entrega</label>
                  <input className="form-input" type="date" value={workForm.due_date} onChange={e => setWorkForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Archivo adjunto</label>
                  {workFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#e8f0fe', borderRadius: 4, fontSize: '.875rem' }}>
                      <Paperclip size={14} color="#1a73e8" />
                      <span style={{ flex: 1, color: '#1a73e8' }}>{workFile.name}</span>
                      <button type="button" className="btn btn-ghost btn-icon" style={{ padding: 2 }} onClick={() => setWorkFile(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => workFileRef.current.click()}>
                      <Paperclip size={14} /> Adjuntar archivo
                    </button>
                  )}
                  <input ref={workFileRef} type="file" style={{ display: 'none' }} onChange={e => setWorkFile(e.target.files[0])} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowWorkModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingWork}>
                  {savingWork ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work detail modal */}
      {selectedWork && (
        <div className="modal-overlay" onClick={() => setSelectedWork(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selectedWork.title}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedWork(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="work-detail-info" style={{ marginBottom: 16 }}>
                <div className="work-detail-row">
                  <strong>Categoría</strong>
                  <span className="badge badge-blue">{selectedWork.category}</span>
                </div>
                {selectedWork.due_date && (
                  <div className="work-detail-row">
                    <strong>Vence</strong>
                    <span>{formatDate(selectedWork.due_date)}</span>
                  </div>
                )}
                <div className="work-detail-row">
                  <strong>Publicado</strong>
                  <span>{formatDate(selectedWork.created_at)}</span>
                </div>
              </div>
              {selectedWork.description && (
                <div className="work-detail-desc">{selectedWork.description}</div>
              )}
              {selectedWork.attachment_url && (
                <a href={selectedWork.attachment_url} target="_blank" rel="noreferrer" className="post-attachment" style={{ marginTop: 8 }}>
                  <Paperclip size={14} />
                  {selectedWork.attachment_name || 'Archivo adjunto'}
                  <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
                </a>
              )}
            </div>
            <div className="modal-footer">
              {isTeacher && (
                <button className="btn btn-danger btn-sm" onClick={() => deleteWork(selectedWork.id)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelectedWork(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentsTab({ classId }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('enrollments')
      .select('*, profiles(full_name, id)')
      .eq('class_id', classId)
      .then(({ data }) => { setStudents(data || []); setLoading(false) })
  }, [classId])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ marginBottom: 12, color: '#5f6368', fontSize: '.875rem' }}>
        {students.length} alumno{students.length !== 1 ? 's' : ''} inscripto{students.length !== 1 ? 's' : ''}
      </div>
      {students.length === 0 ? (
        <div className="empty-state"><p>Todavía no hay alumnos inscriptos.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(e => (
            <div key={e.id} style={{ background: 'white', borderRadius: 8, padding: '12px 16px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ fontSize: '.8rem' }}>
                {e.profiles?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span style={{ fontWeight: 500 }}>{e.profiles?.full_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
