import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * 处理Excel文件操作
 * @param {Object} data - 包含治疗数据的对象
 * @returns {Promise<Object>} - 处理结果
 */
export async function fillExcelData(data) {
  try {
    const yearMonth = data.date.substring(0, 7).replace('-', '');
    const fileName = `治疗记录${yearMonth}.xlsx`;
    
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
    
    const targetDate = data.date;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[new Date(targetDate).getDay()];
    
    let workbook;
    let worksheet;
    let rows;
    
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
    
    if (isCapacitor) {
      try {
        const fileExists = await Filesystem.readFile({
          path: fileName,
          directory: Directory.Documents
        });
        
        if (fileExists) {
          const base64Data = fileExists.data;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;
          workbook = XLSX.read(arrayBuffer, { type: 'array' });
          worksheet = workbook.Sheets['Sheet1'];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log('读取现有文件成功');
        }
      } catch (error) {
        console.log('文件不存在，创建新文件');
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet(headers);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }
    } else {
      try {
        workbook = XLSX.readFile(fileName);
        worksheet = workbook.Sheets['Sheet1'];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('读取现有文件成功');
      } catch (error) {
        console.log('文件不存在，创建新文件');
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet(headers);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }
    }
    
    const dateRowIndex = 1;
    const weekdayRowIndex = 0;
    
    let targetColumn = -1;
    
    if (rows.length > dateRowIndex) {
      for (let i = 1; i < rows[dateRowIndex].length; i++) {
        let cellValue = rows[dateRowIndex][i];
        console.log(`检查列 ${i}: cellValue=${cellValue}, targetDate=${targetDate}, type=${typeof cellValue}`);
        
        if (cellValue && String(cellValue) === String(targetDate)) {
          targetColumn = i;
          console.log(`找到匹配的日期列: ${targetColumn}`);
          break;
        }
      }
    }
    
    if (targetColumn === -1) {
      targetColumn = rows[0] ? rows[0].length : 1;
      console.log(`创建新列: ${targetColumn}`);
    } else {
      console.log(`找到现有列: ${targetColumn}，更新数据`);
    }
    
    rows.forEach((row, rowIndex) => {
      while (row.length <= targetColumn) {
        row.push('');
      }
    });
    
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
    
    while (rows.length <= indices.waterIntake) {
      const newRow = [];
      while (newRow.length <= targetColumn) {
        newRow.push('');
      }
      rows.push(newRow);
    }
    
    for (let i = 0; i <= indices.waterIntake; i++) {
      if (!rows[i]) {
        rows[i] = [];
      }
      while (rows[i].length <= targetColumn) {
        rows[i].push('');
      }
    }
    
    rows[dateRowIndex][targetColumn] = targetDate;
    rows[weekdayRowIndex][targetColumn] = weekday;
    
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
    
    const machinePlusManualFlow = (data.zeroCircleFlow || 0) + (data.machineTotalFlow || 0) + (data.dayUltrafiltration || 0);
    rows[indices.machinePlusManualFlow][targetColumn] = machinePlusManualFlow;
    
    rows[indices.waterIntake][targetColumn] = data.waterIntake;
    
    const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
    
    applyExcelStyles(newWorksheet, rows, targetColumn);
    
    workbook.Sheets['Sheet1'] = newWorksheet;
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    let savePath = '';
    
    if (isCapacitor) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(excelData);
        });
        
        const base64Content = base64Data.split(',')[1];
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Content,
          directory: Directory.Documents,
          recursive: true
        });
        
        savePath = result.uri;
      } catch (error) {
        console.error('Capacitor文件保存失败:', error);
        await XLSX.writeFile(workbook, fileName);
        savePath = 'Documents/' + fileName;
      }
    } else {
      await XLSX.writeFile(workbook, fileName);
      
      try {
        if (window.navigator && window.navigator.userAgent) {
          const isWindows = navigator.userAgent.includes('Windows');
          const isMac = navigator.userAgent.includes('Mac');
          const isLinux = navigator.userAgent.includes('Linux');
          
          if (isWindows) {
            savePath = 'C:\\Users\\用户名\\Downloads\\' + fileName;
          } else if (isMac) {
            savePath = '/Users/用户名/Downloads/' + fileName;
          } else if (isLinux) {
            savePath = '/home/用户名/Downloads/' + fileName;
          } else {
            savePath = '默认下载目录/' + fileName;
          }
        }
      } catch (error) {
        savePath = '默认下载目录/' + fileName;
      }
    }
   
    return {
      success: true,
      weekday: weekday,
      fileName: fileName,
      savePath: savePath,
      message: `数据已成功保存到Excel文件\n文件名: ${fileName}\n保存路径: ${savePath}`
    };
    
  } catch (error) {
    console.error('处理Excel文件时出错:', error);
    throw new Error('处理Excel文件时发生错误');
  }
}

/**
 * 应用Excel样式
 * @param {Object} worksheet - 工作表对象
 * @param {Array} rows - 数据行
 * @param {number} targetColumn - 目标列
 */
function applyExcelStyles(worksheet, rows, targetColumn) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  const headerStyle = {
    font: {
      name: 'Microsoft YaHei',
      sz: 12,
      bold: true,
      color: { rgb: 'FFFFFF' }
    },
    fill: {
      fgColor: { rgb: '4472C4' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } }
    }
  };
  
  const dataStyle = {
    font: {
      name: 'Microsoft YaHei',
      sz: 11
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } }
    }
  };
  
  const dateStyle = {
    font: {
      name: 'Microsoft YaHei',
      sz: 11,
      bold: true
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    fill: {
      fgColor: { rgb: 'E7E6E6' }
    },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } }
    }
  };
  
  const weekdayStyle = {
    font: {
      name: 'Microsoft YaHei',
      sz: 11,
      bold: true,
      color: { rgb: 'FF0000' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    fill: {
      fgColor: { rgb: 'FFF2CC' }
    },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } }
    }
  };
  
  const highlightStyle = {
    font: {
      name: 'Microsoft YaHei',
      sz: 11,
      bold: true
    },
    fill: {
      fgColor: { rgb: 'C6E0B4' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } }
    }
  };
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (!cell) continue;
      
      if (C === 0) {
        cell.s = headerStyle;
      } else if (R === 0) {
        cell.s = weekdayStyle;
      } else if (R === 1) {
        cell.s = dateStyle;
      } else if (C === targetColumn) {
        cell.s = highlightStyle;
      } else {
        cell.s = dataStyle;
      }
    }
  }
  
  const colWidths = [
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 }
  ];
  
  for (let i = 0; i <= range.e.c; i++) {
    if (i < colWidths.length) {
      worksheet['!cols'] = worksheet['!cols'] || [];
      worksheet['!cols'][i] = colWidths[i];
    } else {
      worksheet['!cols'] = worksheet['!cols'] || [];
      worksheet['!cols'][i] = { wch: 12 };
    }
  }
  
  worksheet['!freeze'] = { xSplit: 1, ySplit: 2 };
}