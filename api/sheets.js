export default async function handler(req, res) {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNAlZrmbPHKywdIUB9Esur7j1cEqyZ3xhqCP0hNrYrwE1JM6ntG2qp409Ic-2m6MBTpw/exec'
  
  try {
    const sheet = req.query.sheet || ''
    const response = await fetch(`${SCRIPT_URL}?sheet=${encodeURIComponent(sheet)}`)
    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(data)
  } catch (e) {
    res.status(500).json({ ok: false, err: e.message })
  }
}
