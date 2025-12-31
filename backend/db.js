const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 创建SQLite数据库连接
const dbPath = path.resolve(__dirname, 'treatment_records.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('成功连接到SQLite数据库:', dbPath);
  
  // 创建治疗记录表
  createTable();
});

// 创建治疗记录表
function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS treatment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      weekday TEXT,
      blood_pressure TEXT,
      weight REAL,
      heating_bag TEXT,
      supplement_bag TEXT,
      treatment_method TEXT,
      total_treatment_volume INTEGER,
      treatment_time TEXT,
      single_injection_volume INTEGER,
      last_bag_injection_volume INTEGER,
      cycle_count INTEGER,
      zero_circle_flow INTEGER,
      machine_total_flow INTEGER,
      day_manual_injection INTEGER,
      day_injection_concentration TEXT,
      day_ultrafiltration INTEGER,
      machine_plus_manual_flow INTEGER,
      water_intake INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
      process.exit(1);
    }
    console.log('治疗记录表已创建或已存在');
  });
}

// 导出数据库连接
module.exports = db;
