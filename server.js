import express from 'express'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const app = express()
const port = Number(process.env.PORT) || 4000
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const jwtSecret = process.env.JWT_SECRET || ''
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
)
const adminEmails = new Set([
  'adminside1@gmail.com',
  ...(process.env.VITE_ADMIN_EMAILS || '').split(',')
].map((email) => email.trim().toLowerCase()).filter(Boolean))

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in the server environment.')
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || allowedOrigins.has(origin)) {
      return callback(null, true)
    }
    return callback(null, false)
  }
}))
app.use(express.json({ limit: '32kb' }))

function getBearerToken(request) {
  const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

async function verifyUser(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase URL and anon key are not configured for the backend.')
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) {
    console.error('Supabase auth check failed:', response.status, await response.text())
    return null
  }
  return response.json()
}

async function getStudentProfile(accessToken) {
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
  const user = await verifyUser(accessToken)
  if (!user) return { error: 'Your sign-in has expired. Log in again.' }
  if (!/\.student@ua\.edu\.ph$/i.test(user.email || '')) return { error: 'A student account is required to create this QR code.' }

  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`)
  profileUrl.searchParams.set('id', `eq.${user.id}`)
  profileUrl.searchParams.set('select', 'student_id,full_name,year_level,role')
  const profileResponse = await fetch(profileUrl, { headers })
  if (!profileResponse.ok) return { error: 'Could not load your student profile.' }
  const rows = await profileResponse.json()
  const profile = rows[0]
  if (!profile || profile.role !== 'student') return { error: 'Complete your student profile before creating a QR code.' }
  if (!profile.student_id || !profile.full_name) return { error: 'Add your student ID and name to your profile first.' }
  return { user, profile }
}

async function getAdminUser(accessToken) {
  const user = await verifyUser(accessToken)
  if (!user) return { error: 'Your sign-in has expired. Log in again.', status: 401 }
  if (!adminEmails.has((user.email || '').trim().toLowerCase())) {
    return { error: 'Administrator access is required for member management.', status: 403 }
  }
  return { user }
}

function tableUrl(table, filters) {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
  for (const [column, value] of Object.entries(filters)) url.searchParams.set(column, `eq.${value}`)
  return url
}

async function readResponse(response) {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return { message: text } }
}

async function serviceRequest(url, options = {}) {
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in the backend environment.')
  if (!serviceRoleKey.startsWith('sb_secret_')) {
    let role = ''
    try {
      role = JSON.parse(Buffer.from(serviceRoleKey.split('.')[1], 'base64url').toString('utf8')).role || ''
    } catch {}
    if (role !== 'service_role') {
      const keyType = serviceRoleKey.startsWith('sb_publishable_') ? 'a publishable/anon key' : 'an invalid key'
      throw new Error(`SUPABASE_SERVICE_ROLE_KEY is ${keyType}. Set it to this project's Supabase secret key (sb_secret_...) or legacy service_role JWT in the backend .env.local file.`)
    }
  }
  const response = await fetch(url, {
    ...options,
    headers: 
    {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.headers || {})
    }
  })
  const data = await readResponse(response)
  if (!response.ok) {
    const invalidProjectKey = response.status === 401 && /invalid api key/i.test(data?.message || '')
    const message = invalidProjectKey
      ? 'Supabase rejected SUPABASE_SERVICE_ROLE_KEY. Use a secret key from the same project as VITE_SUPABASE_URL.'
      : data?.message || `Supabase request failed with status ${response.status}.`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return { response, data }
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
      yearLevel: profile.year_level || '',
      userId: user.id,
      type: 'attendance-qr'
    }, jwtSecret, { issuer: 'attendance-qr', noTimestamp: true })
    return res.json({ qrToken: token })
  } catch (error) {
    console.error('QR token issue failed:', error.message)
    return res.status(503).json({ message: 'QR service could not verify your account. Try again shortly.' })
  }
})

app.patch('/api/admin/:memberType/:memberId', async (req, res) => {
  const accessToken = getBearerToken(req)
  if (!accessToken) return res.status(401).json({ message: 'Sign in as an administrator to edit members.' })
  const { memberType, memberId } = req.params
  const memberTable = memberType === 'students' ? memberType : ''
  if (!memberTable) return res.status(404).json({ message: 'Member type was not found.' })
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const yearLevel = typeof req.body?.yearLevel === 'string' ? req.body.yearLevel.trim() : null
  if (!memberId || memberId.length > 80 || !name || name.length > 160 || yearLevel === null || yearLevel.length > 160) {
    return res.status(400).json({ message: 'Enter a valid member ID, name, and year level.' })
  }

  try {
    const auth = await getAdminUser(accessToken)
    if (auth.error) return res.status(auth.status).json({ message: auth.error })
    const { data: updatedMembers } = await serviceRequest(tableUrl(memberTable, { id: memberId }), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ name, year_level: yearLevel || null })
    })
    let member = updatedMembers?.[0]
    if (!member) {
      const { data: currentMembers } = await serviceRequest(tableUrl(memberTable, { id: memberId }))
      member = currentMembers?.[0]
      if (!member) return res.status(404).json({ message: 'Member record was not found.' })
      if (member.name !== name || String(member.year_level || '') !== (yearLevel || '')) {
        return res.status(502).json({ message: 'The member exists, but the updated profile could not be confirmed.' })
      }
    }

    if (memberType === 'students') {
      try {
        await serviceRequest(tableUrl('profiles', { student_id: memberId, role: 'student' }), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ full_name: name, year_level: yearLevel || null })
        })
      } catch (error) {
        console.error('Student profile update failed:', error.message)
        return res.status(502).json({ message: `Student roster was updated, but the linked profile could not be updated: ${error.message}` })
      }
    }
    return res.json({ member })
  } catch (error) {
    console.error('Member update failed:', error.message)
    return res.status(error.status && error.status < 500 ? error.status : 502).json({ message: error.message || 'Member information could not be updated.' })
  }
})

