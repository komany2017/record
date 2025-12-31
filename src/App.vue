<template>
  <div class="app-container">
    <header class="app-header">
      <h1>治疗记录数据录入</h1>
    </header>

    <main class="app-main">
      <!-- 日期选择卡片 -->
      <div class="card date-card">
        <div class="form-group">
          <label for="date">记录日期</label>
          <input type="date" id="date" v-model="selectedDate" required>
        </div>
      </div>

      <!-- 导出按钮卡片 -->
      <div class="card export-card">
        <button type="button" class="export-button" @click="export28DaysData" :disabled="isExporting">
          <span class="button-icon">📊</span>
          <span class="button-text">{{ isExporting ? '导出中...' : '导出最近28天数据' }}</span>
        </button>
      </div>

      <!-- 数据输入表单卡片 -->
      <form @submit.prevent="submitForm" class="card form-card">
        <h2 class="form-title">治疗数据</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="bloodPressure">血压</label>
            <input type="text" id="bloodPressure" v-model="formData.bloodPressure" placeholder="例如: 120/80" required>
          </div>
          
          <div class="form-group">
            <label for="weight">体重 (kg)</label>
            <input type="number" id="weight" v-model.number="formData.weight" step="0.1" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="zeroCircleFlow">0周期超滤量</label>
            <input type="number" id="zeroCircleFlow" v-model.number="formData.zeroCircleFlow" required>
          </div>
          
          <div class="form-group">
            <label for="machineTotalFlow">机器总超滤量</label>
            <input type="number" id="machineTotalFlow" v-model.number="formData.machineTotalFlow" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="dayManualInjection">日间手工注入量</label>
            <input type="number" id="dayManualInjection" v-model.number="formData.dayManualInjection" placeholder="默认2000">
          </div>
          
          <div class="form-group">
            <label for="dayInjectionConcentration">日间注入浓度</label>
            <input type="text" id="dayInjectionConcentration" v-model="formData.dayInjectionConcentration" placeholder="默认艾烤糊精">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="dayUltrafiltration">日间超滤量</label>
            <input type="number" id="dayUltrafiltration" v-model.number="formData.dayUltrafiltration" placeholder="默认0">
          </div>
          
          <div class="form-group">
            <label for="waterIntake">饮水量</label>
            <input type="number" id="waterIntake" v-model.number="formData.waterIntake" required>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-button" :disabled="isSubmitting">
            <span class="button-icon">{{ isSubmitting ? '⏳' : '💾' }}</span>
            <span class="button-text">{{ isSubmitting ? '提交中...' : '提交数据' }}</span>
          </button>
        </div>
      </form>

      <!-- 结果显示区域 -->
      <transition name="fade">
        <div v-if="showResult" class="card result-card">
          <h2 class="result-title">提交结果</h2>
          <div class="result-content">
            <div class="result-item">
              <span class="result-label">日期：</span>
              <span class="result-value">{{ selectedDate }}</span>
            </div>
            <div v-for="(value, key) in formData" :key="key" class="result-item">
              <span class="result-label">{{ 
                key === 'bloodPressure' ? '血压：' : 
                key === 'weight' ? '体重：' : 
                key === 'zeroCircleFlow' ? '0周期超滤量：' : 
                key === 'machineTotalFlow' ? '机器总超滤量：' : 
                key === 'dayManualInjection' ? '日间手工注入量：' : 
                key === 'dayInjectionConcentration' ? '日间注入浓度：' : 
                key === 'dayUltrafiltration' ? '日间超滤量：' : '饮水量：' 
              }}</span>
              <span class="result-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </transition>
    </main>
    
    <!-- 通知消息 -->
    <div class="notification-container">
      <transition name="slide-up">
        <div v-if="successMessage" class="notification success-notification">
          <div class="notification-icon">✓</div>
          <div class="notification-content">
            <div class="notification-title">保存成功</div>
            <div class="notification-details">
              <div v-if="saveFileName" class="detail-item">
                <span class="detail-label">文件名:</span>
                <span class="detail-value">{{ saveFileName }}</span>
              </div>
              <div v-if="savePath" class="detail-item">
                <span class="detail-label">保存路径:</span>
                <span class="detail-value">{{ savePath }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>
      
      <transition name="slide-up">
        <div v-if="error" class="notification error-notification">
          <div class="notification-icon">⚠️</div>
          <div class="notification-content">
            <div class="notification-title">操作失败</div>
            <div class="notification-message">{{ error }}</div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { fillExcelData } from './utils/fillExcelData.js';
import { saveTreatmentRecord, getTreatmentRecordsByDateRange } from './utils/database.js';

export default {
  name: 'App',
  data() {
    return {
      selectedDate: this.getTodayDate(),
      formData: {
        bloodPressure: '',
        weight: '',
        zeroCircleFlow: '',
        machineTotalFlow: '',
        dayManualInjection: '',
        dayInjectionConcentration: '',
        dayUltrafiltration: '',
        waterIntake: ''
      },
      isSubmitting: false,
      isExporting: false,
      showResult: false,
      successMessage: '',
      saveFileName: '',
      savePath: '',
      error: ''
    };
  },
  methods: {
    getTodayDate() {
      const today = new Date();
      return today.toISOString().split('T')[0];
    },
    
    async submitForm() {
      try {
        console.log(`[${new Date().toISOString()}] 用户开始提交治疗记录，日期: ${this.selectedDate}`);
        this.isSubmitting = true;
        this.error = '';
        this.successMessage = '';
        
        // 验证血压格式
        const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;
        if (!bloodPressureRegex.test(this.formData.bloodPressure)) {
          console.error(`[${new Date().toISOString()}] 血压格式验证失败: ${this.formData.bloodPressure}`);
          this.error = '血压格式不正确，请输入如 120/80 的格式';
          return;
        }
        
        // 准备数据
        const dateObj = new Date(this.selectedDate);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        // 计算machinePlusManualFlow字段
        const machinePlusManualFlow = (this.formData.machineTotalFlow || 0) + (this.formData.dayManualInjection || 0);
        
        const data = {
          ...this.formData,
          date: this.selectedDate,
          weekday: weekday,
          machinePlusManualFlow: machinePlusManualFlow
        };
        
        console.log(`[${new Date().toISOString()}] 数据准备完成，准备保存到数据库`);
        
        // 保存数据到前端数据库
        const saveResult = await saveTreatmentRecord(data);
        if (!saveResult.success) {
          this.error = '数据保存到数据库失败，请重试';
          return;
        }
        
        // 直接调用前端fillExcelData函数生成Excel文件
        const result = await fillExcelData(data);
        
        // 显示成功消息
        this.showResult = true;
        this.successMessage = result.message;
        this.saveFileName = result.fileName || '';
        this.savePath = result.savePath || '';
        
        console.log(`[${new Date().toISOString()}] 治疗记录提交成功，日期: ${this.selectedDate}`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 提交治疗记录失败，日期: ${this.selectedDate}，错误: ${error.message}`);
        console.error(error.stack);
        this.error = '提交失败，请重试';
      } finally {
        this.isSubmitting = false;
        console.log(`[${new Date().toISOString()}] 表单提交操作完成`);
      }
    },
    
    async export28DaysData() {
      try {
        console.log(`[${new Date().toISOString()}] 用户开始导出最近28天的治疗记录`);
        this.isExporting = true;
        this.error = '';
        this.successMessage = '';
        
        // 计算日期范围：昨天到28天前
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const endDate = yesterday.toISOString().split('T')[0];
        const startDate = new Date(yesterday);
        startDate.setDate(startDate.getDate() - 27); // 28天前
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        console.log(`[${new Date().toISOString()}] 导出日期范围: ${formattedStartDate} 到 ${endDate}`);
        
        // 从数据库获取数据
        const recordsResult = await getTreatmentRecordsByDateRange(formattedStartDate, endDate);
        const records = recordsResult.success ? recordsResult.data : [];
        
        console.log(`[${new Date().toISOString()}] 从数据库获取到 ${records.length} 条记录`);
        
        // 导入导出Excel的工具函数
        const { exportMultipleRecordsToExcel } = await import('./utils/exportExcel.js');
        
        // 导出到Excel，传递日期范围以便生成正确的文件名
        console.log(`[${new Date().toISOString()}] 开始生成Excel文件`);
        const result = await exportMultipleRecordsToExcel(records, { 
          startDate: formattedStartDate, 
          endDate: endDate 
        });
        
        // 显示成功消息
        this.successMessage = result.message;
        this.saveFileName = result.fileName || '';
        this.savePath = result.savePath || '';
        
        console.log(`[${new Date().toISOString()}] 导出最近28天数据成功，共 ${records.length} 条记录`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 导出数据失败，错误: ${error.message}`);
        console.error(error.stack);
        this.error = '导出失败，请重试';
      } finally {
        this.isExporting = false;
        console.log(`[${new Date().toISOString()}] 导出操作完成`);
      }
    }
  }
};
</script>

<style>
/* 容器样式 */
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 标题样式 */
.app-header h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 主内容区域 */
.app-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.card {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 日期选择卡片 */
.date-card {
  padding: 16px;
}

/* 导出按钮卡片 */
.export-card {
  padding: 16px;
}

/* 表单卡片 */
.form-card {
  padding: 28px;
}

.form-title {
  margin-top: 0;
  margin-bottom: 24px;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

/* 表单样式 */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 10px;
  font-weight: 600;
  color: #34495e;
  font-size: 15px;
  transition: color 0.3s ease;
}

.form-group input {
  padding: 14px 16px;
  border: 2px solid #e0e6ed;
  border-radius: 12px;
  font-size: 16px;
  background-color: #ffffff;
  transition: all 0.3s ease;
  -webkit-appearance: none;
  appearance: none;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background-color: #f8f9ff;
}

.form-group input:hover:not(:focus) {
  border-color: #c0c8d3;
}

.form-group input::placeholder {
  color: #95a5a6;
  opacity: 1;
}

/* 日期输入框特殊样式 */
input[type="date"] {
  cursor: pointer;
}

/* 按钮样式 */
.button-icon {
  margin-right: 8px;
  font-size: 18px;
  vertical-align: middle;
}

.button-text {
  vertical-align: middle;
  font-weight: 600;
}

/* 导出按钮样式 */
.export-button {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: white;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
  transition: all 0.3s ease;
  font-family: inherit;
}

.export-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.5);
}

