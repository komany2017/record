<template>
  <div class="app-container">
    <header class="app-header">
      <h1>{{ currentView === 'treatment' ? '治疗记录数据录入' : '喝水记录管理' }}</h1>
      <nav class="nav-tabs">
        <button type="button" class="nav-tab" :class="{ active: currentView === 'treatment' }" @click="currentView = 'treatment'">治疗记录</button>
        <button type="button" class="nav-tab" :class="{ active: currentView === 'water' }" @click="currentView = 'water'">喝水记录</button>
      </nav>
    </header>

    <main class="app-main">
      <template v-if="currentView === 'treatment'">
      <!-- 日期选择卡片 -->
      <div class="card date-card">
        <div class="form-group">
          <label for="date">记录日期</label>
          <input type="date" id="date" v-model="selectedDate" required>
        </div>
      </div>

      <!-- 导出/导入按钮卡片 -->
      <div class="card export-card">
        <div class="button-group">
          <button type="button" class="export-button" @click="export28DaysData" :disabled="isExporting || isImporting">
            <span class="button-icon">📊</span>
            <span class="button-text">{{ isExporting ? '导出中...' : '导出最近28天数据' }}</span>
          </button>
          <button type="button" class="import-button" @click="triggerFileInput" :disabled="isExporting || isImporting">
            <span class="button-icon">📥</span>
            <span class="button-text">{{ isImporting ? '导入中...' : '导入治疗记录' }}</span>
          </button>
          <button type="button" class="import-all-button" @click="importAllHistory" :disabled="isExporting || isImporting">
            <span class="button-icon">📚</span>
            <span class="button-text">{{ isImporting ? '导入中...' : '导入全部历史数据' }}</span>
          </button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" multiple style="display:none" @change="handleFileImport">
        </div>
      </div>

      <!-- 数据输入表单卡片 -->
      <form @submit.prevent="submitForm" class="card form-card">
        <h2 class="form-title">治疗数据</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="bloodPressure">血压/心率</label>
            <input type="text" id="bloodPressure" v-model="formData.bloodPressure" placeholder="选填，例如: 120/80/75">
          </div>

          <div class="form-group">
            <label for="weight">体重 (kg)</label>
            <input type="number" id="weight" v-model.number="formData.weight" step="0.01" placeholder="选填">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="zeroCircleFlow">0周期超滤量</label>
            <input type="number" id="zeroCircleFlow" v-model.number="formData.zeroCircleFlow" placeholder="选填">
          </div>
          
          <div class="form-group">
            <label for="machineTotalFlow">机器总超滤量</label>
            <input type="number" id="machineTotalFlow" v-model.number="formData.machineTotalFlow" placeholder="选填">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="dayManualInjection">日间手工注入量</label>
            <input type="number" id="dayManualInjection" v-model.number="formData.dayManualInjection" placeholder="选填">
          </div>
          
          <div class="form-group">
            <label for="dayInjectionConcentration">日间注入浓度</label>
            <input type="text" id="dayInjectionConcentration" v-model="formData.dayInjectionConcentration" placeholder="选填">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="dayUltrafiltration">日间超滤量</label>
            <input type="number" id="dayUltrafiltration" v-model.number="formData.dayUltrafiltration" placeholder="选填">
          </div>
          
          <div class="form-group">
            <label for="waterIntake">饮水量</label>
            <input type="number" id="waterIntake" v-model.number="formData.waterIntake" placeholder="选填">
            <div class="hint-text" v-if="dailyWaterIntake > 0">当日累计: {{ dailyWaterIntake }} ml</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="dialysateColor">腹透液颜色</label>
            <select id="dialysateColor" v-model="formData.dialysateColor">
              <option value="">（不填）</option>
              <option value="清亮">清亮</option>
              <option value="浑浊">浑浊</option>
              <option value="血性">血性</option>
            </select>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-button" :disabled="isSubmitting">
            <span class="button-icon">{{ isSubmitting ? '⏳' : '💾' }}</span>
            <span class="button-text">{{ isSubmitting ? '提交中...' : '提交数据' }}</span>
          </button>
        </div>
      </form>
      </template>
      <WaterIntakeView v-else />
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
import { fillExcelData, getWaterIntakeByDate } from './utils/fillExcelData.js';
import { saveTreatmentRecord, getTreatmentRecordsByDateRange } from './utils/database.js';
import { initSQLite, saveTreatmentRecordToSQLite } from './utils/sqliteDb.js';
import { importTreatmentRecordsFromExcel, exportMultipleRecordsToExcel } from './utils/exportExcel.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import WaterIntakeView from './components/WaterIntakeView.vue';

