'use strict';
/* ============================================================
 * 核心玩法：经验等级 / 合成 / 订单 / 开箱 / 扩建
 * ============================================================ */

/* ---- 查询与数值 ---- */
function incomeRate() {
  let r = 0;
  for (const c of state.cells) if (c) r += TIERS[c.tier].income;
  return r;
}
function xpNeed(l) { return Math.round(60 * Math.pow(l, 1.7)); }
function freeCd() { return Math.max(1200, Math.round(FREE_CD_BASE * Math.pow(0.96, state.level - 1))); }
function maxTierOnBoard() {
  let m = 0;
  for (const c of state.cells) if (c && c.tier > m) m = c.tier;
  return m;
}
function emptyIdxs() {
  const a = [];
  state.unlocked.forEach((u, i) => { if (u && !state.cells[i]) a.push(i); });
  return a;
}

/* ---- 经验与升级 ---- */
function addXP(x) {
  state.xp += x;
  while (state.xp >= xpNeed(state.level)) {
    state.xp -= xpNeed(state.level);
    state.level++;
    const bonus = state.level * state.level * 50;
    state.coins += bonus; state.stats.earned += bonus;
    SFX.level();
    toast(`🎉 升到 Lv.${state.level}！奖励 ${fmt(bonus)}💰，进货加速`, 'ok');
  }
  updateHUD();
}

/* ---- 生成食物 ---- */
function spawnItem(tier) {
  const a = emptyIdxs();
  if (!a.length) return false;
  const i = rand(a);
  state.cells[i] = { tier };
  renderBoard(); renderOrders();
  const el = cellEls[i];
  el.classList.remove('spawn'); void el.offsetWidth; el.classList.add('spawn');
  return true;
}

/* ---- 合成：src 与 dst 同级 → dst 升 1 级，src 清空 ---- */
function doMerge(src, dst) {
  const t = state.cells[src].tier + 1;
  state.cells[src] = null;
  state.cells[dst] = { tier: t };
  const bonus = TIERS[t].income * 12;
  state.coins += bonus;
  state.stats.earned += bonus;
  state.stats.merges++;
  addXP(t * 4);
  SFX.merge();
  syncGame();
  const el = cellEls[dst];
  el.classList.remove('merged'); void el.offsetWidth; el.classList.add('merged');
  floatAt(el, `+${fmt(bonus)}💰`, 'gold');
}

/* ---- 订单 ---- */
function fulfill(i) {
  const o = state.orders[i];
  if (!o) return;
  const idxs = [];
  state.cells.forEach((c, k) => { if (c && c.tier === o.tier) idxs.push(k); });
  if (idxs.length < o.qty) {
    const card = ordersEl.querySelector(`.order[data-i="${i}"]`);
    if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    SFX.error();
    toast(`需要 ${o.qty} 个「${TIERS[o.tier].name}」，棋盘上只有 ${idxs.length} 个`, 'err');
    return;
  }
  for (let k = 0; k < o.qty; k++) state.cells[idxs[k]] = null;
  state.coins += o.reward;
  state.stats.earned += o.reward;
  state.stats.orders++;
  addXP(o.qty * 12);
  SFX.coin();
  const card = ordersEl.querySelector(`.order[data-i="${i}"]`);
  floatAt(card, `+${fmt(o.reward)}💰`, 'gold');
  state.orders[i] = makeOrderRaw(Math.max(2, maxTierOnBoard() + 1));
  syncGame();
}

function reroll(i) {
  if (state.coins < REROLL_COST) { SFX.error(); toast('金币不足', 'err'); return; }
  state.coins -= REROLL_COST;
  state.orders[i] = makeOrderRaw(Math.max(2, maxTierOnBoard() + 1));
  SFX.click();
  renderOrders(); updateHUD(); save();
}

/* ---- 箱子：min~max 级随机（偏低等级概率更大） ---- */
function rollTier(min, max) {
  const pool = [];
  for (let t = min; t <= max; t++) { const w = max - t + 1; for (let k = 0; k < w; k++) pool.push(t); }
  return rand(pool);
}

function buyBox(cost, roll) {
  if (state.coins < cost) { SFX.error(); toast('金币不足', 'err'); return; }
  if (!emptyIdxs().length) { SFX.error(); toast('棋盘已满，先合成腾出格子', 'err'); return; }
  state.coins -= cost;
  const t = roll();
  spawnItem(t);
  SFX.spawn();
  toast(`开出「${TIERS[t].name}」 Lv.${t}`, 'ok');
  updateHUD(); save();
}

/* ---- 扩建格子 ---- */
function tryBuyCell(idx) {
  const price = ROW_PRICE[rowOf(idx)];
  if (state.coins < price) { SFX.error(); toast(`扩建该格需要 ${fmt(price)}💰`, 'err'); return; }
  state.coins -= price;
  state.unlocked[idx] = true;
  addXP(20);
  SFX.coin();
  toast('扩建成功！', 'ok');
  syncGame();
  const el = cellEls[idx];
  el.classList.remove('spawn'); void el.offsetWidth; el.classList.add('spawn');
}
