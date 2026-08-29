import express from 'express'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const app = express()
const port = 4000

app.use(cors())

const JWT_SECRET = process.env.JWT_SECRET || 'attendance-secret-key-change-me'

app.use(express.json())

app.post('/api/student/qr', (req, res) => {
  const { studentId, name, department } = req.body || {}

  if (!studentId) {
    return res.status(400).json({ message: 'studentId is required' })
  }

  const token = jwt.sign(
    {
      studentId,
      name: name || '',
      department: department || '',
      type: 'attendance-qr'
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  )

  return res.json({ qrToken: token })
})

app.post('/api/attendance/scan', (req, res) => {
  const { token } = req.body || {}

  if (!token) {
    return res.status(400).json({ message: 'QR token is required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (decoded.type !== 'attendance-qr') {
      return res.status(401).json({ message: 'Invalid QR code' })
    }

    return res.json({
      ok: true,
      studentId: decoded.studentId,
      name: decoded.name,
      department: decoded.department
    })
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired QR code' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' })
})

app.listen(port, () => {
  console.log(`Attendance backend running on http://localhost:${port}`)
})
