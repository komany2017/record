import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { getAllTreatmentRecords } from './database.js';

/**
 * SQLite 本地数据库模块（仅 Android 原生平台生效，Web 端静默跳过）
 * 数据库文件位置：Android 应用私有数据库目录
 * 表：treatment_records（治疗记录，date 主键）、water_intake_records（喝水记录，timestamp 唯一）
 */

const DB_NAME = 'futou_record_db';
const sqlite = new SQLiteConnection(CapacitorSQLite);

let db = null;
let initPromise = null;

// 建表语句
const SCHEMA = `
CREATE TABLE IF NOT EXISTS treatment_records (
  date TEXT PRIMARY KEY,
  weekday TEXT,
  bloodPressure TEXT,
  heartRate TEXT,
  weight TEXT,
  heatingBag TEXT,
  supplementBag TEXT,
  treatmentMethod TEXT,
  totalTreatmentVolume TEXT,
  treatmentTime TEXT,
  singleInjectionVolume TEXT,
  lastBagInjectionVolume TEXT,
  cycleCount TEXT,
  zeroCircleFlow TEXT,
  machineTotalFlow TEXT,
  dayManualInjection TEXT,
  dayInjectionConcentration TEXT,
  dayUltrafiltration TEXT,
  machinePlusManualFlow TEXT,
  waterIntake TEXT,
  dialysateColor TEXT,
  createdAt TEXT,
  updatedAt TEXT
);
CREATE TABLE IF NOT EXISTS water_intake_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT,
  amount REAL,
  type TEXT,
  timestamp TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_intake_records(date);
CREATE TABLE IF NOT EXISTS bp_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT,
  systolic REAL,
  diastolic REAL,
  heartRate REAL,
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_bp_date ON bp_measurements(date);
CREATE TABLE IF NOT EXISTS apd_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  cycleNo INTEGER,
  time TEXT,
  fillVolume REAL,
  drainVolume REAL,
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_apd_date ON apd_cycles(date);
CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  name TEXT,
  dose TEXT,
  time TEXT,
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_med_date ON medications(date);
CREATE TABLE IF NOT EXISTS pd_exchanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT,
  brand TEXT,
  conc TEXT,
  mode TEXT,
  dwell TEXT,
  volumeIn REAL,
  volumeOut REAL,
  cycleNo INTEGER,
  cycleTotal INTEGER,
  nextDay INTEGER,
  createdAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_pd_date ON pd_exchanges(date);
`;

// treatment_records 新增列（老库自动迁移）
const EXTRA_COLUMNS = [
    ['otherIntake', 'REAL'],
    ['urineOutput', 'REAL'],
    ['otherOutput', 'REAL'],
    ['note', 'TEXT'],
    ['symptoms', 'TEXT']
];

// treatment_records 全部列（保存时按列合并）
const RECORD_COLUMNS = [
    'date', 'weekday', 'bloodPressure', 'heartRate', 'weight', 'heatingBag', 'supplementBag',
    'treatmentMethod', 'totalTreatmentVolume', 'treatmentTime', 'singleInjectionVolume',
    'lastBagInjectionVolume', 'cycleCount', 'zeroCircleFlow', 'machineTotalFlow',
    'dayManualInjection', 'dayInjectionConcentration', 'dayUltrafiltration',
    'machinePlusManualFlow', 'waterIntake', 'dialysateColor',
    'otherIntake', 'urineOutput', 'otherOutput', 'note', 'symptoms', 'createdAt', 'updatedAt'
];

const TEXT_COLUMNS = new Set([
    'date', 'weekday', 'bloodPressure', 'heartRate', 'weight', 'heatingBag', 'supplementBag',
    'treatmentMethod', 'totalTreatmentVolume', 'treatmentTime', 'singleInjectionVolume',
    'lastBagInjectionVolume', 'cycleCount', 'zeroCircleFlow', 'machineTotalFlow',
    'dayManualInjection', 'dayInjectionConcentration', 'dayUltrafiltration',
    'machinePlusManualFlow', 'waterIntake', 'dialysateColor', 'note', 'symptoms',
    'createdAt', 'updatedAt'
]);