app.delete('/api/admin/:memberType/:memberId', async (req, res) => {
  const accessToken = getBearerToken(req)
  if (!accessToken) return res.status(401).json({ message: 'Sign in as an administrator to delete members.' })
  const { memberType, memberId } = req.params
  const memberTable = memberType === 'students' ? memberType : ''
  if (!memberTable) return res.status(404).json({ message: 'Member type was not found.' })
  if (!memberId || memberId.length > 80) return res.status(400).json({ message: 'Enter a valid member ID.' })

  try {
    const auth = await getAdminUser(accessToken)
    if (auth.error) return res.status(auth.status).json({ message: auth.error })
    const { data: existingMembers } = await serviceRequest(tableUrl(memberTable, { id: memberId }))
    if (!existingMembers?.length) {
      return res.status(404).json({ message: 'Member record was not found.' })
    }

    const { data: profiles } = memberType === 'students'
      ? await serviceRequest(tableUrl('profiles', { student_id: memberId, role: 'student' }))
      : { data: [] }
    if (profiles.length > 1) {
      return res.status(409).json({ message: 'Multiple student accounts use this student ID. Resolve the duplicate profiles before deleting.' })
    }

    let accountDeleted = false
    let profileId = profiles[0]?.id
    if (profileId) {
      const deleteAccountResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(profileId)}`,
        { method: 'DELETE', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
      )
      if (deleteAccountResponse.ok) accountDeleted = true
      else if (deleteAccountResponse.status !== 404) {
        const data = await readResponse(deleteAccountResponse)
        throw new Error(data?.message || `Supabase account deletion failed with status ${deleteAccountResponse.status}.`)
      }
    }

    let profileCleanupError = ''
    if (profileId) {
      try {
        await serviceRequest(tableUrl('profiles', { id: profileId }), { method: 'DELETE' })
      } catch (error) {
        profileCleanupError = error.message
      }
    }

    let deletedAttendanceCount = 0
    if (memberType === 'students') {
      try {
        const { data: deletedAttendances } = await serviceRequest(
          tableUrl('attendances', { student_id: memberId }),
          { method: 'DELETE', headers: { Prefer: 'return=representation' } }
        )
        deletedAttendanceCount = deletedAttendances?.length || 0
      } catch (error) {
        console.error('Student attendance cleanup failed:', error.message)
        return res.status(502).json({
          message: `The student account may have been removed, but attendance records could not be deleted: ${error.message}`,
          memberDeleted: false
        })
      }
    }

    let deletedMembers
    try {
      ({ data: deletedMembers } = await serviceRequest(tableUrl(memberTable, { id: memberId }), {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' }
      }))
    } catch (error) {
      const partialMessage = accountDeleted
        ? `The sign-in account and attendance records were deleted, but the member record could not be removed: ${error.message}`
        : memberType === 'students' && deletedAttendanceCount
          ? `Attendance records were deleted, but the member record could not be removed: ${error.message}`
          : error.message
      console.error('Member record deletion failed:', partialMessage)
      return res.status(502).json({ message: partialMessage, memberDeleted: false })
    }
    if (!deletedMembers?.length) {
      const { data: remainingMembers } = await serviceRequest(tableUrl(memberTable, { id: memberId }))
      if (remainingMembers?.length) {
        return res.status(502).json({ message: 'The member record still exists after the delete request.', memberDeleted: false })
      }
    }
    if (profileCleanupError) {
      return res.status(502).json({
        message: `Member record was deleted, but the linked profile could not be removed: ${profileCleanupError}`,
        memberDeleted: true
      })
    }

    const message = accountDeleted
      ? `Student record, ${deletedAttendanceCount} attendance record(s), and linked Supabase sign-in account deleted.`
      : profileId
        ? `Student record and ${deletedAttendanceCount} attendance record(s) deleted. The linked Supabase account was already unavailable.`
        : `Student record and ${deletedAttendanceCount} attendance record(s) deleted. No linked Supabase sign-in account was found.`
    return res.json({ message, memberDeleted: true })
  } catch (error) {
    console.error('Member deletion failed:', error.message)
    return res.status(error.status && error.status < 500 ? error.status : 502).json({ message: error.message || 'Member could not be deleted.' })
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
      yearLevel: decoded.yearLevel || decoded.department
    })
  } catch {
    return res.status(401).json({ message: 'This QR code is invalid or has expired.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' })
})

app.listen(port, () => {
  console.log('Backend Supabase URL:', supabaseUrl || '(missing)', '| anon key set:', Boolean(supabaseAnonKey))
  console.log(`Attendance backend running on http://localhost:${port}`)
})
