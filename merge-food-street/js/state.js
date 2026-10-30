'use strict';
/* ============================================================
 * 游戏状态：创建 / 读档 / 存档
 * ============================================================ */
let state = null;

/* 生成一张订单：cap = 最高可选等级（偏低等级概率更大） */
function makeOrderRaw(cap) {
  const c = Math.max(2, Math.min(cap, 13));
  const pool = [];
  for (let t = 1; t <= c; t++) { const w = c - t + 2; for (let k = 0; k < w; k++) pool.push(t); }
  const tier = rand(pool);
  const qty = Math.random() < 0.3 ? 2 : 1;
  const reward = Math.round(TIERS[tier].income * 90 * qty * (1.1 + Math.random() * 0.5));
  return { tier, qty, reward };
}

function newState() {
  const cells = Array(N).fill(null);
  const unlocked = Array(N).fill(false);
  for (let i = 0; i < 15; i++) unlocked[i] = true;
  cells[7] = { tier: 1 }; cells[12] = { tier: 1 }; cells[10] = { tier: 2 };
  return {
    v: 1, coins: 300, level: 1, xp: 0, cells, unlocked,
    orders: [makeOrderRaw(2), makeOrderRaw(2), makeOrderRaw(3)],
    freeReadyAt: 0, muted: false, lastSeen: Date.now(),
    stats: { merges: 0, orders: 0, earned: 0 }
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || s.v !== 1) return false;
    state = Object.assign(newState(), s);
    state.stats = Object.assign({ merges: 0, orders: 0, earned: 0 }, s.stats);
    if (!Array.isArray(state.orders)) state.orders = [];
    while (state.orders.length < 3) state.orders.push(makeOrderRaw(3));
    state.orders = state.orders.slice(0, 3);
    return true;
  } catch (e) { return false; }
}

function save() {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {}
}
