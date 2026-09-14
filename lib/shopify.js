// lib/shopify.js

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

  // 有 cache 且距離過期還有 5 分鐘以上，直接用
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.token;
  }

  // 換新 token
  const res = await fetch(
    `https://${store.handle}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: store.clientId,
        client_secret: store.clientSecret,
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token fetch failed [${storeKey}]: ${err}`);
  }

  const data = await res.json();
  const expiresIn = (data.expires_in || 86400) * 1000; // 預設 24h

  tokenCache[storeKey] = {
    token: data.access_token,
    expiresAt: now + expiresIn,
  };

  return data.access_token;
}

async function shopifyFetch(storeKey, endpoint, options = {}) {
  const store = STORES[storeKey];
  const token = await getAccessToken(storeKey);

  const url = `https://${store.handle}.myshopify.com/admin/api/2025-04/${endpoint}`;

  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
      ...options.headers,
    },
  };

  let res = await fetch(url, fetchOptions);

  // token 過期就清 cache 重試一次
  if (res.status === 401) {
    delete tokenCache[storeKey];
    const newToken = await getAccessToken(storeKey);
    fetchOptions.headers['X-Shopify-Access-Token'] = newToken;
    res = await fetch(url, fetchOptions);
  }

  return res;
}

module.exports = { shopifyFetch };