function toText(value) {
    if (value === undefined || value === null) return '';
    return String(value);
}

function toNumberOrNull(value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : n;
}

/**
 * 初始化数据库连接（幂等，可重复调用）
 * Web 平台返回 null
 */
export async function initSQLite() {
    if (!Capacitor.isNativePlatform()) return null;
    if (db) return db;
    // 防止并发初始化
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            const consistency = await sqlite.checkConnectionsConsistency();
            const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

            if (consistency.result && isConn) {
                db = await sqlite.retrieveConnection(DB_NAME, false);
            } else {
                db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
            }

            await db.open();
            await db.execute(SCHEMA);
            await ensureTreatmentColumns();
            await ensureMedicationColumns();
            console.log(`[${new Date().toISOString()}] SQLite 数据库初始化完成: ${DB_NAME}`);

            // 首次初始化时，将 IndexedDB 中已有的治疗记录迁移到 SQLite
            await migrateFromIndexedDB();

            return db;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] SQLite 初始化失败: ${error.message}`);
            db = null;
            initPromise = null;
            return null;
        }
    })();

    return initPromise;
}

/**
 * 老库补齐 treatment_records 新增列
 */
async function ensureTreatmentColumns() {
    try {
        const info = await db.query(`PRAGMA table_info(treatment_records)`);
        const existing = (info.values || []).map(col => col.name);
        for (const [name, type] of EXTRA_COLUMNS) {
            if (!existing.includes(name)) {
                await db.execute(`ALTER TABLE treatment_records ADD COLUMN ${name} ${type}`);
                console.log(`[${new Date().toISOString()}] treatment_records 新增列: ${name}`);
            }
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 补列失败: ${error.message}`);
    }
}

/**
 * 老库补齐 medications 剂量/时间列
 */
