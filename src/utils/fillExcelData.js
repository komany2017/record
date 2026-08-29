import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { saveTreatmentRecord, getTreatmentRecordByDate } from './database';



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
    console.log(`[${new Date().toISOString()}] 开始填充Excel数据，日期: ${data.date}`);
    // 保存用户输入的饮水量（累加用），避免被数据库旧值覆盖
    const userInputWaterIntake = Number(data.waterIntake);
    // 步骤1：生成Excel文件名
    // 从日期中提取年月部分，例如：2023-12-15 -> 202312
    const yearMonth = data.date.substring(0, 7).replace('-', ''); 
    const fileName = `治疗记录${yearMonth}.xlsx`;

    // 步骤2：定义Excel工作表的表头结构
    // 每个字段对应一行，用于标识数据的含义
    const headers = [
      ['星期'],                    // 第0行：星期几
      ['日期'],                    // 第1行：治疗日期
      ['血压/心率'],                // 第2行：血压/心率（合并，格式如120/80/75）
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
      ['饮水量'],                   // 第18行：饮水量
      ['腹透液颜色']                // 第19行：腹透液颜色
    ];

    // 步骤3：计算当前日期对应的星期
    const targetDate = data.date;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    let weekday = weekdays[new Date(targetDate).getDay()];

    // 步骤3.1：检查数据库中是否存在相同日期的数据
    // 如果存在，使用数据库数据优先（确保数据一致性）
    const databaseRecord = await getTreatmentRecordByDate(targetDate);
    if (databaseRecord) {
      console.log(`[${new Date().toISOString()}] 发现数据库中存在相同日期的数据，使用数据库数据更新Excel`);
      // 使用数据库中的数据覆盖传入的数据
      data.bloodPressure = databaseRecord.bloodPressure;
      data.heartRate = databaseRecord.heartRate;
      data.weight = databaseRecord.weight;
      data.heatingBag = databaseRecord.heatingBag;
      data.supplementBag = databaseRecord.supplementBag;
      data.treatmentMethod = databaseRecord.treatmentMethod;
      data.totalTreatmentVolume = databaseRecord.totalTreatmentVolume;
      data.treatmentTime = databaseRecord.treatmentTime;
      data.singleInjectionVolume = databaseRecord.singleInjectionVolume;
      data.lastBagInjectionVolume = databaseRecord.lastBagInjectionVolume;
      data.cycleCount = databaseRecord.cycleCount;
      data.zeroCircleFlow = databaseRecord.zeroCircleFlow;
      data.machineTotalFlow = databaseRecord.machineTotalFlow;
      data.dayManualInjection = databaseRecord.dayManualInjection;
      data.dayInjectionConcentration = databaseRecord.dayInjectionConcentration;
      data.dayUltrafiltration = databaseRecord.dayUltrafiltration;
      data.waterIntake = databaseRecord.waterIntake;
      data.dialysateColor = databaseRecord.dialysateColor;
      // 从数据库获取星期，确保一致性
      weekday = databaseRecord.weekday;
    }

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
          console.log(`[${new Date().toISOString()}] 从移动端文件系统读取现有工作簿: ${fileName}`);
        } catch (readError) {
          // 文件不存在时，创建新的工作簿
          console.log(`[${new Date().toISOString()}] 移动端文件不存在，创建新工作簿: ${fileName}`);
          workbook = XLSX.utils.book_new();
          worksheet = XLSX.utils.aoa_to_sheet(headers);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        }
      } else {
        // 浏览器端：总是创建新的工作簿（因为无法直接访问文件系统）
        console.log(`[${new Date().toISOString()}] 浏览器端创建新工作簿: ${fileName}`);
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet(headers);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      }
    } catch (error) {
      // 发生任何错误时，创建新的工作簿
      console.log(`[${new Date().toISOString()}] 发生错误，创建新工作簿: ${fileName}`);
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }

    // 步骤7：获取工作表对象
    worksheet = workbook.Sheets['Sheet1'];

    // 步骤8：将工作表转换为二维数组格式，便于操作
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 步骤9：从第0列（表头列）动态检测各数据行的实际索引
    // 兼容历史文件结构：旧文件可能没有"机器+手工总超滤量"行，饮水量/腹透液颜色位于不同行
    const rowLabels = {
      weekday: '星期',
      date: '日期',
      bloodPressureHeartRate: '血压/心率',
      weight: '体重(不带水)',
      heatingBag: '加热袋',
      supplementBag: '补充袋',
      treatmentMethod: '治疗方式',
      totalTreatmentVolume: '总治疗量',
      treatmentTime: '治疗时间',
      singleInjectionVolume: '单次注入量',
      lastBagInjectionVolume: '末袋注入量',
      cycleCount: '循环次数',
      zeroCircleFlow: '0周期超流量',
      machineTotalFlow: '机器总超滤量',
      dayManualInjection: '日间手工注入量',
      dayInjectionConcentration: '日间注入浓度',
      dayUltrafiltration: '日间超滤量',
      machinePlusManualFlow: '机器+手工总超滤量',
      waterIntake: '饮水量',
      dialysateColor: '腹透液颜色'
    };
    const indices = {};
    const usedRows = new Set();
    Object.keys(rowLabels).forEach(key => {
      const label = rowLabels[key];
      let found = -1;
      for (let i = 0; i < rows.length; i++) {
        if (usedRows.has(i)) continue;
        const cellLabel = String(rows[i] && rows[i][0] !== undefined ? rows[i][0] : '').trim();
        if (cellLabel === label) { found = i; usedRows.add(i); break; }
      }
      indices[key] = found;
    });
    // 兼容旧文件：如果没有"血压/心率"行，使用"血压"行作为 fallback
    if (indices.bloodPressureHeartRate === -1) {
      for (let i = 0; i < rows.length; i++) {
        if (usedRows.has(i)) continue;
        const cellLabel = String(rows[i] && rows[i][0] !== undefined ? rows[i][0] : '').trim();
        if (cellLabel === '血压') {
          indices.bloodPressureHeartRate = i;
          usedRows.add(i);
          // 更新表头标签为新格式
          rows[i][0] = '血压/心率';
          break;
        }
      }
    }
    // 未找到的行（新字段在旧文件中不存在）分配到末尾新行
    let nextNewRowIndex = rows.length;
    Object.keys(rowLabels).forEach(key => {
      if (indices[key] === -1) {
        indices[key] = nextNewRowIndex++;
      }
    });
    const dateRowIndex = indices.date;
    const weekdayRowIndex = indices.weekday;
    console.log(`[${new Date().toISOString()}] 检测到行索引: 血压/心率=${indices.bloodPressureHeartRate}, 饮水量=${indices.waterIntake}, 腹透液颜色=${indices.dialysateColor}, 机器+手工=${indices.machinePlusManualFlow}`);

    // 步骤10：查找目标日期是否已存在
    let targetColumn = -1;

    // 步骤11：遍历日期行，查找是否已存在相同日期
    if (rows.length > dateRowIndex) {
      // 遍历日期行的所有列，查找目标日期（从列1开始，跳过表头列）
      for (let i = 1; i < rows[dateRowIndex].length; i++) {
        const cellValueStr = String(rows[dateRowIndex][i]).trim();
        const targetDateStr = String(targetDate).trim();
        console.log(`[${new Date().toISOString()}] 比较日期: 列${i} = "${cellValueStr}" vs 目标 = "${targetDateStr}"`);
        if (cellValueStr === targetDateStr) {
          targetColumn = i;
          console.log(`[${new Date().toISOString()}] 找到匹配的日期列: ${targetColumn}`);
          break;
        }
      }
    }

    // 步骤12：根据查找结果确定目标列
    if (targetColumn === -1) {
      targetColumn = rows[0] ? rows[0].length : 1;
      console.log(`[${new Date().toISOString()}] 未找到匹配日期，创建新列: ${targetColumn}`);
    } else {
      console.log(`[${new Date().toISOString()}] 找到现有列，将更新数据: ${targetColumn}`);
    }

    // 步骤13：确保所有行都有足够的列数
    rows.forEach(row => {
      while (row.length <= targetColumn) {
        row.push('');
      }
    });

    // 步骤14：确保rows数组有足够的行（覆盖所有检测到的行索引，包括新增行）
    const maxRowIndex = Math.max(...Object.values(indices));
    while (rows.length <= maxRowIndex) {
      const newRow = [];
      while (newRow.length <= targetColumn) {
        newRow.push('');
      }
      rows.push(newRow);
    }

    // 确保所有行都存在且是有效的数组
    for (let i = 0; i <= maxRowIndex; i++) {
      if (!rows[i]) {
        rows[i] = [];
      }
      while (rows[i].length <= targetColumn) {
        rows[i].push('');
      }
    }
    // 为检测到的行补充表头标签（仅在列0为空时，避免覆盖已有标签）
    Object.keys(rowLabels).forEach(key => {
      const idx = indices[key];
      if (rows[idx] && (rows[idx][0] === '' || rows[idx][0] === undefined || rows[idx][0] === null)) {
        rows[idx][0] = rowLabels[key];
      }
    });

    // 填写日期和星期
    rows[dateRowIndex][targetColumn] = targetDate;
    rows[weekdayRowIndex][targetColumn] = weekday;
    //* @param {string} data.dayInjectionConcentration - 日间注入浓度
    //* @param {string} data.dayUltrafiltration - 日间超滤量
    // 填写数据
    // 血压/心率合并为一行，格式：收缩压/舒张压/心率（如120/80/75）
    rows[indices.bloodPressureHeartRate][targetColumn] = `${data.bloodPressure}/${data.heartRate}`;
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

    // 饮水量：直接使用用户输入值，不累加
    rows[indices.waterIntake][targetColumn] = userInputWaterIntake;
    rows[indices.dialysateColor][targetColumn] = data.dialysateColor || '清亮';

    // 将数据保存到数据库
    const databaseData = {
      date: data.date,
      weekday: weekday,
      bloodPressure: data.bloodPressure,
      heartRate: data.heartRate,
      weight: data.weight,
      heatingBag: data.heatingBag || '2.5',
      supplementBag: data.supplementBag || '2.5',
      treatmentMethod: data.treatmentMethod || 'IPD',
      totalTreatmentVolume: data.totalTreatmentVolume || '8000',
      treatmentTime: data.treatmentTime || '10',
      singleInjectionVolume: data.singleInjectionVolume || '2000',
      lastBagInjectionVolume: data.lastBagInjectionVolume || '0',
      cycleCount: data.cycleCount || '4',
      zeroCircleFlow: data.zeroCircleFlow,
      machineTotalFlow: data.machineTotalFlow,
      dayManualInjection: data.dayManualInjection || '2000',
      dayInjectionConcentration: data.dayInjectionConcentration || '艾烤糊精',
      dayUltrafiltration: data.dayUltrafiltration,
      machinePlusManualFlow: machinePlusManualFlow,
      waterIntake: userInputWaterIntake,
      dialysateColor: data.dialysateColor || '清亮'
    };

    console.log(`[${new Date().toISOString()}] 开始将数据保存到数据库，日期: ${data.date}`);
    await saveTreatmentRecord(databaseData);
    console.log(`[${new Date().toISOString()}] 数据已成功保存到数据库，日期: ${data.date}`);

    // 转换二维数组为工作表
    const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
    console.log(`[${new Date().toISOString()}] 将二维数组转换回Excel工作表`);

    // 替换原工作表
    workbook.Sheets['Sheet1'] = newWorksheet;
    console.log(`[${new Date().toISOString()}] 更新工作表内容完成`);

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

      console.log(`[${new Date().toISOString()}] Excel文件已保存到移动端 Documents 目录: ${fileName}`);
    } else {
        XLSX.writeFile(workbook, fileName);
        console.log(`[${new Date().toISOString()}] Excel文件已下载到浏览器: ${fileName}`);
    }

    console.log(`[${new Date().toISOString()}] Excel数据填充成功，日期: ${data.date}`);
    
    return {
      success: true,
      weekday: weekday,
      message: isMobile
        ? `数据已成功保存到移动端 Documents 目录: ${fileName}`
        : '数据已成功保存到Excel文件'
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Excel数据填充失败，日期: ${data.date}，错误: ${error.message}`);
    console.error(error.stack);
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

/**
 * 从Excel读出指定日期的当日饮水量（累加基数）
 * 移动端读取Documents目录下对应月份的Excel文件，查找日期列并返回饮水量单元格的值。
 * 浏览器端无持久化Excel，回退到数据库查询。
 * @param {string} date - 日期，格式：YYYY-MM-DD
 * @returns {Promise<number>} - 当日饮水量（未找到返回0）
 */
export async function getWaterIntakeByDate(date) {
  try {
    const yearMonth = date.substring(0, 7).replace('-', '');
    const fileName = `治疗记录${yearMonth}.xlsx`;
    const isMobile = Capacitor.isNativePlatform();

    if (!isMobile) {
      // 浏览器端无持久化Excel，回退到数据库
      const rec = await getTreatmentRecordByDate(date);
      return rec && rec.waterIntake != null ? Number(rec.waterIntake) : 0;
    }

    // 移动端：读取Documents目录下的Excel文件
    let fileContent;
    try {
      fileContent = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents
      });
    } catch (e) {
      // 文件不存在，当日饮水量为0
      return 0;
    }

    const binaryString = atob(fileContent.data);
    const workbook = XLSX.read(binaryString, { type: 'binary' });
    const worksheet = workbook.Sheets['Sheet1'];
    if (!worksheet) return 0;

    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const dateRowIndex = 1;        // 日期在行索引1
    const waterIntakeRowIndex = 19; // 饮水量在行索引19

    if (rows.length <= dateRowIndex) return 0;

    // 遍历日期行查找匹配日期
    for (let i = 1; i < rows[dateRowIndex].length; i++) {
      const cellValueStr = String(rows[dateRowIndex][i]).trim();
      if (cellValueStr === String(date).trim()) {
        const val = rows[waterIntakeRowIndex] ? rows[waterIntakeRowIndex][i] : '';
        return Number(val) || 0;
      }
    }
    // 未找到匹配日期
    return 0;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 读取当日饮水量失败，日期: ${date}，错误: ${error.message}`);
    return 0;
  }
}