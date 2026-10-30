'use strict';
/* ============================================================
 * 通用工具函数
 * ============================================================ */
const $ = id => document.getElementById(id);

/* 数字格式化：1234 → 1.2k，12345678 → 12.3M */
const fmt = n => {
  if (n < 1000) return (n < 10 && !Number.isInteger(n)) ? n.toFixed(1) : String(Math.floor(n));
  const units = ['k', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + units[u];
};

/* 等级 → 色相（等级颜色渐进） */
const hueOf = t => (t - 1) * 26 + 8;

/* 格子序号 → 行号 */
const rowOf = i => Math.floor(i / COLS);

/* 数组随机取一个 */
const rand = a => a[(Math.random() * a.length) | 0];
