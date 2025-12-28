<template>
  <div class="app-container">
    <h1>治疗记录数据录入</h1>
    
    <!-- 日期选择器 -->
    <div class="form-group">
      <label for="date">日期</label>
      <input type="date" id="date" v-model="selectedDate" required>
    </div>
    
    <!-- Excel保存路径选择 -->
    <div class="form-group">
      <label for="excelPath">Excel保存路径</label>
      <div class="path-input-container">
        <input type="text" id="excelPath" v-model="excelPath" readonly placeholder="请选择保存路径" required>
        <button type="button" @click="selectFolder" class="select-button">选择文件夹</button>
      </div>
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
    
    <!-- 错误信息显示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      selectedDate: this.getTodayDate(),
      excelPath: '',
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
      error: ''
    };
  },
  methods: {
    getTodayDate() {
      const today = new Date();
      return today.toISOString().split('T')[0];
    },
    
    // 选择文件夹函数
    selectFolder() {
      // 创建一个隐藏的input元素用于文件夹选择
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true; // 启用文件夹选择
      input.multiple = false;
      
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          // 尝试获取文件夹路径
          if (file.path) {
            // 获取选择的文件夹路径
            this.excelPath = file.path.replace(/\\[^\\]+$/, '');
          } else if (file.webkitRelativePath) {
            // 对于没有path属性的浏览器，使用webkitRelativePath
            // 这是一个相对路径，我们需要获取文件夹部分
            const relativePath = file.webkitRelativePath;
            const folderPath = relativePath.substring(0, relativePath.indexOf('/'));
            // 在浏览器环境中，我们不能直接获取完整路径
            // 这里我们只能存储文件夹名称，实际的文件保存将由后端处理
            this.excelPath = folderPath;
          } else {
            // 如果都不行，提示用户
            alert('无法获取文件夹路径，请手动输入');
          }
        }
      });
      
      input.click();
    },
    
    async submitForm() {
      try {
        this.isSubmitting = true;
        this.error = '';
        
        // 验证血压格式
        const bloodPressureRegex = /^\d{2,3}\/\d{2,3}$/;
        if (!bloodPressureRegex.test(this.formData.bloodPressure)) {
          this.error = '血压格式不正确，请输入如 120/80 的格式';
          return;
        }
        
        // 发送请求到后端
        const response = await axios.post('/api/submit-data', {
          ...this.formData,
          date: this.selectedDate,
          excelPath: this.excelPath
        });
        
        if (response.data.success) {
          this.showResult = true;
        } else {
          this.error = response.data.message || '提交失败，请重试';
        }
      } catch (error) {
        console.error('提交数据时出错:', error);
        this.error = '提交失败，请检查网络连接或联系管理员';
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
  margin: 20px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

/* 标题样式 */
h1 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

/* 表单样式 */
.data-form {
  margin-top: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.path-input-container {
  display: flex;
  gap: 10px;
}

.path-input-container input {
  flex: 1;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* 选择按钮样式 */
.select-button {
  padding: 10px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
  white-space: nowrap;
}

.select-button:hover {
  background-color: #218838;
}

/* 提交按钮样式 */
.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 20px;
}

.submit-button:hover {
  background-color: #0069d9;
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* 结果显示区域样式 */
.result-area {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.result-area h2 {
  color: #155724;
  margin-top: 0;
}

.total-flow {
  font-weight: bold;
  color: #007bff;
  font-size: 18px;
  margin-top: 15px;
}

/* 错误信息样式 */
.error-message {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
</style>