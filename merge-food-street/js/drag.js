'use strict';
/* ============================================================
 * 拖拽交互：Pointer Events（鼠标 + 触屏）
 *   - 拖到空格 → 移动
 *   - 拖到同级 → 合成（绿色高亮提示）
 *   - 拖到不同级 → 交换
 * ============================================================ */
let drag = null;

boardEl.addEventListener('pointerdown', e => {
  if (drag) return;
  const cellEl = e.target.closest('.cell');
  if (!cellEl) return;
  const idx = +cellEl.dataset.idx;
  if (!state.cells[idx]) return;
  e.preventDefault();
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = TIERS[state.cells[idx].tier].emoji;
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  document.body.appendChild(ghost);
  cellEl.classList.add('lifting');
  drag = { idx, ghost, pid: e.pointerId, targetIdx: null };
});

window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  drag.ghost.style.left = e.clientX + 'px';
  drag.ghost.style.top = e.clientY + 'px';
  const el = document.elementsFromPoint(e.clientX, e.clientY)
    .find(n => n.classList && n.classList.contains('cell') && !n.classList.contains('locked'));
  setDropTarget(el ? +el.dataset.idx : null);
});

function setDropTarget(idx) {
  if (drag.targetIdx === idx) return;
  if (drag.targetIdx != null) {
    const p = cellEls[drag.targetIdx];
    p.classList.remove('drop-here', 'drop-merge');
  }
  drag.targetIdx = idx;
  if (idx != null) {
    const el = cellEls[idx];
    el.classList.add('drop-here');
    const srcT = state.cells[drag.idx].tier;
    const dst = state.cells[idx];
    if (dst && dst.tier === srcT && srcT < MAX_TIER) el.classList.add('drop-merge');
  }
}

window.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  finishDrag();
});
window.addEventListener('pointercancel', () => { if (drag) finishDrag(); });

function finishDrag() {
  const d = drag;
  drag = null;
  d.ghost.remove();
  cellEls.forEach(c => c.classList.remove('lifting', 'drop-here', 'drop-merge'));
  const dstIdx = d.targetIdx;
  if (dstIdx == null || dstIdx === d.idx) { renderBoard(); return; }
  const a = state.cells[d.idx], b = state.cells[dstIdx];
  if (!b) {
    state.cells[dstIdx] = a; state.cells[d.idx] = null;
    SFX.click();
  } else if (b.tier === a.tier && a.tier < MAX_TIER) {
    doMerge(d.idx, dstIdx);
    return;
  } else {
    state.cells[dstIdx] = a; state.cells[d.idx] = b;
    SFX.click();
  }
  syncGame();
}

/* 动画结束清理 class */
boardEl.addEventListener('animationend', e => {
  const el = e.target.closest('.cell');
  if (el) el.classList.remove('spawn', 'merged');
});

/* 长按不弹菜单 */
boardEl.addEventListener('contextmenu', e => e.preventDefault());

/* 点击锁定格 → 扩建 */
boardEl.addEventListener('click', e => {
  const cellEl = e.target.closest('.cell');
  if (!cellEl) return;
  const idx = +cellEl.dataset.idx;
  if (!state.unlocked[idx]) tryBuyCell(idx);
});
