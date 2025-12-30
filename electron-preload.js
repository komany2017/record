const { contextBridge, ipcRenderer } = require('electron');

// 暴露IPC方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 保存Excel文件的方法
  saveExcelFile: (data, fileName) => ipcRenderer.invoke('save-excel-file', data, fileName)
});
