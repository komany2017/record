'use strict';
/* ============================================================
 * 视图层：DOM 缓存 + 渲染 + 特效（toast / 漂浮数字 / 弹窗）
 * ============================================================ */

/* ---- DOM 缓存 ---- */
const boardEl = $('board'), ordersEl = $('orders'), fxEl = $('fx'), toastsEl = $('toasts');
const coinsEl = $('coins'), rateEl = $('rate'), lvlEl = $('lvl'), xpfill = $('xpfill'), xptext = $('xptext');
const btnFree = $('btnFree'), freeSub = $('freeSub');
const btnBox1 = $('btnBox1'), btnBox2 = $('btnBox2');
const modalEl = $('modal'), modalCard = $('modalCard');
let cellEls = [];

/* ---- 棋盘 ---- */
function buildBoard() {
  boardEl.innerHTML = '';
  cellEls = [];
  for (let i = 0; i < N; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.idx = i;
    boardEl.appendChild(d);
    cellEls.push(d);
  }
}

function renderBoard() {
  for (let i = 0; i < N; i++) {
    const el = cellEls[i];
    const item = state.cells[i];
    const locked = !state.unlocked[i];
    el.className = 'cell' + (locked ? ' locked' : '') + (item ? ' filled' : '');
    el.style.setProperty('--h', item ? hueOf(item.tier) : 260);
    if (locked) {
      el.innerHTML = `<div class="lock">🔒</div><div class="price">${fmt(ROW_PRICE[rowOf(i)])}💰</div>`;
    } else if (item) {
      el.innerHTML = `<span class="badge">${item.tier}</span><span class="emoji">${TIERS[item.tier].emoji}</span>`;
    } else {
      el.innerHTML = '';
    }
  }
}

/* ---- 订单 ---- */
function renderOrders() {
  ordersEl.innerHTML = state.orders.map((o, i) => {
    const t = TIERS[o.tier];
    let have = 0;
    state.cells.forEach(c => { if (c && c.tier === o.tier) have++; });
    const ok = have >= o.qty;
    return `<div class="order" data-i="${i}">
      <button class="o-reroll" data-reroll="${i}" title="换一单 ${REROLL_COST}💰">🔄</button>
      <div class="o-emoji">${t.emoji}</div>
      <div class="o-info">
        <div class="o-name">${t.name} <b>×${o.qty}</b></div>
        <div class="o-reward">+${fmt(o.reward)}💰 <span class="o-xp">+${o.qty * 12}XP</span></div>
      </div>
      <button class="o-btn${ok ? '' : ' dim'}" data-i="${i}">交付</button>
    </div>`;
  }).join('');
}

/* ---- HUD ---- */
function updateHUD() {
  coinsEl.textContent = fmt(state.coins);
  rateEl.textContent = fmt(incomeRate()) + '/s';
  lvlEl.textContent = state.level;
  const need = xpNeed(state.level);
  xpfill.style.width = Math.min(100, state.xp / need * 100) + '%';
  xptext.textContent = fmt(Math.floor(state.xp)) + '/' + fmt(need);
  updateButtons();
}

function updateButtons() {
  const now = Date.now();
  const cd = freeCd();
  const rem = Math.max(0, state.freeReadyAt - now);
  if (rem > 0) {
    btnFree.disabled = true;
    btnFree.style.setProperty('--p', (rem / cd * 100) + '%');
    freeSub.textContent = (rem / 1000).toFixed(1) + 's';
  } else {
    btnFree.disabled = false;
    btnFree.style.setProperty('--p', '0%');
    freeSub.textContent = '已就绪';
  }
  const hasEmpty = emptyIdxs().length > 0;
  btnBox1.disabled = state.coins < BOX1_COST || !hasEmpty;
  btnBox2.disabled = state.coins < BOX2_COST || !hasEmpty;
}

/* 刷新整个视图 */
function renderAll() { renderBoard(); renderOrders(); updateHUD(); }

/* 刷新视图并保存 */
function syncGame() { renderBoard(); renderOrders(); updateHUD(); save(); }

/* ---- 特效 ---- */
function floatAt(el, text, cls) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = 'float ' + (cls || '');
  s.textContent = text;
  s.style.left = (r.left + r.width / 2) + 'px';
  s.style.top = (r.top + r.height / 3) + 'px';
  fxEl.appendChild(s);
  setTimeout(() => s.remove(), 1000);
}

function toast(msg, type) {
  const d = document.createElement('div');
  d.className = 'toast ' + (type || '');
  d.textContent = msg;
  toastsEl.appendChild(d);
  setTimeout(() => d.remove(), 2100);
}

function showModal(html) { modalCard.innerHTML = html; modalEl.classList.remove('hidden'); }
function closeModal() { modalEl.classList.add('hidden'); resetArmed = false; }
