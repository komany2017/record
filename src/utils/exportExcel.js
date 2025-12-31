import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * 导出多个治疗记录到Excel文件
 * 
 * 功能说明：
 * 1. 根据日期范围生成对应的Excel文件名
 * 2. 将多个记录按列排列，日期从左到右
 * 3. 移动端：保存到Documents目录
 * 4. 浏览器端：创建Excel文件并下载
 * 5. 相同日期的数据只更新不新增列
 * 
 * @param {Array} records - 治疗记录数组
 * @returns {Promise<Object>} - 处理结果，包含success、message等字段
 */
export async function exportMultipleRecordsToExcel(records, dateRange = null) {
  try {
    console.log(`[${new Date().toISOString()}] 开始导出多个治疗记录到Excel文件`);
    // 处理空数据情况
    const hasData = records && records.length > 0;
    
    console.log(`[${new Date().toISOString()}] 处理记录数: ${hasData ? records.length : 0} 条`);
    
    // 步骤1：生成Excel文件名（使用日期范围）
    let startDate, endDate;
    if (dateRange) {
      // 使用传入的日期范围
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
      console.log(`[${new Date().toISOString()}] 使用传入的日期范围: ${startDate} 至 ${endDate}`);
    } else if (hasData) {
      // 使用数据中的日期范围
      const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      startDate = sortedRecords[0].date;
      endDate = sortedRecords[sortedRecords.length - 1].date;
      console.log(`[${new Date().toISOString()}] 使用数据中的日期范围: ${startDate} 至 ${endDate}`);
    } else {
      // 默认使用当前日期
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      endDate = yesterday.toISOString().split('T')[0];
      const startDateObj = new Date(yesterday);
      startDateObj.setDate(startDateObj.getDate() - 27);
      startDate = startDateObj.toISOString().split('T')[0];
      console.log(`[${new Date().toISOString()}] 使用默认日期范围: ${startDate} 至 ${endDate}`);
    }
    
    const fileName = `治疗记录_${startDate}_至_${endDate}.xlsx`;
    console.log(`[${new Date().toISOString()}] 生成Excel文件名: ${fileName}`);

    // 步骤2：定义Excel工作表的表头结构
    const headers = [
      ['星期'],                    // 第0行：星期几
      ['日期'],                    // 第1行：治疗日期
      ['血压'],                    // 第2行：血压数据
      ['体重(不带水)'],            // 第3行：体重
      ['加热袋'],                  // 第4行：加热袋容量
      ['补充袋'],                  // 第5行：补充袋容量
      ['治疗方式'],                // 第6行：IPD/CCPD等
      ['总治疗量'],                // 第7行：总治疗量
      ['治疗时间'],                // 第8行：治疗时长
      ['单次注入量'],              // 第9行：每次注入量
      ['末袋注入量'],              // 第10行：最后注入量
      ['循环次数'],                // 第11行：治疗循环次数
      ['0周期超流量'],             // 第12行：0周期超滤量
      ['机器总超滤量'],            // 第13行：机器总超滤量
      ['日间手工注入量'],          // 第14行：日间手工注入量
      ['日间注入浓度'],            // 第15行：日间注入浓度
      ['日间超滤量'],              // 第16行：日间超滤量
      ['机器+手工总超滤量'],       // 第17行：总超滤量（计算值）
      ['饮水量']                   // 第18行：饮水量
    ];

    // 步骤3：创建新的工作簿
    const workbook = XLSX.utils.book_new();
    console.log(`[${new Date().toISOString()}] 创建新的Excel工作簿`);
    
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    console.log(`[${new Date().toISOString()}] 创建Excel工作表并添加表头`);

    // 步骤4：获取工作表对象
    const sheet = workbook.Sheets['Sheet1'];

    // 步骤5：将工作表转换为二维数组格式，便于操作
    let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`[${new Date().toISOString()}] 将工作表转换为二维数组格式，便于操作`);

    // 步骤6：定义关键行的索引
    const dateRowIndex = 1;      // 日期在行索引1（第二行）
    const weekdayRowIndex = 0;   // 星期在行索引0（第一行）

    // 步骤7：定义各数据字段对应的行索引
    const indices = {
      bloodPressure: 2,              // 血压
      weight: 3,                     // 体重
      heatingBag: 4,                 // 加热袋
      supplementBag: 5,              // 补充袋
      treatmentMethod: 6,           // 治疗方式
      totalTreatmentVolume: 7,      // 总治疗量
      treatmentTime: 8,              // 治疗时间
      singleInjectionVolume: 9,     // 单次注入量
      lastBagInjectionVolume: 10,    // 末袋注入量
      cycleCount: 11,                // 循环次数
      zeroCircleFlow: 12,            // 0周期超流量
      machineTotalFlow: 13,          // 机器总超滤量
      dayManualInjection: 14,        // 日间手工注入量
      dayInjectionConcentration: 15, // 日间注入浓度
      dayUltrafiltration: 16,        // 日间超滤量
      machinePlusManualFlow: 17,     // 机器+手工总超滤量
      waterIntake: 18                // 饮水量
    };

    // 步骤8：确保所有行都存在且是有效的数组
    for (let i = 0; i <= indices.waterIntake; i++) {
      if (!rows[i]) {
        rows[i] = [];
      }
    }

    // 步骤9：遍历所有记录并写入Excel
    console.log(`[${new Date().toISOString()}] 开始写入记录到Excel工作表`);
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const targetDate = record.date;
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = record.weekday || weekdays[new Date(targetDate).getDay()];

      // 查找目标日期是否已存在
      let targetColumn = -1;

      // 遍历日期行，查找是否已存在相同日期
      if (rows.length > dateRowIndex) {
        for (let j = 1; j < rows[dateRowIndex].length; j++) {
          const cellValue = rows[dateRowIndex][j];
          const cellValueStr = String(cellValue).trim();
          const targetDateStr = String(targetDate).trim();
          
          if (cellValueStr === targetDateStr) {
            targetColumn = j;
            break;
          }
        }
      }

      // 如果没有找到目标日期，创建新列
      if (targetColumn === -1) {
        targetColumn = rows[0] ? rows[0].length : 1;
      }

      // 步骤10：确保所有行都有足够的列数
      rows.forEach((row, rowIndex) => {
        while (row.length <= targetColumn) {
          row.push('');
        }
      });

      // 填写日期和星期
      rows[dateRowIndex][targetColumn] = targetDate;
      rows[weekdayRowIndex][targetColumn] = weekday;

      // 填写数据
      rows[indices.bloodPressure][targetColumn] = record.bloodPressure;
      rows[indices.weight][targetColumn] = record.weight;
      rows[indices.heatingBag][targetColumn] = record.heatingBag || '2.5';
      rows[indices.supplementBag][targetColumn] = record.supplementBag || '2.5';
      rows[indices.treatmentMethod][targetColumn] = record.treatmentMethod || 'IPD';
      rows[indices.totalTreatmentVolume][targetColumn] = record.totalTreatmentVolume || '8000';
      rows[indices.treatmentTime][targetColumn] = record.treatmentTime || '10';
      rows[indices.singleInjectionVolume][targetColumn] = record.singleInjectionVolume || '2000';
      rows[indices.lastBagInjectionVolume][targetColumn] = record.lastBagInjectionVolume || '0';
      rows[indices.cycleCount][targetColumn] = record.cycleCount || '4';
      rows[indices.zeroCircleFlow][targetColumn] = record.zeroCircleFlow;
      rows[indices.machineTotalFlow][targetColumn] = record.machineTotalFlow;
      rows[indices.dayManualInjection][targetColumn] = record.dayManualInjection || '2000';
      rows[indices.dayInjectionConcentration][targetColumn] = record.dayInjectionConcentration || '艾烤糊精';
      rows[indices.dayUltrafiltration][targetColumn] = record.dayUltrafiltration;
      rows[indices.machinePlusManualFlow][targetColumn] = record.machinePlusManualFlow;
      rows[indices.waterIntake][targetColumn] = record.waterIntake;
    }
    console.log(`[${new Date().toISOString()}] 所有记录写入完成`);

    // 步骤11：转换二维数组为工作表
    const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
    console.log(`[${new Date().toISOString()}] 将二维数组转换回Excel工作表`);

    // 步骤12：替换原工作表
    workbook.Sheets['Sheet1'] = newWorksheet;
    console.log(`[${new Date().toISOString()}] 更新工作表内容完成`);

    // 步骤13：保存文件
    const isMobile = Capacitor.isNativePlatform();
    let savePath = '';

    if (isMobile) {
      // 移动端：使用 Capacitor Filesystem 保存到 Documents 目录
      console.log(`[${new Date().toISOString()}] 检测到移动平台，准备保存文件到Documents目录`);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const base64Data = arrayBufferToBase64(excelBuffer);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      console.log(`[${new Date().toISOString()}] Excel文件已保存到移动端 Documents 目录: ${fileName}`);
      savePath = `${Directory.Documents}/${fileName}`;
    } else {
      // 浏览器端：直接下载文件
      console.log(`[${new Date().toISOString()}] 检测到浏览器平台，准备生成下载文件`);
      XLSX.writeFile(workbook, fileName);
      console.log(`[${new Date().toISOString()}] Excel文件已生成并触发下载: ${fileName}`);
    }

    return {
      success: true,
      message: isMobile
        ? `数据已成功导出到移动端 Documents 目录: ${fileName}`
        : `数据已成功导出到Excel文件: ${fileName}`,
      fileName: fileName,
      savePath: isMobile ? savePath : '',
      recordCount: records ? records.length : 0
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] 导出Excel文件失败，错误: ${error.message}`);
    console.error(error.stack);
    throw error;
  }
}

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 * @param {ArrayBuffer} buffer - 要转换的 ArrayBuffer
 * @returns {string} - Base64 字符串
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
