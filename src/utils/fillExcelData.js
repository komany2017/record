import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * 处理Excel文件操作，将治疗数据写入Excel文件
 * 
 * 功能说明：
 * 1. 根据日期生成对应的Excel文件名（按月份分组）
 * 2. 移动端：从Documents目录读取现有文件，如果存在则更新相同日期的数据
 * 3. 浏览器端：创建新的Excel文件并下载
 * 4. 相同日期的数据只更新不新增列
 * 
 * @param {Object} data - 包含治疗数据的对象
 * @param {string} data.date - 治疗日期，格式：YYYY-MM-DD
 * @param {string} data.bloodPressure - 血压
 * @param {string} data.weight - 体重(不带水)
 * @param {string} data.heatingBag - 加热袋
 * @param {string} data.supplementBag - 补充袋
 * @param {string} data.treatmentMethod - 治疗方式
 * @param {string} data.totalTreatmentVolume - 总治疗量
 * @param {string} data.treatmentTime - 治疗时间
 * @param {string} data.singleInjectionVolume - 单次注入量
 * @param {string} data.lastBagInjectionVolume - 末袋注入量
 * @param {string} data.cycleCount - 循环次数
 * @param {string} data.zeroCircleFlow - 0周期超流量
 * @param {string} data.machineTotalFlow - 机器总超滤量
 * @param {string} data.dayManualInjection - 日间手工注入量
 * @param {string} data.dayInjectionConcentration - 日间注入浓度
 * @param {string} data.dayUltrafiltration - 日间超滤量
 * @param {string} data.waterIntake - 饮水量
 * @returns {Promise<Object>} - 处理结果，包含success、weekday和message字段
 */
export async function fillExcelData(data) {
  try {
    // 步骤1：生成Excel文件名
    // 从日期中提取年月部分，例如：2023-12-15 -> 202312
    const yearMonth = data.date.substring(0, 7).replace('-', ''); 
    const fileName = `治疗记录${yearMonth}.xlsx`;

    // 步骤2：定义Excel工作表的表头结构
    // 每个字段对应一行，用于标识数据的含义
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

    // 步骤3：计算当前日期对应的星期
    const targetDate = data.date;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[new Date(targetDate).getDay()];

    // 步骤4：初始化工作簿变量
    let workbook;
    let worksheet;

    // 步骤5：检测当前运行环境（移动端或浏览器端）
    const isMobile = Capacitor.isNativePlatform();

    // 步骤6：根据运行环境加载或创建工作簿
    try {
      if (isMobile) {
        // 移动端：尝试从文件系统读取现有文件
        try {
          // 使用Capacitor Filesystem插件读取Documents目录下的文件
          const fileContent = await Filesystem.readFile({
            path: fileName,
            directory: Directory.Documents
          });

          // 将base64编码的文件内容解码为二进制字符串
          const binaryString = atob(fileContent.data);
          // 使用XLSX库解析二进制数据为工作簿对象
          const workbookData = XLSX.read(binaryString, { type: 'binary' });
          workbook = workbookData;
          console.log('从移动端文件系统读取现有工作簿');
        } catch (readError) {
          // 文件不存在时，创建新的工作簿
          console.log('移动端文件不存在，创建新工作簿');
          workbook = XLSX.utils.book_new();
          worksheet = XLSX.utils.aoa_to_sheet(headers);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        }
      } else {
        // 浏览器端：总是创建新的工作簿（因为无法直接访问文件系统）
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet(headers);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      }
    } catch (error) {
      // 发生任何错误时，创建新的工作簿
      console.log('创建新工作簿');
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }

    // 步骤7：获取工作表对象
    worksheet = workbook.Sheets['Sheet1'];

    // 步骤8：将工作表转换为二维数组格式，便于操作
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 步骤9：定义关键行的索引
    const dateRowIndex = 1;      // 日期在行索引1（第二行）
    const weekdayRowIndex = 0;   // 星期在行索引0（第一行）

    // 步骤10：查找目标日期是否已存在
    let targetColumn = -1;

    // 步骤11：遍历日期行，查找是否已存在相同日期
    // 确保日期行存在
    if (rows.length > dateRowIndex) {
      // 遍历日期行的所有列，查找目标日期
      // 从列索引1开始，跳过第一列（第一列是表头）
      for (let i = 1; i < rows[dateRowIndex].length; i++) {
        const cellValue = rows[dateRowIndex][i];
        // 转换为字符串并去除首尾空格后进行比较
        const cellValueStr = String(cellValue).trim();
        const targetDateStr = String(targetDate).trim();
        
        console.log(`比较日期: 列${i} = "${cellValueStr}" vs 目标 = "${targetDateStr}"`);
        
        // 如果找到匹配的日期，记录列索引并退出循环
        if (cellValueStr === targetDateStr) {
          targetColumn = i;
          console.log(`找到匹配的日期列: ${targetColumn}`);
          break;
        }
      }
    }

    // 步骤12：根据查找结果确定目标列
    // 如果没有找到目标日期，创建新列
    if (targetColumn === -1) {
      // 确定新列的索引（在最后一列后添加）
      targetColumn = rows[0] ? rows[0].length : 1;
      console.log(`未找到匹配日期，创建新列: ${targetColumn}`);
    } else {
      // 找到匹配日期，将更新该列数据
      console.log(`找到现有列，将更新数据: ${targetColumn}`);
    }

    // 步骤13：确保所有行都有足够的列数
    // 如果某行列数不足，用空字符串填充到目标列
    rows.forEach((row, rowIndex) => {
      while (row.length <= targetColumn) {
        row.push('');
      }
    });

    // 步骤14：定义各数据字段对应的行索引
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
    //* @param {string} data.dayInjectionConcentration - 日间注入浓度
    //* @param {string} data.dayUltrafiltration - 日间超滤量
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
    rows[indices.dayManualInjection][targetColumn] = data.dayManualInjection || '2000';
    rows[indices.dayInjectionConcentration][targetColumn] = data.dayInjectionConcentration || '艾烤糊精';
    rows[indices.dayUltrafiltration][targetColumn] = data.dayUltrafiltration;

    // 计算机器+手工总超滤量
    const machinePlusManualFlow = (data.zeroCircleFlow || 0) + (data.machineTotalFlow || 0) + (data.dayUltrafiltration || 0);
    rows[indices.machinePlusManualFlow][targetColumn] = machinePlusManualFlow;

    rows[indices.waterIntake][targetColumn] = data.waterIntake;

    // 转换二维数组为工作表
    const newWorksheet = XLSX.utils.aoa_to_sheet(rows);

    // 替换原工作表
    workbook.Sheets['Sheet1'] = newWorksheet;

    // 保存文件
    if (isMobile) {
      // 移动端：使用 Capacitor Filesystem 保存到 Documents 目录
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const base64Data = arrayBufferToBase64(excelBuffer);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      console.log(`文件已保存到移动端 Documents 目录: ${fileName}`);
    } else {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const base64Data = arrayBufferToBase64(excelBuffer);
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      // 浏览器端：使用 XLSX.writeFile 下载
      // XLSX.writeFile(workbook, fileName);
    }

    return {
      success: true,
      weekday: weekday,
      message: isMobile
        ? `数据已成功保存到移动端 Documents 目录: ${fileName}`
        : '数据已成功保存到Excel文件'
    };

  } catch (error) {
    console.error('处理Excel文件时出错:', error);
    throw new Error('处理Excel文件时发生错误');
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