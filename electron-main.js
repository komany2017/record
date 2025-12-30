const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// 确保只有一个实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'electron-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    });

    // 加载页面
    if (app.isPackaged) {
      // 生产环境加载打包后的文件
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      // 开发环境加载Vite服务器
      mainWindow.loadURL('http://localhost:5173');
      // 开发环境打开开发者工具
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // 处理文件保存请求
  ipcMain.handle('save-excel-file', (event, data, fileName) => {
    try {
      // 创建工作簿和工作表（与前端逻辑保持一致）
      const workbook = XLSX.utils.book_new();
      const headers = [
        "日期", "血压", "体重", "0周期超滤量", "机器总超滤量", "日间手工注入量", 
        "日间注入浓度", "日间超滤量", "饮水量"
      ];
      
      // 获取现有数据
      let existingRows = [];
      const filePath = path.join(app.getPath('documents'), fileName);
      
      if (fs.existsSync(filePath)) {
        const existingWorkbook = XLSX.readFile(filePath);
        const existingWorksheet = existingWorkbook.Sheets['治疗记录'];
        const rows = XLSX.utils.sheet_to_json(existingWorksheet, { header: 1 });
        // 移除标题行，保留数据行
        existingRows = rows.slice(1);
      }
      
      // 检查是否已存在当天的数据
      const existingRowIndex = existingRows.findIndex(row => row[0] === data.date);
      
      // 准备新数据行
      const newRow = [
        data.date,
        data.bloodPressure,
        data.weight,
        data.zeroCircleFlow,
        data.machineTotalFlow,
        data.dayManualInjection || '2000',
        data.dayInjectionConcentration || '艾烤糊精',
        data.dayUltrafiltration || '0',
        data.waterIntake
      ];
      
      // 更新或添加数据行
      if (existingRowIndex !== -1) {
        existingRows[existingRowIndex] = newRow;
      } else {
        existingRows.push(newRow);
      }
      
      // 创建新的工作表
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...existingRows]);
      
      // 将工作表添加到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '治疗记录');
      
      // 保存Excel文件
      XLSX.writeFile(workbook, filePath);
      
      return { success: true, message: `Excel文件已成功保存: ${filePath}` };
    } catch (error) {
      console.error('保存Excel文件失败:', error);
      return { success: false, message: `保存文件失败: ${error.message}` };
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