async function ensureMedicationColumns() {
    try {
        const info = await db.query(`PRAGMA table_info(medications)`);
        const existing = (info.values || []).map(col => col.name);
        for (const name of ['dose', 'time']) {
            if (!existing.includes(name)) {
                await db.execute(`ALTER TABLE medications ADD COLUMN ${name} TEXT`);
                console.log(`[${new Date().toISOString()}] medications 新增列: ${name}`);
            }
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 补列失败: ${error.message}`);
    }
}

/**
 * 将 IndexedDB 中已有的治疗记录迁移到 SQLite（INSERT OR IGNORE，不覆盖已有数据）
 */
async function migrateFromIndexedDB() {
    try {
        const records = await getAllTreatmentRecords();
        if (!records || records.length === 0) return;

        let migrated = 0;
        for (const r of records) {
            const result = await db.run(
                `INSERT OR IGNORE INTO treatment_records
         (date, weekday, bloodPressure, heartRate, weight, heatingBag, supplementBag,
          treatmentMethod, totalTreatmentVolume, treatmentTime, singleInjectionVolume,
          lastBagInjectionVolume, cycleCount, zeroCircleFlow, machineTotalFlow,
          dayManualInjection, dayInjectionConcentration, dayUltrafiltration,
          machinePlusManualFlow, waterIntake, dialysateColor, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    r.date ?? '', r.weekday ?? '', r.bloodPressure ?? '', String(r.heartRate ?? ''),
                    String(r.weight ?? ''), String(r.heatingBag ?? ''), String(r.supplementBag ?? ''),
                    r.treatmentMethod ?? '', String(r.totalTreatmentVolume ?? ''), String(r.treatmentTime ?? ''),
                    String(r.singleInjectionVolume ?? ''), String(r.lastBagInjectionVolume ?? ''),
                    String(r.cycleCount ?? ''), String(r.zeroCircleFlow ?? ''), String(r.machineTotalFlow ?? ''),
                    String(r.dayManualInjection ?? ''), r.dayInjectionConcentration ?? '',
                    String(r.dayUltrafiltration ?? ''), String(r.machinePlusManualFlow ?? ''),
                    String(r.waterIntake ?? ''), r.dialysateColor ?? '',
                    r.createdAt ?? '', r.updatedAt ?? ''
                ]
            );
            if (result.changes && result.changes.changes > 0) migrated++;
        }
        console.log(`[${new Date().toISOString()}] IndexedDB → SQLite 迁移完成，新增 ${migrated}/${records.length} 条`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 迁移历史数据到 SQLite 失败: ${error.message}`);
    }
}

/**
 * 保存或更新治疗记录到 SQLite（按 date 覆盖）
 */
export async function saveTreatmentRecordToSQLite(data) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };
    if (!data || !data.date) return { success: false, message: '缺少日期' };

    try {
        const now = new Date().toISOString();
        // 读取现有记录，只覆盖调用方显式传入的列，避免局部保存清空其它数据
        const current = await getTreatmentRecordFromSQLite(data.date);
        const merged = {};
        RECORD_COLUMNS.forEach(col => {
            if (col === 'createdAt') return;
            const provided = Object.prototype.hasOwnProperty.call(data, col)
                && data[col] !== undefined;
            const value = provided ? data[col] : (current ? current[col] : undefined);
            merged[col] = TEXT_COLUMNS.has(col) ? toText(value) : toNumberOrNull(value);
        });
        merged.date = data.date;
        merged.createdAt = (current && current.createdAt) ? current.createdAt : now;
        merged.updatedAt = now;

        const placeholders = RECORD_COLUMNS.map(() => '?').join(',');
        await conn.run(
            `INSERT OR REPLACE INTO treatment_records (${RECORD_COLUMNS.join(',')}) VALUES (${placeholders})`,
            RECORD_COLUMNS.map(col => merged[col])
        );
        console.log(`[${new Date().toISOString()}] 治疗记录已写入 SQLite，日期: ${data.date}`);
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 保存治疗记录失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期的治疗记录（治疗记录预览用）
 */
export async function getTreatmentRecordFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return null;

    try {
        const result = await conn.query(
            `SELECT * FROM treatment_records WHERE date = ? LIMIT 1`,
            [date]
        );
        return (result.values && result.values.length > 0) ? result.values[0] : null;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询治疗记录失败: ${error.message}`);
        return null;
    }
}

/**
 * 查询全部治疗记录（机器总超滤量对比用）
 */
export async function getAllTreatmentRecordsFromSQLite() {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT * FROM treatment_records ORDER BY date ASC`
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询全部治疗记录失败: ${error.message}`);
        return [];
    }
}

/**
 * 所有记录按「早 7 点」划分日界：00:00-06:59 归属前一天
 * 返回 YYYY-MM-DD
 */
export function getRecordDate(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < 7) {
        d.setDate(d.getDate() - 1);
    }
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 兼容别名 */
export const getWaterDate = getRecordDate;

/**
 * 按日期汇总喝水记录（饮水量趋势用）
 */
export async function getWaterTotalsByDateFromSQLite() {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT date, SUM(amount) AS total FROM water_intake_records GROUP BY date ORDER BY date ASC`
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 汇总喝水记录失败: ${error.message}`);
        return [];
    }
}

/**
 * 保存或更新喝水记录到 SQLite（按 timestamp 去重覆盖）
 */
export async function saveWaterIntakeToSQLite(record) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        await conn.run(
            `INSERT INTO water_intake_records (date, time, amount, type, timestamp)
       VALUES (?,?,?,?,?)
       ON CONFLICT(timestamp) DO UPDATE SET
         date = excluded.date,
         time = excluded.time,
         amount = excluded.amount,
         type = excluded.type`,
            [
                record.date ?? '', record.time ?? '',
                Number(record.amount) || 0, record.type ?? '',
                String(record.timestamp ?? '')
            ]
        );
        console.log(`[${new Date().toISOString()}] 喝水记录已写入 SQLite，时间戳: ${record.timestamp}`);
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 保存喝水记录失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 按 timestamp 删除喝水记录
 */
