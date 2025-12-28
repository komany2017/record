import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 使用CORS中间件
app.use(cors());

// 解析JSON请求体
app.use(express.json());

// 静态文件服务
app.use(express.static('dist'));

// 处理Excel文件的函数
async function fillExcelData(fileName, data, savePath) {
  // 首先导入所需模块
  const { default: XLSX } = await import('xlsx');
  const { default: fs } = await import('fs');
  
  // 构建完整的文件路径
  const filePath = path.join(savePath, fileName);
  console.log(`开始处理Excel文件: ${filePath}`);
  
  let workbook;
  let worksheet;
  
  // 解析日期
  const targetDate = data.date;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[new Date(targetDate).getDay()];
  
  // 检查文件是否存在
  console.log(`检查文件是否存在: ${fs.existsSync(filePath)}`);
  if (fs.existsSync(filePath)) {
    console.log('读取现有文件');
    workbook = XLSX.readFile(filePath);
  } else {
    console.log('创建新工作簿');
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.aoa_to_sheet([
      ['星期'], // 第一行
      ['日期'], // 第二行：日期
      ['血压'], // 第三行：血压
      ['体重(不带水)'], // 第四行：体重(不带水)
      ['加热袋'], // 第五行：加热袋
      ['补充袋'], // 第六行：补充袋
      ['治疗方式'], // 第七行：治疗方式
      ['总治疗量'], // 第八行：总治疗量
      ['治疗时间'], // 第九行：治疗时间
      ['单次注入量'], // 第十行：单次注入量
      ['末袋注入量'], // 第十一行：末袋注入量
      ['循环次数'], // 第十二行：循环次数
      ['0周期超流量'], // 第十三行：0周期超流量
      ['机器总超滤量'], // 第十四行：机器总超滤量
      ['日间手工注入量'],
      ['日间注入浓度'],
      ['日间超滤量'],
      ['机器+手工总超滤量'], // 第十六行：机器+手工总超滤量
      ['饮水量'], // 第十七行：饮水量
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  }
  
  // 获取工作表
  worksheet = workbook.Sheets['Sheet1'];
  
  // 将工作表转换为二维数组进行操作
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`工作表行数: ${rows.length}`);
  console.log(`工作表列数: ${rows[0] ? rows[0].length : 0}`);
  
  // 定义日期行和星期行的索引
  const dateRowIndex = 1; // 日期在行索引1（第二行）
  const weekdayRowIndex = 0; // 星期在行索引0（第一行）
  
  // 查找目标日期是否已存在
  console.log(`当前日期: ${targetDate}`);
  console.log(`当前星期: ${weekday}`);
  
  let targetColumn = -1;
  
  // 确保日期行存在
  if (rows.length > dateRowIndex) {
    // 遍历日期行的所有列，查找目标日期
    for (let i = 1; i < rows[dateRowIndex].length; i++) { // 从列索引1开始，跳过第一列
      const cellValue = rows[dateRowIndex][i];
      // 直接比较字符串格式的日期
      if (cellValue === targetDate) {
        targetColumn = i;
        break;
      }
    }
  }
  
  // 如果没有找到目标日期，创建新列
  if (targetColumn === -1) {
    // 确定新列的索引（在最后一列后添加）
    targetColumn = rows[0] ? rows[0].length : 1;
    console.log(`创建新列: ${targetColumn}`);
  } else {
    console.log(`找到现有列: ${targetColumn}`);
  }
  
  // 确保所有行都有足够的列
  rows.forEach((row, rowIndex) => {
    while (row.length <= targetColumn) {
      row.push('');
    }
  });
  
  // 定义各指标的行索引
  const indices = {
    bloodPressure: 2,
    weight: 3,
    heatingBag: 4,
    supplementBag: 5,
    treatmentMethod: 6,
    totalTreatmentVolume: 7,
    treatmentTime: 8,
    singleInjectionVolume: 9,
    lastBagInjectionVolume: 10,
    cycleCount: 11,
    zeroCycleFlow: 12,
    machineTotalFlow: 13,
    dayManualInjection: 14, // 日间手工注入量
    dayInjectionConcentration: 15, // 日间注入浓度
    dayUltrafiltration: 16, // 日间超滤量
    machinePlusManualFlow: 17, // 机器+手工总超滤量
    waterIntake: 18 // 饮水量
  };
  
  console.log('找到的索引:', indices);
  
  // 确保rows数组有足够的行
  while (rows.length <= indices.waterIntake) {
    const newRow = [];
    while (newRow.length <= targetColumn) {
      newRow.push('');
    }
    rows.push(newRow);
  }
  
  // 确保所有行都存在且是有效的数组
  for (let i = 0; i <= indices.waterIntake; i++) {
    if (!rows[i]) {
      rows[i] = [];
    }
    // 确保行有足够的列
    while (rows[i].length <= targetColumn) {
      rows[i].push('');
    }
  }
  
  // 填写日期和星期
  rows[dateRowIndex][targetColumn] = targetDate;
  rows[weekdayRowIndex][targetColumn] = weekday;
  
  // 填写数据
  console.log(`填入血压: ${data.bloodPressure}`);
  rows[indices.bloodPressure][targetColumn] = data.bloodPressure;
  
  console.log(`填入体重: ${data.weight}`);
  rows[indices.weight][targetColumn] = data.weight;
  
  console.log(`填入加热袋: ${data.heatingBag || '2.5'}`);
  rows[indices.heatingBag][targetColumn] = data.heatingBag || '2.5';
  
  console.log(`填入补充袋: ${data.supplementBag || '2.5'}`);
  rows[indices.supplementBag][targetColumn] = data.supplementBag || '2.5';
  
  console.log(`填入治疗方式: ${data.treatmentMethod || 'IPD'}`);
  rows[indices.treatmentMethod][targetColumn] = data.treatmentMethod || 'IPD';
  
  console.log(`填入总治疗量: ${data.totalTreatmentVolume || '8000'}`);
  rows[indices.totalTreatmentVolume][targetColumn] = data.totalTreatmentVolume || '8000';
  
  console.log(`填入治疗时间: ${data.treatmentTime || '10'}`);
  rows[indices.treatmentTime][targetColumn] = data.treatmentTime || '10';
  
  console.log(`填入单次注入量: ${data.singleInjectionVolume || '2000'}`);
  rows[indices.singleInjectionVolume][targetColumn] = data.singleInjectionVolume || '2000';
  
  console.log(`填入末袋注入量: ${data.lastBagInjectionVolume || '0'}`);
  rows[indices.lastBagInjectionVolume][targetColumn] = data.lastBagInjectionVolume || '0';
  
  console.log(`填入循环次数: ${data.cycleCount || '4'}`);
  rows[indices.cycleCount][targetColumn] = data.cycleCount || '4';
  
  console.log(`填入0周期超流量: ${data.zeroCircleFlow}`);
  rows[indices.zeroCycleFlow][targetColumn] = data.zeroCircleFlow;
  
  console.log(`填入机器总超滤量: ${data.machineTotalFlow}`);
  rows[indices.machineTotalFlow][targetColumn] = data.machineTotalFlow;
  
  console.log(`填入日间手工注入量: ${data.dayManualInjection}`);
  rows[indices.dayManualInjection][targetColumn] = data.dayManualInjection;
  
  console.log(`填入日间注入浓度: ${data.dayInjectionConcentration}`);
  rows[indices.dayInjectionConcentration][targetColumn] = data.dayInjectionConcentration;
  
  console.log(`填入日间超滤量: ${data.dayUltrafiltration}`);
  rows[indices.dayUltrafiltration][targetColumn] = data.dayUltrafiltration;
  
  // 计算机器+手工总超滤量
  const machinePlusManualFlow = Number(data.zeroCircleFlow || 0) + Number(data.machineTotalFlow || 0) + Number(data.dayUltrafiltration || 0);
  console.log(`填入机器+手工总超滤量: ${machinePlusManualFlow}`);
  rows[indices.machinePlusManualFlow][targetColumn] = machinePlusManualFlow;
  
  console.log(`填入饮水量: ${data.waterIntake}`);
  rows[indices.waterIntake][targetColumn] = data.waterIntake;
  
  // 转换二维数组为工作表
  console.log('转换二维数组为工作表');
  const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // 替换原工作表
  workbook.Sheets['Sheet1'] = newWorksheet;
  
  // 保存Excel文件
  console.log(`保存Excel文件: ${filePath}`);
  
  // 确保目录存在
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    console.log(`创建目录: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  XLSX.writeFile(workbook, filePath);
  console.log('文件保存成功');
  
  return {
    success: true,
    message: 'Excel文件保存成功'
  };
}

// 处理表单提交
app.post('/api/submit-data', async (req, res) => {
  try {
    const { 
      bloodPressure, 
      weight, 
      zeroCircleFlow, 
      machineTotalFlow, 
      dayManualInjection, 
      dayInjectionConcentration, 
      dayUltrafiltration, 
      waterIntake,
      date
    } = req.body;
    
    console.log('接收到的请求体:', req.body);
    
    // 验证必填字段
    if (!bloodPressure || !weight || !zeroCircleFlow || !machineTotalFlow || !waterIntake || !date) {
      return res.json({ 
        success: false, 
        message: '请填写所有必填字段' 
      });
    }
    
    // 设置默认值（处理空字符串情况）
    const finalDayManualInjection = dayManualInjection || 2000;
    const finalDayInjectionConcentration = dayInjectionConcentration || "艾烤糊";
    const finalDayUltrafiltration = dayUltrafiltration || 0;
    
    // 计算机器+手工总超滤量
    const machinePlusManualFlow = Number(machineTotalFlow) + Number(finalDayUltrafiltration);
    
    // 准备数据
    const data = {
      bloodPressure,
      weight,
      zeroCircleFlow,
      machineTotalFlow,
      dayManualInjection: finalDayManualInjection,
      dayInjectionConcentration: finalDayInjectionConcentration,
      dayUltrafiltration: finalDayUltrafiltration,
      waterIntake,
      date,
      machinePlusManualFlow
    };
    
    console.log('字段值:');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    // 生成Excel文件名
    const yearMonth = date.substring(0, 7).replace('-', ''); // 提取年月，如2023-12变为202312
    const fileName = `治疗记录${yearMonth}.xlsx`;
    
    // 使用默认目录
    const savePath = path.join(__dirname, 'excel');
    
    // 确保默认目录存在
    const fs = await import('fs');
    if (!fs.existsSync(savePath)) {
      console.log(`创建默认目录: ${savePath}`);
      fs.mkdirSync(savePath, { recursive: true });
    }
    
    console.log(`Excel文件保存路径: ${savePath}`);
    
    // 填充Excel数据
    const result = await fillExcelData(fileName, data, savePath);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: '数据保存成功',
        data: data
      });
    } else {
      res.json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});