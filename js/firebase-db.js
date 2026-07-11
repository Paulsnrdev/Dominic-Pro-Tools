/* Firestore REST client — no CDN imports, no ES modules */
(function () {
  const PROJECT = 'dominic-pro-tools';
  const API_KEY = 'AIzaSyAOwePcIYoEWlxkIVg_vWWL6B8QZk3Hs6s';
  const BASE    = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/dpt_data';

  const KEY_MAP = {
    dpt_product_overrides: { docId: 'product_overrides', list: false },
    dpt_products_custom:   { docId: 'custom_products',   list: true  },
    dpt_cat_overrides:     { docId: 'cat_overrides',     list: false },
    dpt_cats_custom:       { docId: 'cats_custom',       list: true  },
    dpt_sale:              { docId: 'sale',               list: false },
  };

  async function fsGet(docId) {
    const res = await fetch(BASE + '/' + docId + '?key=' + API_KEY);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const s = json.fields && json.fields.data && json.fields.data.stringValue;
    return s ? JSON.parse(s) : null;
  }

  async function fsSet(docId, value) {
    const res = await fetch(BASE + '/' + docId + '?key=' + API_KEY + '&updateMask.fieldPaths=data', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields: { data: { stringValue: JSON.stringify(value) } } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(function () { return {}; });
      throw new Error((err.error && err.error.message) || 'HTTP ' + res.status);
    }
  }

  window.DPT_DB = {
    pull: async function () {
      try {
        await Promise.all(Object.keys(KEY_MAP).map(async function (lsKey) {
          const cfg = KEY_MAP[lsKey];
          const val = await fsGet(cfg.docId);
          if (val === null) return;
          localStorage.setItem(lsKey, JSON.stringify(cfg.list ? (val.list || []) : val));
        }));
      } catch (err) {
        console.warn('[DPT_DB] pull failed — using local cache', err);
      }
    },

    push: async function (lsKey, value) {
      const cfg = KEY_MAP[lsKey];
      if (!cfg) return;
      await fsSet(cfg.docId, cfg.list ? { list: value } : value);
    },
  };
})();
