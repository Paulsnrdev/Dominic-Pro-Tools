/* ============================================================
   DOMINIC PRO TOOLS — Cart, Checkout & Payments
   ============================================================ */

(function () {
  const CART_KEY     = 'dpt_cart';
  const ORDERS_KEY   = 'dpt_orders';
  const PAYSTACK_KEY = 'pk_live_b74b82c0db73ab70dbf11a1ab50b98e6c22f6310';
  const FORMSPREE    = 'https://formspree.io/f/mqevndzq';

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

  let cart            = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  let pendingCustomer = null;

  function saveCart()  { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function fmt(n)      { return '₦' + Number(n).toLocaleString(); }
  function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
  function totalQty()  { return cart.reduce((s, i) => s + i.qty, 0); }

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

    <div class="order-success-banner" id="orderBanner" style="display:none">
      <i class="fa-solid fa-circle-check"></i>
      <div>
        <strong>Order placed! Save your tracking ID.</strong>
        <span id="orderTrackId" class="track-id-display"></span>
        <span id="orderRef"></span>
        <a id="orderTrackLink" href="track-order.html" class="order-track-link">
          <i class="fa-solid fa-arrow-right"></i> Track your order
        </a>
      </div>
      <button onclick="document.getElementById('orderBanner').style.display='none'">
        <i class="fa-solid fa-xmark"></i>
      </button>
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
    const total = cartTotal();
    document.getElementById('payAmt').textContent  = total.toLocaleString();
    document.getElementById('opayAmt').textContent = total.toLocaleString();
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
    const total = cartTotal();
    document.getElementById('coSummary').innerHTML = `
      <p class="co-sum-hd">ORDER SUMMARY</p>
      ${cart.map(i => `
        <div class="co-sum-row">
          <span>${i.name} &times; ${i.qty}</span>
          <span>${fmt(i.price * i.qty)}</span>
        </div>
      `).join('')}
      <div class="co-sum-total">
        <span>TOTAL</span>
        <span>${fmt(total)}</span>
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
    const address = document.getElementById('coAddress').value.trim();
    if (!name || !email || !phone || !address) {
      alert('Please fill in all fields.'); return;
    }

    pendingCustomer = { name, email, phone, address };

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled    = true;
    btn.textContent = 'Placing Order…';

    const total     = cartTotal();
    const itemsList = cart.map(i =>
      `${i.name} x${i.qty}  —  ₦${(i.price * i.qty).toLocaleString()}`
    ).join('\n');

    try {
      await fetch(FORMSPREE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject:         `New Order — ${name} — ₦${total.toLocaleString()}`,
          customer_name:    name,
          customer_email:   email,
          customer_phone:   phone,
          delivery_address: address,
          order_items:      itemsList,
          order_total:      `₦${total.toLocaleString()}`,
          order_date:       new Date().toLocaleString('en-NG')
        })
      });
    } catch (err) {
      console.warn('Order notification failed:', err);
    }

    btn.disabled    = false;
    btn.textContent = 'PLACE ORDER →';

    // Show payment options view
    document.getElementById('payAmt').textContent  = total.toLocaleString();
    document.getElementById('opayAmt').textContent = total.toLocaleString();
    document.getElementById('coTitle').textContent = 'PAYMENT';
    document.getElementById('coFormView').style.display = 'none';
    document.getElementById('coPayView').style.display  = 'flex';
  });

  // ── STEP 2a: Pay with Paystack ───────────────────────────────
  document.getElementById('payWithPaystackBtn').addEventListener('click', () => {
    const handler = PaystackPop.setup({
      key:      PAYSTACK_KEY,
      email:    pendingCustomer.email,
      amount:   cartTotal() * 100,
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
        const trkId = recordOrder(pendingCustomer, resp.reference, 'Confirmed');
        cart = []; saveCart(); syncCount();
        closeCheckout();
        document.getElementById('orderTrackId').textContent = 'Tracking ID: ' + trkId;
        document.getElementById('orderRef').textContent = 'Payment ref: ' + resp.reference;
        document.getElementById('orderTrackLink').href = 'track-order.html?id=' + trkId;
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
    const trkId = recordOrder(pendingCustomer, 'OPAY_' + Date.now(), 'Awaiting Payment');
    cart = []; saveCart(); syncCount();
    closeCheckout();
    document.getElementById('orderTrackId').textContent = 'Tracking ID: ' + trkId;
    document.getElementById('orderRef').textContent = 'Pending payment verification by seller.';
    document.getElementById('orderTrackLink').href = 'track-order.html?id=' + trkId;
    showSuccessBanner(10000);
  });

  // ── Success banner ───────────────────────────────────────────
  function showSuccessBanner(ms) {
    const banner = document.getElementById('orderBanner');
    banner.style.display = 'flex';
    setTimeout(() => banner.style.display = 'none', ms || 8000);
  }

  // ── Record order to localStorage ─────────────────────────────
  function recordOrder(customer, ref, status) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const trackingId = generateTrackingId();
    orders.unshift({
      id:         'ORD-' + Date.now(),
      trackingId,
      date:       new Date().toISOString(),
      customer,
      items:      JSON.parse(JSON.stringify(cart)),
      total:      cartTotal(),
      status:     status || 'Awaiting Payment',
      ref
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

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

  // ── Init ─────────────────────────────────────────────────────
  syncCount();
})();
