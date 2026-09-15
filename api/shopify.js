// api/shopify.js

const STORES = {
  eurekakids: {
    handle: process.env.SHOPIFY_STORE_EUREKAKIDS,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN_EUREKAKIDS,
  },
  ricoutlet: {
    handle: process.env.SHOPIFY_STORE_RICOUTLET,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN_RICOUTLET,
  },
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch (e) { body = {} }
  }

  const { store, endpoint, method = 'GET', body: reqBody } = body || {}

  if (!store || !endpoint) {
    return res.status(400).json({ error: 'Missing store or endpoint' })
  }

  try {
    const storeConfig = STORES[store]
    if (!storeConfig) throw new Error(`Unknown store: ${store}`)

    const url = `https://${storeConfig.handle}.myshopify.com/admin/api/2025-04/${endpoint}`

    const shopifyRes = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': storeConfig.accessToken,
      },
      body: reqBody ? JSON.stringify(reqBody) : undefined,
    })

    const data = await shopifyRes.json()
    console.log(`[shopify] ${method} ${endpoint} →`, shopifyRes.status, JSON.stringify(data).slice(0, 2000))

    // ✅ 新增：Shopify 錯誤包裝成 200
    if (!shopifyRes.ok) {
      console.error(`[shopify] ${store} ${shopifyRes.status}:`, data)
      return res.status(200).json({
        error: true,
        shopifyStatus: shopifyRes.status,
        message: data?.errors || `Shopify error ${shopifyRes.status}`
      })
    }

    return res.status(200).json(data)  // ✅ 成功也回 200

  } catch (err) {
    console.error('[shopify error]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
