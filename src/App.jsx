import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ClassPage from './pages/ClassPage'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/class/:id" element={<ClassPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
