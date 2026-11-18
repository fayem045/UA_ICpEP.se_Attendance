const url = process.env.VITE_SUPABASE_URL.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
console.log('host:', new URL(url).host)
console.log('key prefix:', key.slice(0, 12), '| length:', key.length, '| has space/quote:', /[\s"']/.test(key))

const endpoint = `${url}/rest/v1/students?select=id&limit=1`
const a = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
console.log('apikey + Bearer:', a.status, (await a.text()).slice(0, 120))
const b = await fetch(endpoint, { headers: { apikey: key } })
console.log('apikey only:    ', b.status, (await b.text()).slice(0, 120))