<template>
  <div class="water-intake-view">
    <!-- 日期选择 -->
    <div class="card">
      <h2 class="card-title">喝水记录</h2>
      <div class="form-group">
        <label for="wi-date">选择日期</label>
        <input type="date" id="wi-date" v-model="selectedDate" @change="loadRecords">
      </div>
    </div>

    <!-- 手动输入 -->
    <div class="card">
      <h2 class="card-title">{{ editingTimestamp ? '修改记录' : '记录喝水' }}</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="wi-time">喝水时间</label>
          <input type="time" id="wi-time" v-model="form.time">
        </div>
        <div class="form-group">
          <label for="wi-amount">饮水量 (ml)</label>
          <input type="number" id="wi-amount" v-model.number="form.amount" min="1" placeholder="如 200">
        </div>
      </div>
      <div class="form-group">
        <label for="wi-type">饮水类型</label>
        <select id="wi-type" v-model="form.type">
          <option v-for="t in waterTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="primary-button" :disabled="isSaving" @click="submitForm">
          <span class="button-icon">{{ isSaving ? '⏳' : (editingTimestamp ? '✏️' : '💾') }}</span>
          <span>{{ isSaving ? '保存中...' : (editingTimestamp ? '更新' : '记录') }}</span>
        </button>
        <button v-if="editingTimestamp" type="button" class="cancel-button" :disabled="isSaving" @click="cancelEdit">
          <span>取消</span>
        </button>
      </div>

      <transition name="fade">
        <div v-if="message" class="status-bar" :class="'status-' + message.type">
          <span class="status-icon">{{ statusIcon(message.type) }}</span>
          <span>{{ message.text }}</span>
        </div>
      </transition>
    </div>

    <!-- 当日统计 -->
    <div class="card" v-if="records.length">
      <h2 class="card-title">当日统计</h2>
      <div class="stat-total">
        <span class="stat-label">总饮水量</span>
        <span class="stat-value">{{ totalAmount }} <span class="unit">ml</span></span>
      </div>
      <div class="type-breakdown">
        <div class="type-row" v-for="s in typeStats" :key="s.type">
          <span class="type-name">{{ s.type }}</span>
          <div class="bar">
            <div class="bar-fill" :style="{ width: s.percent + '%' }"></div>
          </div>
          <span class="type-meta">{{ s.amount }}ml · {{ s.percent }}%</span>
        </div>
      </div>
    </div>

    <!-- 当日记录表 -->
    <div class="card">
      <div class="list-header">
        <h2 class="card-title">当日记录（{{ records.length }} 条）</h2>
      </div>
      <div v-if="!records.length" class="empty-state">当日暂无记录</div>
      <div v-else class="table-wrapper">
        <table class="record-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>饮水量(ml)</th>
              <th>饮水类型</th>
              <th>记录时间戳</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in sortedRecords" :key="idx">
              <td>{{ r.time }}</td>
              <td>{{ r.amount }}</td>
              <td>{{ r.type }}</td>
              <td class="muted">{{ formatStamp(r.timestamp) }}</td>
              <td class="action-cell">
                <button type="button" class="action-btn edit-btn" :disabled="isSaving" @click="editRecord(r)">编辑</button>
                <button type="button" class="action-btn delete-btn" :disabled="isSaving" @click="deleteRecord(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const HEADERS = ['日期', '时间', '饮水量(ml)', '饮水类型', '记录时间戳'];

