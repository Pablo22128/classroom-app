import { BookOpen, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Navbar() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="navbar">
      <div className="container-wide navbar-inner">
        <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <BookOpen size={28} />
          MiClase
        </div>
        <div className="navbar-actions">
          <span style={{ fontSize: '.875rem', color: '#5f6368' }}>{profile?.full_name}</span>
          <div className="avatar">{initials}</div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
