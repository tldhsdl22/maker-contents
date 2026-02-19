import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.js'
import ProtectedRoute from './components/layout/ProtectedRoute.js'
import AppLayout from './components/layout/AppLayout.js'
import LoginPage from './pages/LoginPage.js'
import RegisterPage from './pages/RegisterPage.js'
import DashboardPage from './pages/DashboardPage.js'
import SourceListPage from './pages/SourceListPage.js'
import ManuscriptGeneratePage from './pages/ManuscriptGeneratePage.js'
import ManuscriptListPage from './pages/ManuscriptListPage.js'
import ManuscriptEditPage from './pages/ManuscriptEditPage.js'
import PerformanceDetailPage from './pages/PerformanceDetailPage.js'
import PerformanceSummaryPage from './pages/PerformanceSummaryPage.js'
import UserManagementPage from './pages/admin/UserManagementPage.js'
import PromptManagementPage from './pages/admin/PromptManagementPage.js'
import PromptEditPage from './pages/admin/PromptEditPage.js'
import ImageTemplateManagementPage from './pages/admin/ImageTemplateManagementPage.js'
import ImageTemplateEditPage from './pages/admin/ImageTemplateEditPage.js'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />

        <Route path="sources" element={<SourceListPage />} />
        <Route path="manuscripts/generate" element={<ManuscriptGeneratePage />} />
        <Route path="manuscripts/:id" element={<ManuscriptEditPage />} />
        <Route path="manuscripts/:id/performance" element={<PerformanceDetailPage />} />
        <Route path="manuscripts" element={<ManuscriptListPage />} />
        <Route path="performance" element={<PerformanceSummaryPage />} />

        {/* Admin routes */}
        <Route path="admin/users" element={
          <ProtectedRoute requireAdmin><UserManagementPage /></ProtectedRoute>
        } />
        <Route path="admin/prompts" element={
          <ProtectedRoute requireAdmin><PromptManagementPage /></ProtectedRoute>
        } />
        <Route path="admin/prompts/new" element={
          <ProtectedRoute requireAdmin><PromptEditPage /></ProtectedRoute>
        } />
        <Route path="admin/prompts/:id/edit" element={
          <ProtectedRoute requireAdmin><PromptEditPage /></ProtectedRoute>
        } />
        <Route path="admin/image-templates" element={
          <ProtectedRoute requireAdmin><ImageTemplateManagementPage /></ProtectedRoute>
        } />
        <Route path="admin/image-templates/new" element={
          <ProtectedRoute requireAdmin><ImageTemplateEditPage /></ProtectedRoute>
        } />
        <Route path="admin/image-templates/:id/edit" element={
          <ProtectedRoute requireAdmin><ImageTemplateEditPage /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
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
