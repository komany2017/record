const XLSX = require('xlsx');
const path = require('path');
const { DateTime } = require('luxon');

/**
 * 处理Excel文件操作
 * @param {Object} data - 包含治疗数据的对象
 * @returns {Promise<Object>} - 处理结果
 */
async function fillExcelData(data) {
  try {
    // 构建Excel文件路径
    const filePath = path.join(__dirname, '..', '治疗记录2025-12.xlsx');
    
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 将工作表转换为二维数组
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 获取当前日期和星期
    const now = DateTime.now();
    const today = now.toISODate();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][now.weekday];
    
    // 查找或创建今天的列
    let todayColumn = -1;
    
    // 查找日期行（假设第一行是日期）
    const dateRowIndex = 0;
    
    // 查找星期行（假设第二行是星期）
    const weekdayRowIndex = 1;
    
    // 遍历现有列，查找今天的日期
    for (let col = 1; col < rows[dateRowIndex].length; col++) {
      const cellValue = rows[dateRowIndex][col];
      
      // 处理日期值（可能是字符串或日期对象）
      let cellDate;
      if (typeof cellValue === 'string') {
        // 尝试解析日期字符串
        cellDate = DateTime.fromFormat(cellValue, 'yyyy-MM-dd');
      } else if (cellValue instanceof Date) {
        cellDate = DateTime.fromJSDate(cellValue);
      }
      
      if (cellDate && cellDate.isValid && cellDate.toISODate() === today) {
        todayColumn = col;
        break;
      }
    }
    
    // 如果没有找到今天的列，创建新列
    if (todayColumn === -1) {
      todayColumn = rows[dateRowIndex].length;
      
      // 在日期行添加今天的日期
      rows[dateRowIndex][todayColumn] = today;
      
      // 在星期行添加今天的星期
      rows[weekdayRowIndex][todayColumn] = weekday;
    }
    
    // 查找各指标的行索引
    const indices = {};
    
    for (let i = 0; i < rows.length; i++) {
      const rowName = rows[i][0];
      
      if (rowName === '血压') {
        indices.bloodPressure = i;
      } else if (rowName === '体重(不带水)') {
        indices.weight = i;
      } else if (rowName === '0周期超流量(ml)') {
        indices.zeroCycleFlow = i;
      } else if (rowName === '机器总超滤量(ml)') {
        indices.machineTotalFlow = i;
      } else if (rowName === '饮水量') {
        indices.waterIntake = i;
      }
    }
    
    // 填入数据
    if (indices.bloodPressure !== undefined) {
      rows[indices.bloodPressure][todayColumn] = data.bloodPressure;
    }
    
    if (indices.weight !== undefined) {
      rows[indices.weight][todayColumn] = data.weight;
    }
    
    if (indices.zeroCycleFlow !== undefined) {
      rows[indices.zeroCycleFlow][todayColumn] = data.zeroCycleFlow;
    }
    
    if (indices.machineTotalFlow !== undefined) {
      rows[indices.machineTotalFlow][todayColumn] = data.machineTotalFlow;
    }
    
    if (indices.waterIntake !== undefined) {
      rows[indices.waterIntake][todayColumn] = data.waterIntake;
    }
    
    // 将二维数组转换回工作表
    const updatedWorksheet = XLSX.utils.aoa_to_sheet(rows);
    
    // 更新工作簿
    workbook.Sheets[sheetName] = updatedWorksheet;
    
    // 保存修改后的Excel文件
    XLSX.writeFile(workbook, filePath);
    
    return {
      success: true,
      weekday: rows[weekdayRowIndex][todayColumn],
      message: '数据已成功保存到Excel文件'
    };
    
  } catch (error) {
    console.error('处理Excel文件时出错:', error);
    throw new Error('处理Excel文件时发生错误');
  }
}

module.exports = fillExcelData;