export default {
  name: 'WaterIntakeView',
  data() {
    return {
      selectedDate: this.getTodayDate(),
      form: {
        time: this.nowTime(),
        amount: '',
        type: '白开水'
      },
      waterTypes: ['白开水', '矿泉水', '茶', '果汁', '牛奶', '其他'],
      records: [],
      message: null,
      isSaving: false,
      editingTimestamp: null
    };
  },
  computed: {
    totalAmount() {
      return this.records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    },
    typeStats() {
      const map = {};
      this.records.forEach(r => {
        const t = r.type || '其他';
        if (!map[t]) map[t] = { type: t, amount: 0, count: 0 };
        map[t].amount += Number(r.amount) || 0;
        map[t].count += 1;
      });
      const total = this.totalAmount || 1;
      return Object.values(map)
        .map(s => ({ ...s, percent: Math.round((s.amount / total) * 100) }))
        .sort((a, b) => b.amount - a.amount);
    },
    sortedRecords() {
      return [...this.records].sort((a, b) => String(a.time).localeCompare(String(b.time)));
    }
  },
  mounted() {
    this.loadRecords();
  },
  watch: {
    selectedDate() {
      // 切换日期时退出编辑模式
      if (this.editingTimestamp) {
        this.cancelEdit();
      }
    }
  },
  methods: {
    getTodayDate() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },
    nowTime() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getHours())}:${p(d.getMinutes())}`;
    },
    fileNameFor(date) {
      return `${String(date).replace(/-/g, '')}_喝水记录.xlsx`;
    },
    async loadRecords() {
      this.records = [];
      this.message = null;
      try {
        const rows = await this.readExcelRows(this.selectedDate);
        if (rows.length > 1) {
          this.records = rows.slice(1)
            .filter(r => r && r.length >= 4 && r[0] !== '')
            .map(r => ({
              date: r[0],
              time: r[1],
              amount: Number(r[2]),
              type: r[3],
              timestamp: r[4] || ''
            }));
        }
      } catch (e) {
        console.error(`[${new Date().toISOString()}] 加载喝水记录失败: ${e.message}`);
        this.records = [];
      }
    },
    async readExcelRows(date) {
      const isMobile = Capacitor.isNativePlatform();
      if (!isMobile) return [];
      const fileName = this.fileNameFor(date);
      let fileContent;
      try {
        fileContent = await Filesystem.readFile({ path: fileName, directory: Directory.Documents });
      } catch (e) {
        return [];
      }
      const wb = XLSX.read(atob(fileContent.data), { type: 'binary' });
      const ws = wb.Sheets['Sheet1'];
      if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    },
    async submitForm() {
      this.message = null;
      const amount = Number(this.form.amount);
      // 数据验证
      if (!this.form.time) {
        this.message = { type: 'error', text: '请选择喝水时间' };
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        this.message = { type: 'error', text: '饮水量必须为大于0的数字' };
        return;
      }
      // 重复记录检测（编辑时排除自身）
      const dup = this.records.find(r =>
        r.time === this.form.time &&
        Number(r.amount) === amount &&
        r.type === this.form.type &&
        r.timestamp !== this.editingTimestamp
      );
      if (dup) {
        this.message = { type: 'error', text: '该记录已存在（相同时间/饮水量/类型），请勿重复提交' };
        return;
      }

      this.isSaving = true;
      try {
        let rows = await this.readExcelRows(this.selectedDate);
        if (!rows.length || !rows[0] || !rows[0][0]) rows = [HEADERS];
        // 确保表头行正确
        if (!rows[0] || rows[0].length < HEADERS.length || rows[0][0] !== HEADERS[0]) {
          rows[0] = HEADERS;
        }

        if (this.editingTimestamp) {
          // 更新模式：查找匹配 timestamp 的行并替换
          let updated = false;
          for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][4] || '') === String(this.editingTimestamp)) {
              rows[i] = [this.selectedDate, this.form.time, amount, this.form.type, this.editingTimestamp];
              updated = true;
              break;
            }
          }
          if (!updated) {
            this.message = { type: 'error', text: '未找到要修改的记录，可能已被删除' };
            this.isSaving = false;
            return;
          }
          await this.writeRows(this.selectedDate, rows);
          this.message = { type: 'success', text: `已更新为 ${amount}ml ${this.form.type}` };
          this.cancelEdit();
        } else {
          // 新增模式
          const timestamp = new Date().toISOString();
          const newRow = [this.selectedDate, this.form.time, amount, this.form.type, timestamp];
          rows.push(newRow);
          await this.writeRows(this.selectedDate, rows);
          this.message = { type: 'success', text: `已记录 ${amount}ml ${this.form.type}` };
          this.form.amount = '';
          this.form.time = this.nowTime();
        }
        await this.loadRecords();
      } catch (e) {
        console.error(`[${new Date().toISOString()}] 保存喝水记录失败: ${e.message}`);
        this.message = { type: 'error', text: `保存失败：${e.message}` };
      } finally {
        this.isSaving = false;
      }
    },
    editRecord(record) {
      // 进入编辑模式，填充表单
      this.editingTimestamp = record.timestamp;
      this.form.time = record.time;
      this.form.amount = record.amount;
      this.form.type = record.type;
      this.message = null;
      // 滚动到表单区域
      this.$el.querySelector('.card-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    cancelEdit() {
      // 退出编辑模式，重置表单
      this.editingTimestamp = null;
      this.form.amount = '';
      this.form.time = this.nowTime();
      this.form.type = '白开水';
      this.message = null;
    },
    async deleteRecord(record) {
      // 确认删除
      if (!confirm(`确定删除 ${record.time} 的 ${record.amount}ml ${record.type} 记录？`)) {
        return;
      }
      this.isSaving = true;
      this.message = null;
      try {
        let rows = await this.readExcelRows(this.selectedDate);
        if (!rows.length) rows = [HEADERS];
        // 过滤掉匹配 timestamp 的数据行（保留表头行）
        const filtered = [rows[0]];
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][4] || '') !== String(record.timestamp)) {
            filtered.push(rows[i]);
          }
        }
        await this.writeRows(this.selectedDate, filtered);

        // 如果正在编辑被删除的记录，取消编辑
        if (this.editingTimestamp === record.timestamp) {
          this.cancelEdit();
        }
        await this.loadRecords();
        this.message = { type: 'success', text: `已删除 ${record.time} 的记录` };
      } catch (e) {
        console.error(`[${new Date().toISOString()}] 删除喝水记录失败: ${e.message}`);
        this.message = { type: 'error', text: `删除失败：${e.message}` };
      } finally {
        this.isSaving = false;
      }
    },
    async writeRows(date, rows) {
      const fileName = this.fileNameFor(date);
      const isMobile = Capacitor.isNativePlatform();

      // 重建工作簿，确保 SheetNames 与 Sheets 同步，避免 write 失败
      const workbook = XLSX.utils.book_new();
      const newWs = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, newWs, 'Sheet1');

      if (isMobile) {
        const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        await Filesystem.writeFile({
          path: fileName,
          data: this.arrayBufferToBase64(buf),
          directory: Directory.Documents,
          recursive: true
        });
      } else {
        XLSX.writeFile(workbook, fileName);
      }
    },
    arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    formatStamp(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    },
    statusIcon(type) {
      return { success: '✓', error: '✗', warn: '⚠', info: '⏳' }[type] || '';
    }
  }
};
</script>

<style scoped>
.water-intake-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.card-title {
  margin: 0 0 14px;
  font-size: 19px;
  color: #2c3e50;
  font-weight: 700;
}

.form-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
  min-width: 140px;
}
.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
}
.form-group input,
.form-group select {
  padding: 12px 14px;
  border: 2px solid #e0e6ed;
  border-radius: 12px;
  font-size: 15px;
  color: #2c3e50;
  background: #fff;
  transition: border-color 0.2s ease;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #2980b9;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #2980b9, #1f6fa0);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 11px 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.primary-button:hover:not(:disabled) { transform: translateY(-1px); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; }

.form-actions {
  display: flex;
  gap: 10px;
}

.cancel-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecf0f1;
  color: #34495e;
  border: 1.5px solid #bdc3c7;
  border-radius: 12px;
  padding: 11px 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.cancel-button:hover:not(:disabled) { transform: translateY(-1px); border-color: #95a5a6; }
.cancel-button:disabled { opacity: 0.5; cursor: not-allowed; }

.action-cell {
  white-space: nowrap;
  display: flex;
  gap: 6px;
}
.action-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.action-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.edit-btn {
  background: #eaf2f8;
  color: #2980b9;
}
.delete-btn {
  background: #fdecea;
  color: #e74c3c;
}

.status-bar {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-icon { font-weight: 700; }
.status-success { background: #e8f6ef; color: #27ae60; }
.status-error   { background: #fdecea; color: #e74c3c; }
.status-warn    { background: #fff8e1; color: #f39c12; }
.status-info    { background: #eaf2f8; color: #2980b9; }

.stat-total {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #eaf2f8, #f4f9fc);
  border-radius: 12px;
  margin-bottom: 16px;
}
.stat-label { font-size: 14px; color: #34495e; font-weight: 600; }
.stat-value { font-size: 26px; color: #2980b9; font-weight: 700; }
.unit { font-size: 14px; color: #2980b9; }

.type-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 10px;
}
.type-name { font-size: 13px; color: #34495e; font-weight: 600; }
.bar {
  height: 10px;
  background: #ecf0f1;
  border-radius: 6px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2980b9, #1f6fa0);
  border-radius: 6px;
  transition: width 0.4s ease;
}
.type-meta { font-size: 12px; color: #7f8c8d; white-space: nowrap; }

.list-header { margin-bottom: 12px; }
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.record-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 520px;
}
.record-table th,
.record-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
  white-space: nowrap;
}
.record-table th {
  background: #f5f7fa;
  color: #34495e;
  font-weight: 600;
}
.muted { color: #95a5a6; font-size: 12px; }

.empty-state {
  text-align: center;
  color: #95a5a6;
  padding: 20px;
  font-size: 14px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .card { padding: 16px; }
  .form-row { flex-direction: column; }
  .type-row { grid-template-columns: 60px 1fr; }
  .type-meta { grid-column: 2; }
}
</style>