export async function deleteWaterIntakeFromSQLite(timestamp) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        await conn.run(
            `DELETE FROM water_intake_records WHERE timestamp = ?`,
            [String(timestamp ?? '')]
        );
        console.log(`[${new Date().toISOString()}] 喝水记录已从 SQLite 删除，时间戳: ${timestamp}`);
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 删除喝水记录失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期的喝水记录
 */
export async function getWaterIntakeFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT date, time, amount, type, timestamp FROM water_intake_records
       WHERE date = ? ORDER BY time ASC`,
            [date]
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询喝水记录失败: ${error.message}`);
        return [];
    }
}

/**
 * 当日喝水合计
 */
export async function getWaterTotalForDate(date) {
    const conn = await initSQLite();
    if (!conn) return 0;

    try {
        const result = await conn.query(
            `SELECT SUM(amount) AS total FROM water_intake_records WHERE date = ?`,
            [date]
        );
        const row = result.values && result.values[0];
        return row && row.total !== null ? Number(row.total) || 0 : 0;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 汇总当日喝水失败: ${error.message}`);
        return 0;
    }
}

/**
 * 覆盖写当日喝水合计（有变化时合并为一条“汇总”记录）
 */
export async function setDailyWaterTotal(date, total) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        const current = await getWaterTotalForDate(date);
        const next = Number(total) || 0;
        if (Math.abs(current - next) < 0.001) return { success: true };

        await conn.run(`DELETE FROM water_intake_records WHERE date = ?`, [date]);
        if (next > 0) {
            await conn.run(
                `INSERT INTO water_intake_records (date, time, amount, type, timestamp)
                 VALUES (?,?,?,?,?)`,
                [date, '汇总', next, '汇总', `summary-${date}`]
            );
        }
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 写入当日喝水合计失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期的多次血压/心率测量
 */
export async function getBpMeasurementsFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT id, date, time, systolic, diastolic, heartRate FROM bp_measurements
             WHERE date = ? ORDER BY time ASC, id ASC`,
            [date]
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询血压测量失败: ${error.message}`);
        return [];
    }
}

/**
 * 覆盖写指定日期的全部血压/心率测量
 */
export async function saveBpMeasurementsToSQLite(date, measurements) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        const now = new Date().toISOString();
        await conn.run(`DELETE FROM bp_measurements WHERE date = ?`, [date]);
        for (const m of measurements || []) {
            await conn.run(
                `INSERT INTO bp_measurements (date, time, systolic, diastolic, heartRate, createdAt)
                 VALUES (?,?,?,?,?,?)`,
                [
                    date,
                    toText(m.time),
                    toNumberOrNull(m.systolic),
                    toNumberOrNull(m.diastolic),
                    toNumberOrNull(m.heartRate),
                    now
                ]
            );
        }
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 保存血压测量失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期的用药
 */
export async function getMedicationsFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT id, date, name, dose, time FROM medications WHERE date = ? ORDER BY id ASC`,
            [date]
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询用药失败: ${error.message}`);
        return [];
    }
}

/**
 * 覆盖写指定日期的用药（支持字符串或 {name, dose, time} 对象）
 */
export async function saveMedicationsToSQLite(date, meds) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        const now = new Date().toISOString();
        await conn.run(`DELETE FROM medications WHERE date = ?`, [date]);
        for (const item of meds || []) {
            const med = typeof item === 'string' ? { name: item } : (item || {});
            const name = String(med.name || '').trim();
            if (!name) continue;
            await conn.run(
                `INSERT INTO medications (date, name, dose, time, createdAt) VALUES (?,?,?,?,?)`,
                [date, name, toText(med.dose), toText(med.time), now]
            );
        }
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 保存用药失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期的腹透换液明细（手工 / APD / 艾考糊精）
 */
export async function getPdExchangesFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const result = await conn.query(
            `SELECT id, date, time, brand, conc, mode, dwell, volumeIn, volumeOut,
                    cycleNo, cycleTotal, nextDay
             FROM pd_exchanges WHERE date = ? ORDER BY id ASC`,
            [date]
        );
        return result.values || [];
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询换液明细失败: ${error.message}`);
        return [];
    }
}

