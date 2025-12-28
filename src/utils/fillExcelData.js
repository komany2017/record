import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';

/**
 * 处理Excel文件操作
 * @param {Object} data - 包含治疗数据的对象
 * @returns {Promise<Object>} - 处理结果
 */
export async function fillExcelData(data) {
  try {
    // 生成Excel文件名
    const yearMonth = data.date.substring(0, 7).replace('-', ''); // 提取年月，如2023-12变为202312
    const fileName = `治疗记录${yearMonth}.xlsx`;
    
    // 定义工作表结构
    const headers = [
      ['星期'],
      ['日期'],
      ['血压'],
      ['体重(不带水)'],
      ['加热袋'],
      ['补充袋'],
      ['治疗方式'],
      ['总治疗量'],
      ['治疗时间'],
      ['单次注入量'],
      ['末袋注入量'],
      ['循环次数'],
      ['0周期超流量'],
      ['机器总超滤量'],
      ['日间手工注入量'],
      ['日间注入浓度'],
      ['日间超滤量'],
      ['机器+手工总超滤量'],
      ['饮水量']
    ];
    
    // 获取当前日期和星期
    const targetDate = data.date;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[new Date(targetDate).getDay()];
    
    // 尝试从本地存储加载现有工作表
    let workbook;
    let worksheet;
    
    try {
      // 这里我们简化处理，总是创建新的工作簿
      // 在实际应用中，你可能需要使用 FileReader 从用户选择的文件中读取
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    } catch (error) {
      console.log('创建新工作簿');
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }
    
    // 将工作表转换为二维数组
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 定义日期行和星期行的索引
    const dateRowIndex = 1; // 日期在行索引1（第二行）
    const weekdayRowIndex = 0; // 星期在行索引0（第一行）
    
    // 查找目标日期是否已存在
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
      zeroCircleFlow: 12,
      machineTotalFlow: 13,
      dayManualInjection: 14,
      dayInjectionConcentration: 15,
      dayUltrafiltration: 16,
      machinePlusManualFlow: 17,
      waterIntake: 18
    };
    
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
    rows[indices.bloodPressure][targetColumn] = data.bloodPressure;
    rows[indices.weight][targetColumn] = data.weight;
    rows[indices.heatingBag][targetColumn] = data.heatingBag || '2.5';
    rows[indices.supplementBag][targetColumn] = data.supplementBag || '2.5';
    rows[indices.treatmentMethod][targetColumn] = data.treatmentMethod || 'IPD';
    rows[indices.totalTreatmentVolume][targetColumn] = data.totalTreatmentVolume || '8000';
    rows[indices.treatmentTime][targetColumn] = data.treatmentTime || '10';
    rows[indices.singleInjectionVolume][targetColumn] = data.singleInjectionVolume || '2000';
    rows[indices.lastBagInjectionVolume][targetColumn] = data.lastBagInjectionVolume || '0';
    rows[indices.cycleCount][targetColumn] = data.cycleCount || '4';
    rows[indices.zeroCircleFlow][targetColumn] = data.zeroCircleFlow;
    rows[indices.machineTotalFlow][targetColumn] = data.machineTotalFlow;
    rows[indices.dayManualInjection][targetColumn] = data.dayManualInjection;
    rows[indices.dayInjectionConcentration][targetColumn] = data.dayInjectionConcentration;
    rows[indices.dayUltrafiltration][targetColumn] = data.dayUltrafiltration;
    
    // 计算机器+手工总超滤量
    const machinePlusManualFlow = (data.zeroCircleFlow || 0) + (data.machineTotalFlow || 0) + (data.dayUltrafiltration || 0);
    rows[indices.machinePlusManualFlow][targetColumn] = machinePlusManualFlow;
    
    rows[indices.waterIntake][targetColumn] = data.waterIntake;
    
    // 转换二维数组为工作表
    const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
    
    // 替换原工作表
    workbook.Sheets['Sheet1'] = newWorksheet;
    
    // 生成Excel文件并下载
    XLSX.writeFile(workbook, fileName);
    
    return {
      success: true,
      weekday: weekday,
      message: '数据已成功保存到Excel文件'
    };
    
  } catch (error) {
    console.error('处理Excel文件时出错:', error);
    throw new Error('处理Excel文件时发生错误');
  }
}
