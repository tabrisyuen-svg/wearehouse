// ============================================================
// db.js — 數據抽象層 v1.0
// 切換數據來源只需改 DB_CONFIG.source
// 'google' = Google Apps Script | 'supabase' = Supabase
// ============================================================

const DB_CONFIG = {
  source: 'google', // ⬅️ 轉移時只改這一個字

  google: {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbwNAlZrmbPHKywdIUB9Esur7j1cEqyZ3xhqCP0hNrYrwE1JM6ntG2qp409Ic-2m6MBTpw/exec'
  },

  supabase: {
    url: '',      // 填入 Supabase Project URL
    anonKey: ''   // 填入 Supabase anon key
  }
}

const DB = {

  // ── 內部 Helper ──────────────────────────────────────────

  async _googleFetch(action, params = {}) {
    const url = new URL(DB_CONFIG.google.scriptUrl)
    url.searchParams.set('action', action)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString())
    return res.json()
  },

  async _supabaseFetch(table, options = {}) {
    const { method = 'GET', filter = '', body = null } = options
    const url = `${DB_CONFIG.supabase.url}/rest/v1/${table}${filter}`
    const headers = {
      'apikey': DB_CONFIG.supabase.anonKey,
      'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })
    return res.json()
  },

  // ── 庫存 ─────────────────────────────────────────────────

  async getInventory() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getInventory')
    } else {
      return this._supabaseFetch('inventory', { filter: '?order=sku.asc' })
    }
  },

  async updateInventory(sku, qty) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('updateInventory', { sku, qty })
    } else {
      return this._supabaseFetch('inventory', {
        method: 'PATCH',
        filter: `?sku=eq.${sku}`,
        body: { qty, updated_at: new Date().toISOString() }
      })
    }
  },

  async batchUpdateInventory(items) {
    // items: [{ sku, qty }, ...]
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('batchUpdateInventory', { items: JSON.stringify(items) })
    } else {
      return this._supabaseFetch('inventory', {
        method: 'POST',
        filter: '?on_conflict=sku',
        body: items.map(i => ({ ...i, updated_at: new Date().toISOString() }))
      })
    }
  },

  async getLowStock(threshold = 5) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getLowStock', { threshold })
    } else {
      return this._supabaseFetch('inventory', {
        filter: `?qty=lt.${threshold}&order=qty.asc`
      })
    }
  },

  // ── 大量入庫 / 未上架 ─────────────────────────────────────

  async bulkImport(items) {
    // items: [{ sku, qty, status: 'unlisted'|'listed', location }]
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('bulkImport', { items: JSON.stringify(items) })
    } else {
      return this._supabaseFetch('inventory', {
        method: 'POST',
        body: items
      })
    }
  },

  async getUnlisted() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getUnlisted')
    } else {
      return this._supabaseFetch('inventory', {
        filter: '?status=eq.unlisted&order=created_at.desc'
      })
    }
  },

  async markAsListed(sku) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('markAsListed', { sku })
    } else {
      return this._supabaseFetch('inventory', {
        method: 'PATCH',
        filter: `?sku=eq.${sku}`,
        body: { status: 'listed', listed_at: new Date().toISOString() }
      })
    }
  },

  // ── 產品資料 ─────────────────────────────────────────────

  async getProducts() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getProducts')
    } else {
      return this._supabaseFetch('products', { filter: '?order=sku.asc' })
    }
  },

  async getProductBySKU(sku) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getProductBySKU', { sku })
    } else {
      return this._supabaseFetch('products', { filter: `?sku=eq.${sku}` })
    }
  },

  async updateProductImage(sku, imageUrl) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('updateProductImage', { sku, imageUrl })
    } else {
      return this._supabaseFetch('products', {
        method: 'PATCH',
        filter: `?sku=eq.${sku}`,
        body: { image_url: imageUrl, updated_at: new Date().toISOString() }
      })
    }
  },

  // ── 網單 ─────────────────────────────────────────────────

  async getOrders(storeId, status = '') {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getOrders', { storeId, status })
    } else {
      const f = status
        ? `?store_id=eq.${storeId}&status=eq.${status}&order=created_at.desc`
        : `?store_id=eq.${storeId}&order=created_at.desc`
      return this._supabaseFetch('orders', { filter: f })
    }
  },

  async confirmPickup(orderId, staffId) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('confirmPickup', { orderId, staffId })
    } else {
      return this._supabaseFetch('orders', {
        method: 'PATCH',
        filter: `?id=eq.${orderId}`,
        body: {
          status: 'fulfilled',
          fulfillment_type: 'pickup',
          staff_id: staffId,
          fulfilled_at: new Date().toISOString()
        }
      })
    }
  },

  async fulfillShipping(orderId, trackingCompany, trackingNumber) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('fulfillShipping', { orderId, trackingCompany, trackingNumber })
    } else {
      return this._supabaseFetch('orders', {
        method: 'PATCH',
        filter: `?id=eq.${orderId}`,
        body: {
          status: 'shipped',
          fulfillment_type: 'shipping',
          tracking_company: trackingCompany,
          tracking_number: trackingNumber,
          shipped_at: new Date().toISOString()
        }
      })
    }
  },

  // ── 網店設定（多店管理）────────────────────────────────────

  async getStores() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getStores')
    } else {
      return this._supabaseFetch('stores', { filter: '?order=name.asc' })
    }
  },

  // ── 銷售員 ───────────────────────────────────────────────

  async getStaff() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getStaff')
    } else {
      return this._supabaseFetch('staff', { filter: '?is_active=eq.true&order=name.asc' })
    }
  },

  // ── 客戶資料 ─────────────────────────────────────────────

  async getCustomers() {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getCustomers')
    } else {
      return this._supabaseFetch('customers', { filter: '?order=name.asc' })
    }
  },

  async getCustomerById(id) {
    if (DB_CONFIG.source === 'google') {
      return this._googleFetch('getCustomerById', { id })
    } else {
      return this._supabaseFetch('customers', { filter: `?id=eq.${id}` })
    }
  }

}
