const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// 首先连接到默认postgres数据库创建新数据库
const defaultPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '123456',
  database: 'postgres', // 连接到默认数据库
  ssl: false
});

async function initDatabase() {
  try {
    // 创建新数据库
    await defaultPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`数据库 ${process.env.DB_NAME} 创建成功`);
    
    // 关闭默认连接池
    await defaultPool.end();
    
    // 创建连接到新数据库的连接池
    const newPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME,
      ssl: false
    });
    
    // 读取SQL文件内容
    const sqlPath = path.join(__dirname, '../database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行SQL语句初始化表结构
    await newPool.query(sqlContent);
    console.log('数据库表结构初始化成功');
    
    // 关闭新连接池
    await newPool.end();
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initDatabase();