export default {
  name: 'App',
  components: { WaterIntakeView },
  data() {
    return {
      currentView: 'treatment',
      selectedDate: this.getTodayDate(),
      formData: {
        bloodPressure: '',
        weight: '',
        zeroCircleFlow: '',
        machineTotalFlow: '',
        dayManualInjection: '',
        dayInjectionConcentration: '',
        dayUltrafiltration: '',
        waterIntake: '',
        dialysateColor: ''
      },
      isSubmitting: false,
      isExporting: false,
      isImporting: false,
      successMessage: '',
      saveFileName: '',
      savePath: '',
      error: '',
      successTimer: null,
      dailyWaterIntake: 0
    };
  },
  watch: {
    successMessage(val) {
      // 成功提示显示 10 秒后自动关闭
      if (this.successTimer) {
        clearTimeout(this.successTimer);
      }
      if (val) {
        this.successTimer = setTimeout(() => {
          this.successMessage = '';
          this.saveFileName = '';
          this.savePath = '';
          this.successTimer = null;
        }, 10000);
      }
    },
    selectedDate() {
      // 切换日期时重新加载当日饮水量
      this.loadDailyWaterIntake();
    }
  },
  mounted() {
    // 初始化 SQLite 本地数据库（Android 平台，含历史数据迁移）
    initSQLite();
    // 初始化时加载当日饮水量
    this.loadDailyWaterIntake();
  },
  beforeUnmount() {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
  },
  methods: {
    async loadDailyWaterIntake() {
      try {
        this.dailyWaterIntake = await getWaterIntakeByDate(this.selectedDate);
        console.log(`[${new Date().toISOString()}] 当日饮水量: ${this.dailyWaterIntake}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 加载当日饮水量失败: ${error.message}`);
        this.dailyWaterIntake = 0;
      }
    },

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
        
        // 血压/心率为选填：有值时验证格式 120/80/75，空值则跳过
        let bloodPressure = '';
        let heartRate = '';
        const bpInput = (this.formData.bloodPressure || '').trim();
        if (bpInput) {
          const bloodPressureRegex = /^\d{2,3}\/\d{2,3}\/\d{2,3}$/;
          if (!bloodPressureRegex.test(bpInput)) {
            console.error(`[${new Date().toISOString()}] 血压/心率格式验证失败: ${bpInput}`);
            this.error = '格式不正确，请输入如 120/80/75 的格式（血压/心率），或留空';
            return;
          }
          // 解析血压/心率：格式为 收缩压/舒张压/心率
          const [systolic, diastolic, hr] = bpInput.split('/');
          bloodPressure = `${systolic}/${diastolic}`;
          heartRate = hr;
        }
        
        // 准备数据
        const dateObj = new Date(this.selectedDate);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        // 计算machinePlusManualFlow字段（三项全为空时保持为空）
        const flowValues = [this.formData.zeroCircleFlow, this.formData.machineTotalFlow, this.formData.dayUltrafiltration];
        const hasFlow = flowValues.some(v => v !== '' && v !== null && v !== undefined);
        const machinePlusManualFlow = hasFlow
          ? flowValues.reduce((sum, v) => sum + (Number(v) || 0), 0)
          : '';

        const data = {
          ...this.formData,
          bloodPressure: bloodPressure,
          heartRate: heartRate,
          weight: (this.formData.weight === '' || this.formData.weight === null || this.formData.weight === undefined)
            ? ''
            : Number(this.formData.weight).toFixed(2),
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

        // 同步写入本地 SQLite 数据库（Android 原生平台）
        await saveTreatmentRecordToSQLite(data);
        
        // 直接调用前端fillExcelData函数生成Excel文件
        const result = await fillExcelData(data);
        
        // 显示成功消息
        this.successMessage = result.message;
        this.saveFileName = result.fileName || '';
        this.savePath = result.savePath || '';
        // 刷新当日饮水量显示
        await this.loadDailyWaterIntake();
        
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
        
        // 计算日期范围：今天到28天前（含今天）
        const today = new Date();
        
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 27); // 28天前（含今天共28天）
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        console.log(`[${new Date().toISOString()}] 导出日期范围: ${formattedStartDate} 到 ${endDate}`);
        
        // 从数据库获取数据
        const recordsResult = await getTreatmentRecordsByDateRange(formattedStartDate, endDate);
        const records = recordsResult.success ? recordsResult.data : [];

        console.log(`[${new Date().toISOString()}] 从数据库获取到 ${records.length} 条记录`);

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
    },

    triggerFileInput() {
      // 触发隐藏的文件输入元素的点击
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
        this.$refs.fileInput.click();
      }
    },

    /**
     * 历史文件排序：区间导出文件（文件名含"_"）在前，月度文件（6位数字）在后
     * 使相同日期以月度文件为最终值（月度文件是应用持续写入的最新数据）
     */
    sortHistoryFiles(names) {
      return names.slice().sort((a, b) => {
        const am = /^治疗记录\d{6}\.xlsx$/.test(a) ? 1 : 0;
        const bm = /^治疗记录\d{6}\.xlsx$/.test(b) ? 1 : 0;
        return am - bm || a.localeCompare(b);
      });
    },

    /**
     * 导入记录的保存函数：同时写入 IndexedDB 和本地 SQLite
     */
    async saveImportedRecord(record) {
      const result = await saveTreatmentRecord(record);
      if (result.success) {
        await saveTreatmentRecordToSQLite(record);
      }
      return result;
    },

    /**
     * base64 字符串转 ArrayBuffer（Capacitor Filesystem 读取的内容为 base64）
     */
    base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    },

    /**
     * 解析并导入多个Excel数据源
     * @param {Array<{name: string, load: Function}>} sources - 每项含文件名与返回ArrayBuffer的加载函数
     * @returns {Promise<Object>} - 含count（唯一日期数）、fileCount、failedFiles
     * 先按日期合并（后解析的覆盖先前的），再逐条落库，避免同一日期重复写入
     */
    async importFromSources(sources) {
      const merged = new Map();
      const failedFiles = [];

      for (const source of sources) {
        try {
          const buffer = await source.load();
          // 传入空保存函数：此处只解析，落库统一在合并后执行
          const result = await importTreatmentRecordsFromExcel(buffer, async () => {});
          const records = result.records || [];
          records.forEach(r => merged.set(r.date, r));
          console.log(`[${new Date().toISOString()}] 已解析 ${source.name}，提取 ${records.length} 条`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 解析 ${source.name} 失败: ${error.message}`);
          failedFiles.push(source.name);
        }
      }

      for (const record of merged.values()) {
        await this.saveImportedRecord(record);
      }

      console.log(`[${new Date().toISOString()}] 导入落库完成，共 ${merged.size} 条唯一日期记录`);
      return { count: merged.size, fileCount: sources.length, failedFiles };
    },

    async handleFileImport(event) {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        console.log(`[${new Date().toISOString()}] 用户未选择文件`);
        return;
      }

      try {
        console.log(`[${new Date().toISOString()}] 用户选择 ${files.length} 个文件`);
        this.isImporting = true;
        this.error = '';
        this.successMessage = '';

        const ordered = this.sortHistoryFiles(files.map(f => f.name))
          .map(name => files.find(f => f.name === name));

        const result = await this.importFromSources(ordered.map(file => ({
          name: file.name,
          load: () => file.arrayBuffer()
        })));

        if (result.count === 0) {
          this.error = '未从所选文件中解析出有效记录';
        } else {
          this.successMessage = `已从 ${result.fileCount - result.failedFiles.length} 个文件导入 ${result.count} 条记录`
            + (result.failedFiles.length > 0 ? `，${result.failedFiles.length} 个文件失败` : '');
          // 刷新当日饮水量显示（导入的数据可能影响当前选中日期）
          await this.loadDailyWaterIntake();
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 导入数据失败，错误: ${error.message}`);
        console.error(error.stack);
        this.error = `导入失败: ${error.message}`;
      } finally {
        this.isImporting = false;
        // 重置文件输入，允许再次选择同一文件
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = '';
        }
        console.log(`[${new Date().toISOString()}] 导入操作完成`);
      }
    },

    /**
     * 一键导入 Documents 目录下的全部历史治疗记录文件
     * 包含月度文件（治疗记录202601.xlsx）与区间导出文件（治疗记录_2026-02-06_至_2026-03-05.xlsx）
     */
    async importAllHistory() {
      if (!Capacitor.isNativePlatform()) {
        this.error = '该功能仅在手机端可用';
        return;
      }

      try {
        this.isImporting = true;
        this.error = '';
        this.successMessage = '';

        const listing = await Filesystem.readdir({ path: '', directory: Directory.Documents });
        const names = this.sortHistoryFiles(
          listing.files
            .filter(f => f.type === 'file' && /^治疗记录.*\.xlsx$/.test(f.name))
            .map(f => f.name)
        );

        if (names.length === 0) {
          this.error = 'Documents 目录下未找到治疗记录文件';
          return;
        }

        console.log(`[${new Date().toISOString()}] 待导入文件 ${names.length} 个`);

        // 先按日期合并，再逐条落库（IndexedDB + SQLite）
        const result = await this.importFromSources(names.map(name => ({
          name,
          load: async () => {
            const fc = await Filesystem.readFile({ path: name, directory: Directory.Documents });
            return this.base64ToArrayBuffer(fc.data);
          }
        })));

        if (result.count === 0) {
          this.error = '未能从文件中解析出任何有效记录';
        } else {
          this.successMessage = `已从 ${result.fileCount - result.failedFiles.length} 个文件导入 ${result.count} 条治疗记录`
            + (result.failedFiles.length > 0 ? `，${result.failedFiles.length} 个文件失败` : '');
          await this.loadDailyWaterIntake();
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 批量导入失败，错误: ${error.message}`);
        console.error(error.stack);
        this.error = `批量导入失败: ${error.message}`;
      } finally {
        this.isImporting = false;
        console.log(`[${new Date().toISOString()}] 批量导入操作完成`);
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
  margin-bottom: 18px;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}
.nav-tab {
  border: 1.5px solid #d0d7de;
  background: #ffffff;
  color: #34495e;
  padding: 9px 22px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-tab:hover { border-color: #2980b9; color: #2980b9; }
.nav-tab.active {
  background: linear-gradient(135deg, #2980b9, #1f6fa0);
  color: #fff;
  border-color: transparent;
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

.button-group {
  display: flex;
  gap: 12px;
}

.import-button,
.import-all-button {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
  transition: all 0.3s ease;
  font-family: inherit;
}

.import-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.5);
}

.import-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3);
}

.import-button:disabled,
.import-all-button:disabled {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

/* 一键导入全部历史数据按钮（青绿色区分） */
.import-all-button {
  background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
  box-shadow: 0 4px 15px rgba(22, 160, 133, 0.4);
}

.import-all-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(22, 160, 133, 0.5);
}

.import-all-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(22, 160, 133, 0.3);
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

.hint-text {
  margin-top: 8px;
  font-size: 13px;
  color: #2980b9;
  font-weight: 500;
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
  flex: 1;
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

  .export-button,
  .import-button,
  .import-all-button {
    padding: 18px 20px;
    font-size: 17px;
  }

  .button-group {
    flex-direction: column;
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

  .form-title {
    color: #e0e0e0;
  }
}
</style>