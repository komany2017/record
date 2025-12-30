<template>
  <div class="app-container">
    <h1>治疗记录数据录入</h1>
    
    <!-- 日期选择器 -->
    <div class="form-group">
      <label for="date">日期</label>
      <input type="date" id="date" v-model="selectedDate" required>
    </div>
    
    <!-- 数据输入表单 -->
    <form @submit.prevent="submitForm" class="data-form">
      <div class="form-row">
        <div class="form-group">
          <label for="bloodPressure">血压：</label>
          <input type="text" id="bloodPressure" v-model="formData.bloodPressure" placeholder="例如: 120/80" required>
        </div>
        
        <div class="form-group">
          <label for="weight">体重：</label>
          <input type="number" id="weight" v-model.number="formData.weight" step="0.1" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="zeroCircleFlow">0周期超滤量：</label>
          <input type="number" id="zeroCircleFlow" v-model.number="formData.zeroCircleFlow" required>
        </div>
        
        <div class="form-group">
          <label for="machineTotalFlow">机器总超滤量：</label>
          <input type="number" id="machineTotalFlow" v-model.number="formData.machineTotalFlow" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="dayManualInjection">日间手工注入量：</label>
          <input type="number" id="dayManualInjection" v-model.number="formData.dayManualInjection" placeholder="默认2000">
        </div>
        
        <div class="form-group">
          <label for="dayInjectionConcentration">日间注入浓度：</label>
          <input type="text" id="dayInjectionConcentration" v-model="formData.dayInjectionConcentration" placeholder="默认艾烤糊精">
        </div>
        
        <div class="form-group">
          <label for="dayUltrafiltration">日间超滤量：</label>
          <input type="number" id="dayUltrafiltration" v-model.number="formData.dayUltrafiltration" placeholder="默认0">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="waterIntake">饮水量：</label>
          <input type="number" id="waterIntake" v-model.number="formData.waterIntake" required>
        </div>
      </div>
      
      <button type="submit" class="submit-button" :disabled="isSubmitting">
        {{ isSubmitting ? '提交中...' : '提交数据' }}
      </button>
    </form>
    
    <!-- 结果显示区域 -->
    <div v-if="showResult" class="result-area">
      <h2>提交结果</h2>
      <p>日期：{{ selectedDate }}</p>
       <p v-for="(value, key) in formData" :key="key">
         {{ key === 'bloodPressure' ? '血压' : 
            key === 'weight' ? '体重' : 
            key === 'zeroCircleFlow' ? '0周期超滤量' : 
            key === 'machineTotalFlow' ? '机器总超滤量' : 
            key === 'dayManualInjection' ? '日间手工注入量' : 
            key === 'dayInjectionConcentration' ? '日间注入浓度' : 
            key === 'dayUltrafiltration' ? '日间超滤量' : '饮水量' }}: 
         {{ value }}
       </p>
    </div>
    
    <!-- 成功消息显示 -->
    <div v-if="successMessage" class="success-message">
      <div class="success-icon">✓</div>
      <div class="success-content">
        <div class="success-title">保存成功</div>
        <div class="success-details">
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
    
    <!-- 错误信息显示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { fillExcelData } from './utils/fillExcelData.js';

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
        this.isSubmitting = true;
        this.error = '';
        this.successMessage = '';
        
        // 验证血压格式
        const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;
        if (!bloodPressureRegex.test(this.formData.bloodPressure)) {
          this.error = '血压格式不正确，请输入如 120/80 的格式';
          return;
        }
        
        // 准备数据
        const data = {
          ...this.formData,
          date: this.selectedDate
        };
        
        // 直接调用前端fillExcelData函数生成Excel文件
        const result = await fillExcelData(data);
        
        // 显示成功消息
        this.showResult = true;
        this.successMessage = result.message;
        this.saveFileName = result.fileName || '';
        this.savePath = result.savePath || '';
        
      } catch (error) {
        console.error('提交数据时出错:', error);
        this.error = '提交失败，请重试';
      } finally {
        this.isSubmitting = false;
      }
    }
  }
};
</script>

<style>
/* 容器样式 */
.app-container {
  max-width: 800px;
  margin: 0;
  padding: 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 标题样式 */
h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 600;
}

/* 表单样式 */
.data-form {
  margin-top: 20px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #34495e;
  font-size: 14px;
}

.form-group input {
  padding: 14px 12px;
  border: 2px solid #e0e6ed;
  border-radius: 12px;
  font-size: 16px;
  background-color: #ffffff;
  transition: all 0.3s ease;
  -webkit-appearance: none;
  appearance: none;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-group input::placeholder {
  color: #95a5a6;
}

/* 提交按钮样式 */
.submit-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  width: 100%;
  margin-top: 24px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.submit-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 结果显示区域 */
.result-area {
  margin-top: 30px;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  border-left: 4px solid #667eea;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.result-area h2 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 18px;
}

/* 成功消息样式 */
.success-message {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.success-icon {
  font-size: 32px;
  font-weight: bold;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.2);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-content {
  flex: 1;
}

.success-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
}

.success-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-label {
  font-weight: 600;
  min-width: 80px;
  color: rgba(255, 255, 255, 0.9);
}

.detail-value {
  font-family: 'Courier New', monospace;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 8px;
  word-break: break-all;
  font-size: 13px;
}

/* 错误消息样式 */
.error-message {
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  border-radius: 12px;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-container {
    padding: 12px;
  }

  h1 {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
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

  .success-message {
    padding: 16px;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .detail-item {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }

  .detail-label {
    min-width: auto;
  }
}

/* 触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .submit-button {
    padding: 18px 20px;
    font-size: 18px;
  }

  .form-group input {
    padding: 16px 14px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-container {
    background-color: #1a1a2e;
  }

  h1 {
    color: #e0e0e0;
  }

  .form-group label {
    color: #b0b0b0;
  }

  .form-group input {
    background-color: #16213e;
    border-color: #0f3460;
    color: #e0e0e0;
  }

  .form-group input:focus {
    border-color: #667eea;
  }

  .result-area {
    background-color: #16213e;
    border-left-color: #667eea;
  }

  .result-area h2 {
    color: #e0e0e0;
  }
}
</style>