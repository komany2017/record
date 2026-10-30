'use strict';
/* ============================================================
 * 入口：事件绑定 + 主循环 + 启动
 * ============================================================ */

/* ---- 底部按钮 ---- */
btnFree.addEventListener('click', () => {
  if (Date.now() < state.freeReadyAt) return;
  if (!emptyIdxs().length) { SFX.error(); toast('棋盘已满，先合成腾出格子', 'err'); return; }
  const tier = Math.random() < 0.78 ? 1 : 2;
  spawnItem(tier);
  state.freeReadyAt = Date.now() + freeCd();
  SFX.spawn();
  updateHUD(); save();
});

btnBox1.addEventListener('click', () => buyBox(BOX1_COST, () => rollTier(1, 3)));
btnBox2.addEventListener('click', () => buyBox(BOX2_COST, () => rollTier(3, 6)));

/* ---- 订单区（事件委托） ---- */
ordersEl.addEventListener('click', e => {
  const r = e.target.closest('[data-reroll]');
  if (r) { reroll(+r.dataset.reroll); return; }
  const b = e.target.closest('[data-i]');
  if (b) fulfill(+b.dataset.i);
});

/* ---- 静音 / 帮助 ---- */
$('btnMute').addEventListener('click', () => {
  state.muted = !state.muted;
  $('btnMute').textContent = state.muted ? '🔇' : '🔊';
  save();
});
$('btnHelp').addEventListener('click', showHelp);

/* ---- 弹窗：点背景 / 关闭按钮 ---- */
modalEl.addEventListener('click', e => {
  if (e.target === modalEl || e.target.closest('[data-close]')) closeModal();
});

/* ---- 重置存档（双击确认） ---- */
let resetArmed = false;
modalCard.addEventListener('click', e => {
  const r = e.target.closest('[data-reset]');
  if (!r) return;
  if (!resetArmed) {
    resetArmed = true;
    r.textContent = '再点一次确认清档';
    r.classList.add('danger');
    return;
  }
  localStorage.removeItem(SAVE_KEY);
  state = newState();
  $('btnMute').textContent = '🔊';
  closeModal();
  renderAll();
  save();
  toast('已重置存档', 'ok');
});

/* ---- 帮助弹窗 ---- */
function showHelp() {
  const s = state.stats;
  showModal(`
    <h2>🏮 玩法说明</h2>
    <ul>
      <li><b>拖动</b>两个相同食物到一起 → 合成更高级美食（共 15 级）</li>
      <li>每个美食<b>每秒自动产出</b>金币，等级越高产出越高</li>
      <li>完成<b>顾客订单</b>获得大额金币与经验</li>
      <li>🧺 免费进货有冷却；📦🎁 箱子必得食物</li>
      <li>点击 🔒 格子花金币<b>扩建</b>美食街</li>
      <li>离线时美食街以 50% 效率继续赚钱（上限 8 小时）</li>
    </ul>
    <div class="stats-grid">
      <div class="stat"><b>${fmt(s.earned)}</b><span>累计收益</span></div>
      <div class="stat"><b>${fmt(s.merges)}</b><span>合成次数</span></div>
      <div class="stat"><b>${fmt(s.orders)}</b><span>完成订单</span></div>
    </div>
    <button class="modal-btn" data-close>开始经营</button>
    <button class="modal-btn ghost" data-reset>重置存档</button>
  `);
}

/* ---- 离线收益结算 ---- */
function offlineCheck() {
  const dt = (Date.now() - state.lastSeen) / 1000;
  const rate = incomeRate();
  if (dt > 60 && rate > 0) {
    const eff = Math.min(dt, OFFLINE_CAP);
    const gain = rate * OFFLINE_RATE * eff;
    if (gain >= 1) {
      state.coins += gain;
      state.stats.earned += gain;
      const h = Math.floor(dt / 3600), m = Math.floor((dt % 3600) / 60);
      showModal(`
        <h2>欢迎回来 🏮</h2>
        <p class="dim">离线 ${h > 0 ? h + ' 小时 ' : ''}${m} 分钟</p>
        <p>美食街替你赚了</p>
        <p class="big-gold">+${fmt(gain)} 💰</p>
        <p class="dim small">（按 50% 收益率结算，上限 8 小时）</p>
        <button class="modal-btn" data-close>开心收下</button>
      `);
      SFX.coin();
    }
  }
}

/* ---- 主循环 ---- */
setInterval(() => {                       /* 每 0.1s 结算一次收益 */
  const r = incomeRate();
  if (r > 0) { state.coins += r * 0.1; state.stats.earned += r * 0.1; }
  updateHUD();
}, 100);
setInterval(save, 4000);                  /* 自动存档 */
setInterval(() => {                       /* 漂浮收益数字（氛围） */
  const occ = [];
  state.cells.forEach((c, i) => { if (c) occ.push(i); });
  if (occ.length) {
    const i = rand(occ), c = state.cells[i];
    floatAt(cellEls[i], '+' + fmt(TIERS[c.tier].income * 2.6) + '💰', 'soft');
  }
}, 2600);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
document.addEventListener('pointerdown', () => { try { ac().resume(); } catch (e) {} });

/* ---- 启动 ---- */
buildBoard();
const hadSave = load();
if (!state) state = newState();
$('btnMute').textContent = state.muted ? '🔇' : '🔊';
renderAll();
if (hadSave) offlineCheck(); else save();
