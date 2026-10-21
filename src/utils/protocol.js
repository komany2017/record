/**
 * 治疗方案：把「白天长留腹 + 夜间 APD 多循环」展开成当天换液明细
 */
import { DEFAULT_PROTOCOL } from './pdConstants.js';

function num(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "HH:mm" -> 分钟数 */
export function timeToMin(t) {
  const p = String(t || '00:00').split(':');
  const h = parseInt(p[0], 10) || 0;
  const m = parseInt(p[1], 10) || 0;
  return h * 60 + m;
}

/** 分钟数 -> "HH:mm"（超过 24 小时绕回） */
export function minToTime(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** 读取本地方案 */
export function loadProtocol() {
  try {
    const raw = localStorage.getItem('pdProtocol');
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_PROTOCOL));
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== false,
      day: { ...DEFAULT_PROTOCOL.day, ...(parsed.day || {}) },
      night: { ...DEFAULT_PROTOCOL.night, ...(parsed.night || {}) }
    };
  } catch (error) {
    return JSON.parse(JSON.stringify(DEFAULT_PROTOCOL));
  }
}

export function saveProtocol(protocol) {
  localStorage.setItem('pdProtocol', JSON.stringify(protocol));
}

/** 展开成换液记录数组（volumeOut 留空待填） */
export function buildPdList(protocol) {
  const p = protocol || {};
  const list = [];

  const day = p.day || {};
  if (day.enabled) {
    list.push({
      localId: uid(),
      time: day.time || '08:00',
      brand: day.brand || '',
      conc: day.conc || '',
      mode: 'CAPD 手工换液',
      dwell: day.dwell || '',
      volumeIn: num(day.volumeIn) || '',
      volumeOut: '',
      cycleNo: 0,
      cycleTotal: 0,
      nextDay: false
    });
  }

  const night = p.night || {};
  if (night.enabled) {
    const cycles = Math.max(1, Math.min(20, Math.round(num(night.cycles) || 4)));
    const hours = num(night.hours) || 2;
    const startMin = timeToMin(night.startTime || '20:00');
    for (let i = 0; i < cycles; i++) {
      const start = startMin + i * hours * 60;
      list.push({
        localId: uid(),
        time: minToTime(start),
        nextDay: start >= 1440,
        brand: night.brand || '',
        conc: night.conc || '',
        mode: 'APD 自动腹膜透析',
        dwell: `${hours}h`,
        cycleNo: i + 1,
        cycleTotal: cycles,
        volumeIn: num(night.volumeIn) || '',
        volumeOut: ''
      });
    }
  }

  return list;
}

/** 方案摘要 */
export function summaryLines(protocol) {
  const p = protocol || {};
  const lines = [];
  const day = p.day || {};
  const night = p.night || {};

  if (day.enabled) {
    const parts = [];
    if (day.conc) parts.push(day.conc);
    if (num(day.volumeIn)) parts.push(`${num(day.volumeIn)}ml`);
    lines.push({
      tag: '白天',
      text: parts.join(' ') || '长留腹',
      sub: [day.time, day.dwell ? `留腹 ${day.dwell}` : ''].filter(Boolean).join(' · ')
    });
  }

  if (night.enabled) {
    const cycles = Math.round(num(night.cycles) || 4);
    const hours = num(night.hours) || 2;
    const startMin = timeToMin(night.startTime || '20:00');
    lines.push({
      tag: '夜间',
      text: `${cycles} 个循环 × ${num(night.volumeIn) || 0}ml`,
      sub: [
        `${night.startTime || '20:00'} 开始`,
        `每循环 ${hours}h`,
        `预计 ${minToTime(startMin + cycles * hours * 60)} 结束`
      ].join(' · ')
    });
  }

  return lines;
}

export function summaryText(protocol) {
  const lines = summaryLines(protocol);
  if (!lines.length) return '尚未配置治疗方案';
  return lines.map(l => `${l.tag}：${l.text}`).join('；');
}
