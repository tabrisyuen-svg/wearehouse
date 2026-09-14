// api/shopify.js

const tokenCache = {};

const STORES = {
  eurekakids: {
    handle: process.env.SHOPIFY_STORE_EUREKAKIDS,
    clientId: process.env.SHOPIFY_CLIENT_ID_EUREKAKIDS,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET_EUREKAKIDS,
  },
  ricoutlet: {
    handle: process.env.SHOPIFY_STORE_RICOUTLET,
    clientId: process.env.SHOPIFY_CLIENT_ID_RICOUTLET,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET_RICOUTLET,
  },
};

async function getAccessToken(storeKey) {
  const store = STORES[storeKey];
  if (!store) throw new Error(`Unknown store: ${storeKey}`);

  const cached = tokenCache[storeKey];
  const now = Date.now();
  
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.token;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', store.clientId);
  params.append('client_secret', store.clientSecret);

  const res = await fetch(
    `https://${store.handle}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token fetch failed [${storeKey}]: ${err}`);
  }

  const data = await res.json();
  const expiresIn = (data.expires_in || 86400) * 1000;

  tokenCache[storeKey] = {
    token: data.access_token,
    expiresAt: now + expiresIn,
  };

  return data.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 防止 body 未 parse
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const { store, endpoint, method = 'GET', body: reqBody } = body || {};

  if (!store || !endpoint) {
    return res.status(400).json({ error: 'Missing store or endpoint' });
  }

  try {
    const token = await getAccessToken(store);
    const storeHandle = STORES[store].handle;
    const url = `https://${storeHandle}.myshopify.com/admin/api/2025-04/${endpoint}`;

    const shopifyRes = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: reqBody ? JSON.stringify(reqBody) : undefined,
    });

    const data = await shopifyRes.json();
    console.log(`[shopify] ${method} ${endpoint} →`, shopifyRes.status, JSON.stringify(data).slice(0, 300))
      return res.status(shopifyRes.status).json(data);

  } catch (err) {
    console.error('[shopify error]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
