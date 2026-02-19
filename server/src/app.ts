import express from 'express'
import path from 'node:path'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import adminUserRoutes from './routes/admin/users.js'
import adminPromptRoutes from './routes/admin/prompts.js'
import adminImageTemplateRoutes from './routes/admin/imageTemplates.js'
import adminManuscriptRoutes from './routes/admin/manuscripts.js'
import adminDashboardRoutes from './routes/admin/dashboard.js'
import sourceRoutes from './routes/sources.js'
import promptRoutes from './routes/prompts.js'
import imageTemplateRoutes from './routes/imageTemplates.js'
import manuscriptRoutes from './routes/manuscripts.js'
import dashboardRoutes from './routes/dashboard.js'
import { authenticate, requireAdmin } from './middleware/auth.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/uploads', express.static(path.resolve('uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin/users', authenticate, requireAdmin, adminUserRoutes)
app.use('/api/admin/prompts', authenticate, requireAdmin, adminPromptRoutes)
app.use('/api/admin/image-templates', authenticate, requireAdmin, adminImageTemplateRoutes)
app.use('/api/sources', authenticate, sourceRoutes)
app.use('/api/prompts', authenticate, promptRoutes)
app.use('/api/image-templates', authenticate, imageTemplateRoutes)
app.use('/api/manuscripts', authenticate, manuscriptRoutes)
app.use('/api/dashboard', authenticate, dashboardRoutes)
app.use('/api/admin/manuscripts', authenticate, requireAdmin, adminManuscriptRoutes)
app.use('/api/admin/dashboard', authenticate, requireAdmin, adminDashboardRoutes)

export default app