/**
 * 覆盖写指定日期的腹透换液明细
 */
export async function savePdExchangesToSQLite(date, exchanges) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        const now = new Date().toISOString();
        await conn.run(`DELETE FROM pd_exchanges WHERE date = ?`, [date]);
        for (const item of exchanges || []) {
            await conn.run(
                `INSERT INTO pd_exchanges
                 (date, time, brand, conc, mode, dwell, volumeIn, volumeOut,
                  cycleNo, cycleTotal, nextDay, createdAt)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    date,
                    toText(item.time),
                    toText(item.brand),
                    toText(item.conc),
                    toText(item.mode),
                    toText(item.dwell),
                    toNumberOrNull(item.volumeIn),
                    toNumberOrNull(item.volumeOut),
                    Number(item.cycleNo) || 0,
                    Number(item.cycleTotal) || 0,
                    item.nextDay ? 1 : 0,
                    now
                ]
            );
        }
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 保存换液明细失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 删除某一天的治疗类记录（治疗、血压、换液、用药），保留喝水记录
 */
export async function deleteDayRecordsFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return { success: false, message: '非原生平台或初始化失败' };

    try {
        await conn.run(`DELETE FROM treatment_records WHERE date = ?`, [date]);
        await conn.run(`DELETE FROM bp_measurements WHERE date = ?`, [date]);
        await conn.run(`DELETE FROM pd_exchanges WHERE date = ?`, [date]);
        await conn.run(`DELETE FROM medications WHERE date = ?`, [date]);
        return { success: true };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 删除当日记录失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

/**
 * 查询指定日期之前最近一次体重
 */
export async function getLatestWeightBeforeFromSQLite(date) {
    const conn = await initSQLite();
    if (!conn) return null;

    try {
        const result = await conn.query(
            `SELECT date, weight FROM treatment_records
             WHERE date < ? AND weight IS NOT NULL AND TRIM(weight) <> ''
             ORDER BY date DESC LIMIT 1`,
            [date]
        );
        const row = result.values && result.values[0];
        return row ? { date: row.date, weight: row.weight } : null;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询上次体重失败: ${error.message}`);
        return null;
    }
}

/**
 * 每日超滤量序列（换液明细优先，旧数据回退到机器总超滤量）
 * @returns {Promise<Array<{date: string, uf: number}>>}
 */
export async function getDailyUfSeriesFromSQLite(startDate, endDate) {
    const conn = await initSQLite();
    if (!conn) return [];

    try {
        const recRes = await conn.query(
            `SELECT date, machineTotalFlow, machinePlusManualFlow
             FROM treatment_records WHERE date BETWEEN ? AND ?`,
            [startDate, endDate]
        );
        const pdRes = await conn.query(
            `SELECT date, SUM(COALESCE(volumeOut,0) - COALESCE(volumeIn,0)) AS uf, COUNT(*) AS cnt
             FROM pd_exchanges WHERE date BETWEEN ? AND ?
             GROUP BY date`,
            [startDate, endDate]
        );

        const map = {};
        (recRes.values || []).forEach(r => {
            const plus = Number(r.machinePlusManualFlow);
            const fallback = String(r.machinePlusManualFlow ?? '').trim() !== '' && !isNaN(plus)
                ? plus
                : (Number(r.machineTotalFlow) || 0);
            map[r.date] = { date: r.date, uf: fallback, hasPd: false };
        });
        (pdRes.values || []).forEach(p => {
            map[p.date] = {
                date: p.date,
                uf: Number(p.uf) || 0,
                hasPd: Number(p.cnt) > 0
            };
        });
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error(`[${new Date().toISOString()}] SQLite 查询超滤序列失败: ${error.message}`);
        return [];
    }
}
