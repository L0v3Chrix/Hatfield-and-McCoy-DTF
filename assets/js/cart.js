/* ============================================================
   Hatfield & McCoy DTF — Cart State (localStorage)
   ============================================================
   Contract:
     Cart.add(item)       -> item: {sku, name, variant, price, qty, thumb?, file?}
     Cart.remove(sku, variant)
     Cart.updateQty(sku, variant, qty)
     Cart.getItems()      -> [item, ...]
     Cart.getTotal()      -> number
     Cart.getCount()      -> number (total qty across items)
     Cart.clear()
   Events (on window):
     'cart:changed'        dispatched on any mutation
   Storage key: hm_cart_v1
   ============================================================ */
(function () {
  const STORAGE_KEY = 'hm_cart_v1';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[cart] failed to parse cart storage', err);
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('[cart] failed to save cart', err);
    }
  }

  function notify() {
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: Cart.getItems() }));
  }

  function findIndex(items, sku, variant) {
    return items.findIndex(i => i.sku === sku && (i.variant || '') === (variant || ''));
  }

  const Cart = {
    add(item) {
      if (!item || !item.sku) {
        console.warn('[cart] add() requires {sku}');
        return;
      }
      const items = load();
      const idx = findIndex(items, item.sku, item.variant);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (idx >= 0) {
        items[idx].qty += qty;
        if (item.file) items[idx].file = item.file;
      } else {
        items.push({
          sku: item.sku,
          name: item.name || item.sku,
          variant: item.variant || '',
          price: Number(item.price) || 0,
          qty,
          thumb: item.thumb || '',
          file: item.file || null,
          addedAt: Date.now()
        });
      }
      save(items);
      notify();
    },
    remove(sku, variant) {
      const items = load();
      const idx = findIndex(items, sku, variant);
      if (idx >= 0) {
        items.splice(idx, 1);
        save(items);
        notify();
      }
    },
    updateQty(sku, variant, qty) {
      const items = load();
      const idx = findIndex(items, sku, variant);
      if (idx < 0) return;
      const next = Math.max(0, Math.floor(Number(qty) || 0));
      if (next === 0) {
        items.splice(idx, 1);
      } else {
        items[idx].qty = next;
      }
      save(items);
      notify();
    },
    getItems() {
      return load();
    },
    getTotal() {
      return load().reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    },
    getCount() {
      return load().reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    },
    clear() {
      save([]);
      notify();
    }
  };

  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) notify();
  });

  window.Cart = Cart;

  /* --- Drawer UI wiring (all DOM built with createElement/textContent) --- */
  function money(n) {
    return '$' + Number(n).toFixed(2);
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(k => {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'dataset') {
          Object.keys(props[k]).forEach(d => { node.dataset[d] = props[k][d]; });
        } else if (k.startsWith('on') && typeof props[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else {
          node.setAttribute(k, props[k]);
        }
      });
    }
    if (children) children.forEach(c => c && node.appendChild(c));
    return node;
  }

  function buildItemRow(item) {
    const row = el('div', { class: 'cart-item', dataset: { sku: item.sku, variant: item.variant || '' } });

    const thumb = el('div', { class: 'cart-item-thumb', 'aria-hidden': 'true' });
    const body = el('div', { class: 'cart-item-body' });
    body.appendChild(el('div', { class: 'cart-item-name', text: item.name }));
    if (item.variant) body.appendChild(el('div', { class: 'cart-item-variant', text: item.variant }));
    if (item.file) body.appendChild(el('div', { class: 'cart-item-file', text: 'Artwork: ' + item.file }));

    const controls = el('div', { class: 'cart-item-controls' });
    const dec = el('button', { class: 'qty-btn', 'aria-label': 'Decrease quantity', text: '−',
      onclick: () => Cart.updateQty(item.sku, item.variant, item.qty - 1) });
    const qtyInput = el('input', { class: 'qty-input', type: 'number', min: '1', value: String(item.qty), 'aria-label': 'Quantity' });
    qtyInput.addEventListener('change', (e) => {
      const n = parseInt(e.target.value, 10);
      Cart.updateQty(item.sku, item.variant, isNaN(n) ? 1 : n);
    });
    const inc = el('button', { class: 'qty-btn', 'aria-label': 'Increase quantity', text: '+',
      onclick: () => Cart.updateQty(item.sku, item.variant, item.qty + 1) });
    const remove = el('button', { class: 'cart-remove', 'aria-label': 'Remove item', text: 'Remove',
      onclick: () => Cart.remove(item.sku, item.variant) });

    controls.appendChild(dec);
    controls.appendChild(qtyInput);
    controls.appendChild(inc);
    controls.appendChild(remove);
    body.appendChild(controls);

    const price = el('div', { class: 'cart-item-price', text: money(item.price * item.qty) });

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(price);
    return row;
  }

  function renderDrawer() {
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const emptyEl = document.getElementById('cart-empty');
    const checkout = document.getElementById('cart-checkout');
    if (!list || !totalEl) return;

    const items = Cart.getItems();
    while (list.firstChild) list.removeChild(list.firstChild);

    if (items.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      if (checkout) checkout.disabled = true;
      totalEl.textContent = money(0);
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (checkout) checkout.disabled = false;

    items.forEach(i => list.appendChild(buildItemRow(i)));
    totalEl.textContent = money(Cart.getTotal());
  }

  function renderCount() {
    const el = document.getElementById('cart-count');
    const btn = document.querySelector('.cart-btn');
    if (!el) return;
    const n = Cart.getCount();
    el.textContent = n;
    if (btn) btn.setAttribute('aria-label', 'Cart, ' + n + ' item' + (n === 1 ? '' : 's'));
  }

  function openCart() {
    const drawer = document.getElementById('cart-drawer');
    const scrim = document.getElementById('cart-scrim');
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.removeAttribute('inert');
    if (scrim) scrim.classList.add('open');
    document.body.classList.add('cart-open');
    const close = drawer.querySelector('.cart-close');
    if (close) close.focus();
  }

  function closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const scrim = document.getElementById('cart-scrim');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    if (scrim) scrim.classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  window.openCart = openCart;
  window.closeCart = closeCart;

  function wireDrawer() {
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
      });
    }

    const close = document.querySelector('.cart-close');
    if (close) close.addEventListener('click', closeCart);

    const scrim = document.getElementById('cart-scrim');
    if (scrim) scrim.addEventListener('click', closeCart);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('cart-open')) {
        closeCart();
      }
    });

    const checkout = document.getElementById('cart-checkout');
    if (checkout) {
      checkout.addEventListener('click', () => {
        alert('Checkout launches with the full Shopify integration at final launch. Your cart is saved locally and will carry over.');
      });
    }
  }

  window.addEventListener('cart:changed', () => {
    renderCount();
    renderDrawer();
  });

  window.addEventListener('DOMContentLoaded', () => {
    wireDrawer();
    renderCount();
    renderDrawer();
  });
})();
