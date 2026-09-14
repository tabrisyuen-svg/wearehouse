// api/shopify.js

const { shopifyFetch } = require('../lib/shopify');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { store, endpoint, method = 'GET', body } = req.body;

  if (!store || !endpoint) {
    return res.status(400).json({ error: 'Missing store or endpoint' });
  }

  try {
    const shopifyRes = await shopifyFetch(store, endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await shopifyRes.json();
    return res.status(shopifyRes.status).json(data);
  } catch (err) {
    console.error('[shopify api error]', err);
    return res.status(500).json({ error: err.message });
  }
};
