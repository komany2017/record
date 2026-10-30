'use strict';
/* ============================================================
 * 数值配置（策划表：调平衡只改这里，不动逻辑）
 * ============================================================ */

/* 食物合成链：1~15 级，income = 每秒产出金币 */
const TIERS = [null,
  {name:'玉米',    emoji:'🌽', income:0.5},
  {name:'薯条',    emoji:'🍟', income:2},
  {name:'汉堡',    emoji:'🍔', income:8},
  {name:'披萨',    emoji:'🍕', income:32},
  {name:'塔可',    emoji:'🌮', income:120},
  {name:'寿司',    emoji:'🍣', income:450},
  {name:'牛排',    emoji:'🥩', income:1700},
  {name:'拉面',    emoji:'🍜', income:6500},
  {name:'咖喱饭',  emoji:'🍛', income:25000},
  {name:'龙虾',    emoji:'🦞', income:95000},
  {name:'蛋糕',    emoji:'🍰', income:360000},
  {name:'冰淇淋',  emoji:'🍦', income:1400000},
  {name:'香槟',    emoji:'🥂', income:5200000},
  {name:'米其林',  emoji:'🏆', income:20000000},
  {name:'美食帝国',emoji:'👑', income:78000000},
];
const MAX_TIER = 15;

/* 棋盘：5 列 × 6 行，前 3 行初始解锁 */
const COLS = 5, ROWS = 6, N = 30;

/* 每行扩建单价（行号 → 金币） */
const ROW_PRICE = [0, 0, 0, 800, 9000, 90000];

/* 经济：普通箱 / 高级箱 / 换订单 */
const BOX1_COST = 100, BOX2_COST = 1200, REROLL_COST = 50;

/* 离线收益：50% 效率，上限 8 小时 */
const OFFLINE_RATE = 0.5, OFFLINE_CAP = 8 * 3600;

/* 存档键（改版本号 = 作废旧存档） */
const SAVE_KEY = 'mergeFoodStreet.v1';

/* 免费进货基础冷却（毫秒），每升 1 级 -4%，下限 1.2s */
const FREE_CD_BASE = 3000;
