const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体

// 路由
const treatmentRecordsRouter = require('./routes/treatmentRecords');
app.use('/api/treatment-records', treatmentRecordsRouter);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Treatment Record API is running' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API健康检查: http://localhost:${PORT}/api/health`);
  console.log(`治疗记录API: http://localhost:${PORT}/api/treatment-records`);
  console.log('当前使用SQLite3数据库存储');
  console.log('数据库文件路径: treatment_records.db');
  console.log('连接成功后会自动创建表结构');
});
