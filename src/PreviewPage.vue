<template>
  <div class="preview-page">
    <h1>治疗记录Excel预览</h1>
    
    <div class="preview-container">
      <div v-if="previewError" class="error-message">
        {{ previewError }}
      </div>
      
      <div v-if="previewData" class="excel-preview">
        <h2>{{ previewData.fileName }}</h2>
        
        <div class="table-container">
          <table>
            <tbody>
              <tr v-for="(row, rowIndex) in previewData.rows" :key="rowIndex">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="table-cell">
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'PreviewPage',
  data() {
    return {
      previewError: '',
      previewData: null
    };
  },
  mounted() {
    // 自动加载当前月份的Excel文件
    this.loadCurrentMonthPreview();
  },
  methods: {
    async loadCurrentMonthPreview() {
      // 获取当前月份（YYYYMM格式）
      const now = new Date();
      const yearMonth = now.getFullYear().toString() + 
                       String(now.getMonth() + 1).padStart(2, '0');
      
      try {
        // 发送请求获取Excel预览数据
        const response = await axios.get('http://localhost:3000/api/excel-preview', {
          params: { yearMonth }
        });
        
        if (response.data.success) {
          this.previewData = response.data.data;
        } else {
          this.previewError = response.data.message || '加载Excel预览失败';
        }
      } catch (error) {
        console.error('加载Excel预览时出错:', error);
        this.previewError = '加载Excel预览时发生错误，请稍后重试';
      }
    }
  }
};
</script>

<style scoped>
.preview-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.preview-container {
  margin-top: 40px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.table-container {
  overflow-x: auto;
  max-width: 100%;
}

.excel-preview table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ddd;
}

.table-cell {
  padding: 8px 12px;
  border: 1px solid #ddd;
  text-align: left;
  min-width: 100px;
}

.table-cell:first-child {
  font-weight: bold;
  background-color: #f2f2f2;
  min-width: 120px;
}

.error-message {
  color: red;
  background-color: #ffe6e6;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}
</style>