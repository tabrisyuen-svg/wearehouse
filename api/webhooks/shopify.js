const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNAlZrmbPHKywdIUB9Esur7j1cEqyZ3xhqCP0hNrYrwE1JM6ntG2qp409Ic-2m6MBTpw/exec'

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch (e) { body = {} }
    }

    const topic = req.headers['x-shopify-topic']
    const shop = req.headers['x-shopify-shop-domain']
    console.log('[webhook]', topic, shop)

    let customerData = null

    if (topic === 'orders/create') {
      customerData = {
        id: body.customer?.id,
        email: body.email || body.contact_email,
        first_name: body.shipping_address?.first_name || body.billing_address?.first_name,
        last_name: body.shipping_address?.last_name || body.billing_address?.last_name,
        phone: body.shipping_address?.phone || body.phone,
        address1: body.shipping_address?.address1,
        city: body.shipping_address?.city,
        province: body.shipping_address?.province,
        country: body.shipping_address?.country,
        store: shop
      }
    } else if (topic === 'customers/create' || topic === 'customers/update') {
      customerData = {
        id: body.id,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        address1: body.default_address?.address1,
        city: body.default_address?.city,
        province: body.default_address?.province,
        country: body.default_address?.country,
        store: shop
      }
    }

    if (customerData?.id) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'upsertCustomer', data: customerData })
      })
      console.log('[webhook] customer saved:', customerData.id)
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook error]', err.message)
    res.status(500).json({ error: err.message })
  }
}
