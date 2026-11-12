import express from 'express'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const app = express()
const port = Number(process.env.PORT) || 4000
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const jwtSecret = process.env.JWT_SECRET || ''

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in the server environment.')
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true)
    return callback(null, false)
  }
}))
app.use(express.json({ limit: '32kb' }))

function getBearerToken(request) {
  const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

async function getStudentProfile(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase URL and anon key are not configured for the backend.')
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers })
  if (!authResponse.ok) return { error: 'Your sign-in has expired. Log in again.' }
  const user = await authResponse.json()
  if (!/\.student@ua\.edu\.ph$/i.test(user.email || '')) return { error: 'A student account is required to create this QR code.' }

  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`)
  profileUrl.searchParams.set('id', `eq.${user.id}`)
  profileUrl.searchParams.set('select', 'student_id,full_name,department,role')
  const profileResponse = await fetch(profileUrl, { headers })
  if (!profileResponse.ok) return { error: 'Could not load your student profile.' }
  const rows = await profileResponse.json()
  const profile = rows[0]
  if (!profile || profile.role !== 'student') return { error: 'Complete your student profile before creating a QR code.' }
  if (!profile.student_id || !profile.full_name) return { error: 'Add your student ID and name to your profile first.' }
  return { user, profile }
}

app.post('/api/student/qr', async (req, res) => {
  const accessToken = getBearerToken(req)
  if (!accessToken) return res.status(401).json({ message: 'Sign in as a student to request a QR code.' })

  try {
    const result = await getStudentProfile(accessToken)
    if (result.error) return res.status(401).json({ message: result.error })
    const { user, profile } = result
    const token = jwt.sign({
      studentId: profile.student_id,
      name: profile.full_name,
      department: profile.department || '',
      userId: user.id,
      type: 'attendance-qr'
    }, jwtSecret, { expiresIn: '12h', issuer: 'attendance-qr' })
    return res.json({ qrToken: token, expiresIn: 43200 })
  } catch (error) {
    console.error('QR token issue failed:', error.message)
    return res.status(503).json({ message: 'QR service could not verify your account. Try again shortly.' })
  }
})

app.post('/api/attendance/scan', (req, res) => {
  const { token } = req.body || {}
  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'QR token is required.' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { issuer: 'attendance-qr' })
    if (decoded.type !== 'attendance-qr' || !decoded.studentId) {
      return res.status(401).json({ message: 'Invalid QR code.' })
    }
    return res.json({
      ok: true,
      studentId: decoded.studentId,
      name: decoded.name,
      department: decoded.department
    })
  } catch {
    return res.status(401).json({ message: 'This QR code is invalid or has expired.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' })
})

app.listen(port, () => {
  console.log(`Attendance backend running on http://localhost:${port}`)
})