.export-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(46, 204, 113, 0.3);
}

.export-button:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

/* 提交按钮样式 */
.form-actions {
  margin-top: 32px;
}

.submit-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 18px 24px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 700;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.submit-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.submit-button:hover:not(:disabled)::before {
  left: 100%;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

/* 结果显示区域 */
.result-card {
  border-left: 4px solid #667eea;
  padding: 24px;
  margin-top: 20px;
}

.result-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9ff;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.result-item:hover {
  background-color: #eef2ff;
}

.result-label {
  font-weight: 600;
  color: #34495e;
  font-size: 15px;
}

.result-value {
  font-weight: 500;
  color: #2c3e50;
  font-size: 15px;
  font-family: 'Courier New', monospace;
}

/* 通知消息容器 */
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  width: 100%;
}

/* 通知消息样式 */
.notification {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  animation: slideIn 0.3s ease-out;
}

.success-notification {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.error-notification {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.notification-icon {
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.2);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.notification-message {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.5;
}

.notification-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  min-width: 70px;
}

.detail-value {
  font-family: 'Courier New', monospace;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 6px;
  word-break: break-all;
  font-size: 12px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 自定义动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-container {
    padding: 16px;
  }

  .app-header h1 {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .card {
    padding: 16px;
  }

  .form-card {
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-group input {
    padding: 16px 14px;
    font-size: 16px;
  }

  .submit-button {
    padding: 18px 20px;
    font-size: 18px;
    margin-top: 20px;
  }

  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .notification {
    padding: 16px;
  }

  .result-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .result-value {
    width: 100%;
    word-break: break-all;
  }
}

/* 触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .submit-button {
    padding: 20px 24px;
    font-size: 18px;
  }

  .export-button {
    padding: 18px 20px;
    font-size: 17px;
  }

  .form-group input {
    padding: 18px 16px;
  }

  .card:active {
    transform: translateY(0);
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-container {
    background-color: #1a1a2e;
  }

  .app-header h1 {
    color: #e0e0e0;
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .card {
    background-color: #16213e;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .form-group label {
    color: #b0b0b0;
  }

  .form-group input {
    background-color: #0f3460;
    border-color: #16213e;
    color: #e0e0e0;
  }

  .form-group input:focus {
    border-color: #667eea;
    background-color: #1a1a2e;
  }

  .form-group input:hover:not(:focus) {
    border-color: #2a4365;
  }

  .form-group input::placeholder {
    color: #4a5568;
  }

  .result-card {
    background-color: #16213e;
    border-left-color: #667eea;
  }

  .result-title {
    color: #e0e0e0;
  }

  .result-item {
    background-color: #0f3460;
  }

  .result-item:hover {
    background-color: #1a1a2e;
  }

  .result-label {
    color: #b0b0b0;
  }

  .result-value {
    color: #e0e0e0;
  }

  .form-title {
    color: #e0e0e0;
  }
}
</style>