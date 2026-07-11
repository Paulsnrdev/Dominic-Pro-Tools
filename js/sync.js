/* DPT Cloud Sync — intercepts localStorage.setItem and pushes to Firebase */
(function () {
  var DPT_KEYS = [
    'dpt_product_overrides',
    'dpt_products_custom',
    'dpt_cat_overrides',
    'dpt_cats_custom',
    'dpt_sale',
  ];

  /* Create a toast div that doesn't depend on anything in the HTML */
  function showToast(ok, msg) {
    var t = document.getElementById('dpt-sync-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dpt-sync-toast';
      t.style.cssText = [
        'position:fixed', 'bottom:1.5rem', 'right:1.5rem', 'z-index:99999',
        'padding:.65rem 1.2rem', 'border-radius:5px', 'font:700 .82rem/1 Inter,sans-serif',
        'letter-spacing:.04em', 'color:#fff', 'opacity:0',
        'transition:opacity .3s', 'pointer-events:none',
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent  = ok ? '✓ Synced to cloud' : ('✗ ' + (msg || 'Cloud sync failed'));
    t.style.background = ok ? '#16a34a' : '#ef4444';
    t.style.opacity    = '1';
    clearTimeout(window._dptSyncTimer);
    window._dptSyncTimer = setTimeout(function () { t.style.opacity = '0'; }, 4000);
  }

  /* Intercept localStorage.setItem */
  var _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (this !== localStorage) return;
    if (!DPT_KEYS.includes(key)) return;

    if (!window.DPT_DB) {
      showToast(false, 'Firebase not loaded');
      return;
    }

    var parsed;
    try { parsed = JSON.parse(value); } catch (_) { return; }

    window.DPT_DB.push(key, parsed)
      .then(function ()  { showToast(true); })
      .catch(function (e){ showToast(false, e.message); });
  };
})();
