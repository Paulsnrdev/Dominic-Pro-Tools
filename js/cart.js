/* ============================================================
   DOMINIC PRO TOOLS — Cart, Checkout & Payments
   ============================================================ */

(function () {
  const CART_KEY     = 'dpt_cart';
  const ORDERS_KEY   = 'dpt_orders';
  const PAYSTACK_KEY = 'pk_live_b74b82c0db73ab70dbf11a1ab50b98e6c22f6310';
  const FORMSPREE    = 'https://formspree.io/f/mqevndzq';

  const DELIVERY_ZONES = {
    pickup:    { label: 'Self Pickup',                                      fee: 0    },
    ibadan:    { label: 'Within Ibadan',                                    fee: 2000 },
    lagos:     { label: 'Lagos State',                                      fee: 4000 },
    southwest: { label: 'South West (Abeokuta, Osun, Ekiti, Ondo)',         fee: 4500 },
    other:     { label: 'Other Nigerian States / Outside Nigeria',          fee: null },
  };

  function generateTrackingId() {
    const year = new Date().getFullYear();
    const existing = new Set(
      JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]').map(o => o.trackingId)
    );
    let id;
    do {
      const digits = String(Math.floor(Math.random() * 9000) + 1000);
      id = 'DMT-' + year + '-' + digits;
    } while (existing.has(id));
    return id;
  }

  let cart               = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  let pendingCustomer    = null;
  let pendingOrderTrackId = null;

  function saveCart()    { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function fmt(n)        { return '₦' + Number(n).toLocaleString(); }
  function cartTotal()   { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
  function totalQty()    { return cart.reduce((s, i) => s + i.qty, 0); }
  function deliveryFee() {
    const sel = document.getElementById('coDeliveryZone');
    if (!sel || !sel.value) return 0;
    const zone = DELIVERY_ZONES[sel.value];
    return zone ? (zone.fee || 0) : 0;
  }
  function grandTotal()  { return cartTotal() + deliveryFee(); }

  // ── Inject HTML ──────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-overlay" id="cartOverlay"></div>
    <aside class="cart-drawer" id="cartDrawer">
      <div class="cart-drawer-hd">
        <span>YOUR CART (<span id="drawerQty">0</span>)</span>
        <button class="cart-x" id="cartClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="cart-drawer-body">
        <ul class="cart-list" id="cartList"></ul>
        <div class="cart-empty" id="cartEmpty">
          <i class="fa-solid fa-cart-shopping"></i>
          <p>Your cart is empty</p>
          <a href="products.html" class="btn btn-yellow" style="font-size:.8rem;padding:.7rem 1.4rem">SHOP NOW</a>
        </div>
      </div>
      <div class="cart-drawer-ft" id="cartFt">
        <div class="cart-subtotal">
          <span>SUBTOTAL</span>
          <strong id="cartSubtotal">&#8358;0</strong>
        </div>
        <button class="btn-checkout" id="checkoutOpenBtn">
          CHECKOUT <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </aside>

    <!-- ════ CHECKOUT MODAL ════ -->
    <div class="co-overlay" id="coOverlay">
      <div class="co-modal">
        <div class="co-modal-hd">
          <span id="coTitle">CHECKOUT</span>
          <button class="cart-x" id="coClose"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <!-- VIEW 1 — Order form -->
        <div class="co-modal-body" id="coFormView">
          <div class="co-summary" id="coSummary"></div>
          <form id="coForm" novalidate>
            <div class="co-field">
              <label>FULL NAME</label>
              <input type="text" id="coName" placeholder="Your full name" required />
            </div>
            <div class="co-field">
              <label>EMAIL ADDRESS</label>
              <input type="email" id="coEmail" placeholder="you@email.com" required />
            </div>
            <div class="co-field">
              <label>PHONE NUMBER</label>
              <input type="tel" id="coPhone" placeholder="+234 800 000 0000" required />
            </div>
            <div class="co-field">
              <label>DELIVERY ZONE <span style="color:#e11d48">*</span></label>
              <select id="coDeliveryZone" required>
                <option value="">— Select your delivery zone —</option>
                <option value="pickup">Self Pickup — Free</option>
                <option value="ibadan">Within Ibadan — ₦2,000</option>
                <option value="lagos">Lagos State — ₦4,000</option>
                <option value="southwest">South West (Abeokuta, Osun, Ekiti, Ondo) — ₦4,500</option>
                <option value="other">Other Nigerian States / Outside Nigeria — Price TBA</option>
              </select>
            </div>
            <div class="co-field">
              <label>DELIVERY ADDRESS</label>
              <textarea id="coAddress" placeholder="Street, City, State" required></textarea>
            </div>
            <button type="submit" class="btn-place-order" id="placeOrderBtn">
              PLACE ORDER &rarr;
            </button>
          </form>
        </div>

        <!-- VIEW 2 — Payment options -->
        <div class="co-modal-body" id="coPayView" style="display:none">
          <div class="co-confirmed-banner">
            <i class="fa-solid fa-circle-check"></i>
            <div>
              <p class="co-confirmed-title">Order Received!</p>
              <p class="co-confirmed-sub">Seller notified. Choose how to pay below:</p>
            </div>
          </div>
          <div class="co-pay-amount">
            Amount to Pay: <strong>&#8358;<span id="payAmt">0</span></strong>
          </div>
          <div class="co-pay-options">
            <button class="btn-pay-opt paystack-opt" id="payWithPaystackBtn">
              <i class="fa-solid fa-lock"></i> Pay with Paystack
            </button>
            <button class="btn-pay-opt opay-opt" id="payWithOpayBtn">
              <i class="fa-solid fa-mobile-screen-button"></i> Pay via Opay Transfer
            </button>
          </div>
          <div class="opay-details" id="opayDetails" style="display:none">
            <p class="opay-hd">OPAY TRANSFER DETAILS</p>
            <div class="opay-row"><span>Bank</span><strong>Opay</strong></div>
            <div class="opay-row"><span>Account Number</span><strong class="opay-acct">8135482358</strong></div>
            <div class="opay-row"><span>Account Name</span><strong>AYOBAMIJI DOMINIC KALESANWO</strong></div>
            <div class="opay-row"><span>Amount</span><strong>&#8358;<span id="opayAmt">0</span></strong></div>
            <p class="opay-note">Transfer the exact amount, then click the button below once done.</p>
            <button class="btn-opay-confirm" id="opayConfirmBtn">
              <i class="fa-solid fa-check"></i> I Have Transferred
            </button>
          </div>
        </div>

      </div>
    </div>

    <div class="order-success-modal" id="orderBanner" style="display:none">
      <div class="osm-card">
        <div class="osm-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h2 class="osm-title">Order Placed!</h2>
        <p class="osm-subtitle">Save your Tracking ID — you will need it to track your delivery.</p>
        <div class="osm-track-box">
          <span class="osm-track-label">YOUR TRACKING ID</span>
          <span class="osm-track-id" id="orderTrackId"></span>
        </div>
        <button class="osm-copy-btn" id="osmCopyBtn" onclick="copyTrackingId()">
          <i class="fa-solid fa-copy"></i> Copy ID
        </button>
        <p id="orderRef" class="osm-ref"></p>
        <a id="orderTrackLink" href="track-order.html" class="osm-track-link">
          <i class="fa-solid fa-location-arrow"></i> Track your order
        </a>
        <button class="osm-dismiss-btn" onclick="document.getElementById('orderBanner').style.display='none'">
          <i class="fa-solid fa-check"></i> I've saved my Tracking ID
        </button>
      </div>
    </div>
  `);

  // ── Open / close helpers ─────────────────────────────────────
  function openCart() {
    renderCart();
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    document.getElementById('cartDrawer').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
  function openCheckout() {
    closeCart();
    renderSummary();
    resetToFormView();
    document.getElementById('coOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCheckout() {
    document.getElementById('coOverlay').classList.remove('open');
    document.body.style.overflow = '';
    pendingCustomer = null;
    resetToFormView();
  }
  function resetToFormView() {
    document.getElementById('coTitle').textContent               = 'CHECKOUT';
    document.getElementById('coFormView').style.display          = 'flex';
    document.getElementById('coPayView').style.display           = 'none';
    document.getElementById('opayDetails').style.display         = 'none';
    document.getElementById('payWithOpayBtn').style.display      = '';
  }

  // ── Render cart drawer ───────────────────────────────────────
  function renderCart() {
    const list  = document.getElementById('cartList');
    const empty = document.getElementById('cartEmpty');
    const ft    = document.getElementById('cartFt');
    document.getElementById('drawerQty').textContent = totalQty();

    if (cart.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      ft.style.display    = 'none';
      return;
    }
    empty.style.display = 'none';
    ft.style.display    = 'flex';
    document.getElementById('cartSubtotal').textContent = fmt(cartTotal());

    list.innerHTML = cart.map((item, i) => `
      <li class="cart-item">
        <img class="ci-img" src="${item.image}" alt="${item.name}"
             onerror="this.style.background='#f3f4f6';this.removeAttribute('src')" />
        <div class="ci-info">
          <p class="ci-name">${item.name}</p>
          <p class="ci-price">${fmt(item.price)}</p>
          <div class="ci-qty">
            <button class="qty-btn" data-action="dec" data-i="${i}">&#8722;</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-i="${i}">&#43;</button>
          </div>
        </div>
        <button class="ci-del" data-i="${i}"><i class="fa-solid fa-trash-can"></i></button>
      </li>
    `).join('');
  }

  // ── Render checkout summary ──────────────────────────────────
  function renderSummary() {
    const sub  = cartTotal();
    const sel  = document.getElementById('coDeliveryZone');
    const zone = sel && sel.value ? DELIVERY_ZONES[sel.value] : null;
    const fee  = zone ? zone.fee : null;
    const feeLabel = !zone ? '—' : fee === null ? 'TBA' : fee === 0 ? 'Free' : fmt(fee);
    const totalLabel = !zone ? fmt(sub) : fee === null ? fmt(sub) + ' + TBA' : fmt(sub + fee);

    document.getElementById('coSummary').innerHTML = `
      <p class="co-sum-hd">ORDER SUMMARY</p>
      ${cart.map(i => `
        <div class="co-sum-row">
          <span>${i.name} &times; ${i.qty}</span>
          <span>${fmt(i.price * i.qty)}</span>
        </div>
      `).join('')}
      <div class="co-sum-row co-sum-delivery">
        <span>Subtotal</span><span>${fmt(sub)}</span>
      </div>
      <div class="co-sum-row co-sum-delivery">
        <span>Delivery</span><span>${feeLabel}</span>
      </div>
      <div class="co-sum-total">
        <span>TOTAL</span>
        <span>${totalLabel}</span>
      </div>
    `;
  }

  // ── Sync navbar cart count ───────────────────────────────────
  function syncCount() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = totalQty();
  }

  // ── addToCart (global) ───────────────────────────────────────
  window.addToCart = function (btn) {
    const card = btn.closest('.product-card-item');
    if (!card) return;

    const id    = card.dataset.order ? Number(card.dataset.order) : (card.dataset.name || Date.now());
    const name  = (card.querySelector('h4') || card.querySelector('h3'))?.textContent?.trim() || 'Product';
    const raw   = (card.querySelector('.price-current')?.textContent || '0').replace(/[^\d]/g, '');
    const price = parseInt(raw, 10) || 0;
    const image = card.querySelector('img')?.src || '';

    const existing = cart.find(i => i.id == id);
    if (existing) { existing.qty++; }
    else          { cart.push({ id, name, price, image, qty: 1 }); }

    saveCart();
    syncCount();

    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ADDED';
    btn.style.background = '#16a34a';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.background = '';
      btn.disabled = false;
    }, 1600);
  };

  // ── Event wiring ─────────────────────────────────────────────
  document.querySelectorAll('.nav-cart').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); openCart(); })
  );
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutOpenBtn').addEventListener('click', openCheckout);
  document.getElementById('coClose').addEventListener('click', closeCheckout);
  document.getElementById('coOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('coOverlay')) closeCheckout();
  });
  document.getElementById('coDeliveryZone').addEventListener('change', renderSummary);

  document.getElementById('cartList').addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    if      (btn.classList.contains('ci-del'))   { cart.splice(i, 1); }
    else if (btn.dataset.action === 'inc')        { cart[i].qty++; }
    else if (btn.dataset.action === 'dec')        { cart[i].qty--; if (cart[i].qty <= 0) cart.splice(i, 1); }
    saveCart(); syncCount(); renderCart();
  });

  // ── STEP 1: Place Order → notify seller via Formspree ────────
  document.getElementById('coForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name    = document.getElementById('coName').value.trim();
    const email   = document.getElementById('coEmail').value.trim();
    const phone   = document.getElementById('coPhone').value.trim();
    const zoneKey = document.getElementById('coDeliveryZone').value;
    const address = document.getElementById('coAddress').value.trim();
    if (!name || !email || !phone || !zoneKey || !address) {
      alert('Please fill in all fields including delivery zone.'); return;
    }

    const zoneInfo  = DELIVERY_ZONES[zoneKey];
    const fee       = zoneInfo.fee;                          // null = TBA
    const subtotal  = cartTotal();
    const grand     = subtotal + (fee || 0);
    const feeStr    = fee === null ? 'TBA — seller will confirm' : fee === 0 ? 'Free' : `₦${fee.toLocaleString()}`;

    pendingCustomer = { name, email, phone, address, zoneLabel: zoneInfo.label, deliveryFee: fee, grandTotal: grand };

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled    = true;
    btn.textContent = 'Placing Order…';

    const itemsList = cart.map(i =>
      `${i.name} x${i.qty}  —  ₦${(i.price * i.qty).toLocaleString()}`
    ).join('\n');

    try {
      await fetch(FORMSPREE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject:         `New Order — ${name} — ₦${grand.toLocaleString()}`,
          customer_name:    name,
          customer_email:   email,
          customer_phone:   phone,
          delivery_zone:    zoneInfo.label,
          delivery_fee:     feeStr,
          delivery_address: address,
          order_items:      itemsList,
          items_subtotal:   `₦${subtotal.toLocaleString()}`,
          order_total:      fee === null ? `₦${subtotal.toLocaleString()} + delivery TBA` : `₦${grand.toLocaleString()}`,
          order_date:       new Date().toLocaleString('en-NG')
        })
      });
    } catch (err) {
      console.warn('Order notification failed:', err);
    }

    btn.disabled    = false;
    btn.textContent = 'PLACE ORDER →';

    // Record order NOW so admin sees it before payment
    pendingOrderTrackId = recordOrder(pendingCustomer, null, 'Awaiting Payment', grand);

    // Show payment options view
    const payDisplay = fee === null
      ? `${subtotal.toLocaleString()} <small style="font-size:.75em;color:#6b7280">(+ delivery TBA)</small>`
      : grand.toLocaleString();
    document.getElementById('payAmt').innerHTML  = payDisplay;
    document.getElementById('opayAmt').innerHTML = payDisplay;
    document.getElementById('coTitle').textContent = 'PAYMENT';
    document.getElementById('coFormView').style.display = 'none';
    document.getElementById('coPayView').style.display  = 'flex';
  });

  // ── STEP 2a: Pay with Paystack ───────────────────────────────
  document.getElementById('payWithPaystackBtn').addEventListener('click', () => {
    const handler = PaystackPop.setup({
      key:      PAYSTACK_KEY,
      email:    pendingCustomer.email,
      amount:   pendingCustomer.grandTotal * 100,
      currency: 'NGN',
      ref:      'DPT_' + Date.now(),
      metadata: {
        custom_fields: [
          { display_name: 'Name',    variable_name: 'name',    value: pendingCustomer.name    },
          { display_name: 'Phone',   variable_name: 'phone',   value: pendingCustomer.phone   },
          { display_name: 'Address', variable_name: 'address', value: pendingCustomer.address },
        ]
      },
      callback: function (resp) {
        updateOrderStatus(pendingOrderTrackId, 'Confirmed', resp.reference);
        cart = []; saveCart(); syncCount();
        closeCheckout();
        document.getElementById('orderTrackId').textContent = pendingOrderTrackId;
        document.getElementById('orderRef').textContent = 'Payment ref: ' + resp.reference;
        document.getElementById('orderTrackLink').href = 'track-order.html?id=' + pendingOrderTrackId;
        showSuccessBanner();
      },
      onClose: function () {}
    });
    handler.openIframe();
  });

  // ── STEP 2b: Pay via Opay ────────────────────────────────────
  document.getElementById('payWithOpayBtn').addEventListener('click', () => {
    document.getElementById('opayDetails').style.display    = 'block';
    document.getElementById('payWithOpayBtn').style.display = 'none';
  });

  document.getElementById('opayConfirmBtn').addEventListener('click', () => {
    updateOrderStatus(pendingOrderTrackId, 'Awaiting Payment', 'OPAY_' + Date.now());
    cart = []; saveCart(); syncCount();
    closeCheckout();
    document.getElementById('orderTrackId').textContent = pendingOrderTrackId;
    document.getElementById('orderRef').textContent = 'Pending payment verification by seller.';
    document.getElementById('orderTrackLink').href = 'track-order.html?id=' + pendingOrderTrackId;
    showSuccessBanner();
  });

  // ── Success modal — stays until customer dismisses ───────────
  function showSuccessBanner() {
    document.getElementById('orderBanner').style.display = 'flex';
  }

  function copyTrackingId() {
    const id  = document.getElementById('orderTrackId').textContent;
    const btn = document.getElementById('osmCopyBtn');
    navigator.clipboard.writeText(id).then(() => {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy ID'; }, 2500);
    });
  }

  // ── Record order to localStorage ─────────────────────────────
  function recordOrder(customer, ref, status, total) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const trackingId = generateTrackingId();
    orders.unshift({
      id:         'ORD-' + Date.now(),
      trackingId,
      date:       new Date().toISOString(),
      customer,
      items:      JSON.parse(JSON.stringify(cart)),
      total:      total !== undefined ? total : cartTotal(),
      status:     status || 'Awaiting Payment',
      ref
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    if (window.DPT_DB) window.DPT_DB.push('dpt_orders', orders).catch(console.warn);

    const overrides = JSON.parse(localStorage.getItem('dpt_product_overrides') || '{}');
    const base = window.DPT_BASE_PRODUCTS || [];
    cart.forEach(ci => {
      const bp = base.find(p => p.id == ci.id);
      if (!bp) return;
      if (!overrides[ci.id]) overrides[ci.id] = {};
      const cur = overrides[ci.id].stock !== undefined ? overrides[ci.id].stock : bp.stock;
      overrides[ci.id].stock = Math.max(0, cur - ci.qty);
    });
    localStorage.setItem('dpt_product_overrides', JSON.stringify(overrides));
    return trackingId;
  }

  function updateOrderStatus(trackingId, status, ref) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const order  = orders.find(o => o.trackingId === trackingId);
    if (!order) return;
    order.status = status;
    if (ref) order.ref = ref;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    if (window.DPT_DB) window.DPT_DB.push('dpt_orders', orders).catch(console.warn);
  }

  // ── Init ─────────────────────────────────────────────────────
  syncCount();
})();
