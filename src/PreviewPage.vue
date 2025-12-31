<template>
  <div class="preview-page">
    <h1>最近28天治疗记录预览</h1>
    
    <div class="preview-container">
      <div v-if="previewError" class="error-message">
        {{ previewError }}
      </div>
      
      <div v-else-if="treatmentRecords.length > 0" class="excel-preview">
        <div class="date-range-info">
          数据范围：{{ dateRange.startDate }} 至 {{ dateRange.endDate }}
        </div>
        
        <!-- 体重变化曲线图表 -->
        <div v-if="chartData && chartOptions && treatmentRecords.length > 0" class="chart-container">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>星期</th>
                <th>血压</th>
                <th>体重</th>
                <th>0周期超滤量</th>
                <th>机器总超滤量</th>
                <th>日间手工注入量</th>
                <th>日间注入浓度</th>
                <th>日间超滤量</th>
                <th>机器+手工总量</th>
                <th>饮水量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in paginatedRecords" :key="index">
                <td>{{ record.date }}</td>
                <td>{{ record.weekday }}</td>
                <td>{{ record.bloodPressure }}</td>
                <td>{{ record.weight }}</td>
                <td>{{ record.zeroCircleFlow }}</td>
                <td>{{ record.machineTotalFlow }}</td>
                <td>{{ record.dayManualInjection }}</td>
                <td>{{ record.dayInjectionConcentration }}</td>
                <td>{{ record.dayUltrafiltration }}</td>
                <td>{{ record.machinePlusManualFlow }}</td>
                <td>{{ record.waterIntake }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 分页控件 -->
        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">上一页</button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="page-btn">下一页</button>
          <div class="page-size-selector">
            <label for="pageSize">每页显示:</label>
            <select id="pageSize" v-model.number="pageSize" @change="currentPage = 1">
              <option value="5">5条</option>
              <option value="10">10条</option>
              <option value="20">20条</option>
              <option value="50">50条</option>
            </select>
          </div>
        </div>
      </div>
      
      <div v-else-if="isLoading" class="loading-message">
        加载中...
      </div>
      
      <div v-else class="empty-message">
        最近28天内没有治疗记录数据
      </div>
    </div>
  </div>
</template>

<script>
import { getTreatmentRecordsByDateRange } from './utils/database.js';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler
);

export default {
  name: 'PreviewPage',
  components: {
    Line
  },
  data() {
    return {
      previewError: '',
      treatmentRecords: [],
      dateRange: {},
      isLoading: true,
      
      // 分页相关
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      
      // 图表相关
      chartData: null,
      chartOptions: null
    };
  },
  computed: {
    paginatedRecords() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return this.treatmentRecords.slice(startIndex, endIndex);
    }
  },
  mounted() {
    // 自动加载最近28天的数据
    this.load28DaysRecords();
  },
  methods: {
    async load28DaysRecords() {
      try {
        this.isLoading = true;
        this.previewError = '';
        
        // 计算日期范围：昨天到28天前
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const endDate = yesterday.toISOString().split('T')[0];
        const startDate = new Date(yesterday);
        startDate.setDate(startDate.getDate() - 27); // 28天前
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        this.dateRange = {
          startDate: formattedStartDate,
          endDate: endDate
        };
        
        // 从数据库获取数据
        const recordsResult = await getTreatmentRecordsByDateRange(formattedStartDate, endDate);
        if (recordsResult.success) {
          this.treatmentRecords = recordsResult.data;
          this.calculateTotalPages();
          this.prepareChartData();
        } else {
          this.previewError = recordsResult.message || '加载治疗记录失败';
        }
      } catch (error) {
        console.error('加载治疗记录时出错:', error);
        this.previewError = '加载治疗记录时发生错误，请稍后重试';
      } finally {
        this.isLoading = false;
      }
    },
    
    calculateTotalPages() {
      this.totalPages = Math.ceil(this.treatmentRecords.length / this.pageSize);
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages || 1;
      }
    },
    
    prepareChartData() {
      // 按日期排序记录
      const sortedRecords = [...this.treatmentRecords].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      // 准备图表数据
      const labels = sortedRecords.map(record => {
        return `${record.date} (${record.weekday})`;
      });
      
      const weights = sortedRecords.map(record => {
        return parseFloat(record.weight) || null;
      });
      
      // 配置图表数据
      this.chartData = {
        labels: labels,
        datasets: [
          {
            label: '体重 (kg)',
            data: weights,
            fill: false,
            borderColor: '#4a6fa5',
            tension: 0.1,
            pointBackgroundColor: '#4a6fa5',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      };
      
      // 配置图表选项
      this.chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: '最近28天体重变化曲线',
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y + ' kg';
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: '体重 (kg)'
            }
          },
          x: {
            title: {
              display: true,
              text: '日期'
            },
            ticks: {
              maxRotation: 90,
              minRotation: 65
            }
          }
        }
      };
    },
    
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
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
  margin-bottom: 20px;
}

.excel-preview table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ddd;
}

.excel-preview th {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
  background-color: #4a6fa5;
  color: white;
  font-weight: bold;
  min-width: 100px;
}

.excel-preview td {
  padding: 10px 12px;
  border: 1px solid #ddd;
  text-align: left;
  background-color: white;
  min-width: 100px;
}

.excel-preview tr:nth-child(even) td {
  background-color: #f2f5f9;
}

.excel-preview tr:hover td {
  background-color: #e8f0fe;
}

.error-message {
  color: red;
  background-color: #ffe6e6;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-weight: 500;
}

.loading-message {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.empty-message {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
  background-color: white;
  border-radius: 4px;
  border: 1px dashed #ddd;
}

.date-range-info {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #e8f4f8;
  border-radius: 4px;
  color: #333;
  font-weight: 500;
}

/* 图表容器样式 */
.chart-container {
  margin-bottom: 30px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  border: 1px solid #ddd;
  height: 400px;
  width: 100%;
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 20px 0;
  border-top: 1px solid #ddd;
}

.page-btn {
  padding: 8px 16px;
  background-color: #4a6fa5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.page-btn:hover:not(:disabled) {
  background-color: #3a5d8a;
}

.page-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.page-info {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-selector label {
  font-weight: 500;
  color: #333;
}

.page-size-selector select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style>