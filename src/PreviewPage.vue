<template>
  <div class="preview-page">
    <!-- 指标切换 -->
    <div class="metric-tabs">
      <button
        v-for="m in metrics"
        :key="m.key"
        type="button"
        class="metric-chip"
        :class="{ active: metric === m.key }"
        @click="metric = m.key"
      >
        <span class="metric-dot" :style="{ backgroundColor: m.color }"></span>
        <span>{{ m.label }}</span>
      </button>
    </div>

    <!-- 时间范围 -->
    <div class="range-tabs">
      <button
        v-for="r in ranges"
        :key="r.days"
        type="button"
        class="range-chip"
        :class="{ active: rangeDays === r.days }"
        @click="rangeDays = r.days"
      >{{ r.label }}</button>
    </div>

    <!-- 趋势图 -->
    <section class="card trend-card">
      <div class="card-head">
        <h2>{{ currentMetric.label }}趋势</h2>
        <span class="card-meta">单位 {{ currentMetric.unit }}</span>
      </div>

      <div class="legend">
        <span v-for="item in legendItems" :key="item.label" class="legend-item">
          <i class="legend-line" :class="{ dashed: item.dashed }" :style="{ backgroundColor: item.color, borderColor: item.color }"></i>
          <span class="legend-label">{{ item.label }}</span>
          <span v-if="item.avg !== null && item.avg !== undefined" class="legend-value">均 {{ item.avg }}{{ currentMetric.unit }}</span>
          <span v-else-if="item.fixed !== undefined" class="legend-value">≤ {{ item.fixed }}{{ currentMetric.unit }}</span>
        </span>
      </div>

      <div v-if="loadingAll" class="state-tip">加载中...</div>
      <div v-else-if="trendPoints.length === 0" class="state-tip">该时间段暂无{{ currentMetric.label }}数据</div>
      <div v-else class="chart-wrap">
        <Line :data="trendData" :options="trendOptions" />
      </div>
    </section>

    <!-- 区间统计 -->
    <section class="card">
      <div class="card-head">
        <h2>区间统计</h2>
        <span class="card-meta">{{ rangeDays }}天</span>
      </div>

      <div class="stats-row">
        <div class="stat">
          <div class="stat-value">{{ stats.average === null ? '—' : stats.average }}</div>
          <div class="stat-label">平均</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats.max === null ? '—' : stats.max }}</div>
          <div class="stat-label">最高</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats.min === null ? '—' : stats.min }}</div>
          <div class="stat-label">最低</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats.validDays }}<span class="stat-sub">/{{ rangeDays }}</span></div>
          <div class="stat-label">有效天数</div>
        </div>
      </div>

      <div v-if="metric === 'bloodPressure'" class="goal-note">
        <span class="goal-icon">◎</span>参考目标：收缩压 ≤ 140 mmHg，舒张压 ≤ 90 mmHg
      </div>
    </section>

    <!-- 最近28天记录情况 -->
    <section class="card">
      <div class="card-head">
        <h2>最近28天记录情况</h2>
        <span class="card-meta">漏记 {{ missingDays }}天</span>
      </div>
      <div class="coverage-grid">
        <button
          v-for="day in coverageDays"
          :key="day.date"
          type="button"
          class="coverage-day"
          :class="{ recorded: day.hasRecord, selected: day.date === selectedDate }"
          @click="selectedDate = day.date"
        >
          <span class="day-num">{{ day.day }}</span>
          <span class="day-dot"></span>
        </button>
      </div>
    </section>

    <!-- 选定日期记录 -->
    <section class="card">
      <div class="card-head">
        <h2>选定日期记录</h2>
        <input type="date" id="previewDate" v-model="selectedDate" class="date-input">
      </div>

      <div v-if="dailyLoading" class="state-tip">加载中...</div>
      <div v-else-if="!dailyRecord" class="state-tip">{{ selectedDate }} 暂无治疗记录</div>
      <div v-else class="daily-groups">
        <div v-for="group in dailyGroups" :key="group.title" class="record-group">
          <div class="record-group-title">{{ group.title }}</div>
          <div class="record-items">
            <div v-for="item in group.items" :key="item.label" class="record-item">
              <span class="record-label">{{ item.label }}</span>
              <span class="record-value" :class="{ 'value-empty': item.empty }">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 机器总超滤量对比 -->
    <section class="card">
      <div class="card-head">
        <h2>机器总超滤量对比</h2>
        <div class="flow-toggle">
          <button type="button" :class="{ active: flowPeriod === 'month' }" @click="flowPeriod = 'month'">按月</button>
          <button type="button" :class="{ active: flowPeriod === 'year' }" @click="flowPeriod = 'year'">按年</button>
        </div>
      </div>

      <div v-if="loadingAll" class="state-tip">加载中...</div>
      <div v-else-if="flowSummary.length === 0" class="state-tip">暂无机器总超滤量数据</div>
      <div v-else>
        <div class="chart-wrap flow-chart-wrap">
          <Bar :data="flowChartData" :options="flowChartOptions" />
        </div>
        <div class="flow-table-wrap">
          <table class="flow-table">
            <thead>
              <tr>
                <th>{{ flowPeriod === 'month' ? '月份' : '年份' }}</th>
                <th>有效记录数</th>
                <th>合计 (ml)</th>
                <th>日均 (ml)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in flowSummary" :key="row.period">
                <td>{{ row.period }}</td>
                <td>{{ row.count }}</td>
                <td>{{ row.total }}</td>
                <td>{{ row.average }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { getAllTreatmentRecords, getTreatmentRecordByDate } from './utils/database.js';
import {
  getTreatmentRecordFromSQLite,
  getWaterIntakeFromSQLite,
  getAllTreatmentRecordsFromSQLite,
  getWaterTotalsByDateFromSQLite
} from './utils/sqliteDb.js';
import { Line, Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, Filler } from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, Filler
);

const METRICS = [
  { key: 'bloodPressure', label: '血压', unit: 'mmHg', color: '#e05b4a' },
  { key: 'heartRate', label: '心率', unit: 'bpm', color: '#e8a33d' },
  { key: 'weight', label: '体重', unit: 'kg', color: '#3d7ff0' },
  { key: 'waterIntake', label: '饮水量', unit: 'ml', color: '#2aa79b' },
  { key: 'machineTotalFlow', label: '机器总超滤量', unit: 'ml', color: '#7a5af8' }
];

// 本地日期转 YYYY-MM-DD，避免时区偏移
function toLocalISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function round(value, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export default {
  name: 'PreviewPage',
  components: {
    Line,
    Bar
  },
  data() {
    return {
      metrics: METRICS,
      metric: 'bloodPressure',
      ranges: [
        { days: 7, label: '近7天' },
        { days: 30, label: '近30天' },
        { days: 90, label: '近3个月' }
      ],
      rangeDays: 30,

      allRecords: [],
      waterTotals: {},
      loadingAll: true,

      // 选定日期记录
      selectedDate: toLocalISO(new Date()),
      dailyRecord: null,
      dailyWaterTotal: 0,
      dailyLoading: true,

      // 机器总超滤量对比
      flowPeriod: 'month'
    };
  },
  computed: {
    currentMetric() {
      return METRICS.find(m => m.key === this.metric) || METRICS[0];
    },
    rangeStartDate() {
      const start = new Date();
      start.setDate(start.getDate() - (this.rangeDays - 1));
      return toLocalISO(start);
    },
    todayISO() {
      return toLocalISO(new Date());
    },
    rangeRecords() {
      return this.allRecords
        .filter(r => r.date >= this.rangeStartDate && r.date <= this.todayISO)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    /**
     * 当前指标在所选区间内的数据点，血压拆分为收缩压/舒张压
     */
    trendPoints() {
      const points = [];
      this.rangeRecords.forEach(record => {
        if (this.metric === 'bloodPressure') {
          const parts = String(record.bloodPressure || '').split('/');
          const systolic = Number(parts[0]);
          const diastolic = Number(parts[1]);
          if (parts[0] !== '' && !isNaN(systolic)) {
            points.push({
              date: record.date,
              systolic,
              diastolic: isNaN(diastolic) ? null : diastolic
            });
          }
          return;
        }
        if (this.metric === 'waterIntake') {
          const logged = this.waterTotals[record.date];
          const recordValue = (String(record.waterIntake ?? '').trim() !== '') ? Number(record.waterIntake) : null;
          const value = (logged !== undefined && logged > 0) ? logged : recordValue;
          if (value !== null && !isNaN(value)) {
            points.push({ date: record.date, value });
          }
          return;
        }
        const raw = record[this.metric];
        if (raw === null || raw === undefined || String(raw).trim() === '') return;
        const value = Number(raw);
        if (!isNaN(value)) points.push({ date: record.date, value });
      });
      return points;
    },
    legendItems() {
      if (this.metric === 'bloodPressure') {
        const systolicValues = this.trendPoints.map(p => p.systolic);
        const diastolicValues = this.trendPoints.map(p => p.diastolic).filter(v => v !== null);
        return [
          { label: '收缩压', color: '#e05b4a', avg: this.averageOf(systolicValues) },
          { label: '舒张压', color: '#3d7ff0', avg: this.averageOf(diastolicValues) },
          { label: '收缩压上限', color: '#e8a33d', dashed: true, fixed: 140 }
        ];
      }
      return [{
        label: this.currentMetric.label,
        color: this.currentMetric.color,
        avg: this.averageOf(this.trendPoints.map(p => p.value))
      }];
    },
    trendData() {
      const labels = this.trendPoints.map(p => p.date.slice(5));
      if (this.metric === 'bloodPressure') {
        return {
          labels,
          datasets: [
            {
              label: '收缩压',
              data: this.trendPoints.map(p => p.systolic),
              borderColor: '#e05b4a',
              backgroundColor: '#e05b4a',
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2
            },
            {
              label: '舒张压',
              data: this.trendPoints.map(p => p.diastolic),
              borderColor: '#3d7ff0',
              backgroundColor: '#3d7ff0',
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2
            },
            {
              label: '收缩压上限',
              data: this.trendPoints.map(() => 140),
              borderColor: '#e8a33d',
              borderDash: [6, 4],
              borderWidth: 1,
              pointRadius: 0,
              fill: false
            }
          ]
        };
      }
      return {
        labels,
        datasets: [{
          label: this.currentMetric.label,
          data: this.trendPoints.map(p => p.value),
          borderColor: this.currentMetric.color,
          backgroundColor: this.currentMetric.color,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: false
        }]
      };
    },
    trendOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${context.parsed.y} ${this.currentMetric.unit}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: this.metric !== 'bloodPressure',
            grid: { color: '#eef0f3' },
            ticks: { color: '#9aa0a6', font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9aa0a6', font: { size: 11 }, maxRotation: 60, minRotation: 0 }
          }
        },
        interaction: { mode: 'index', intersect: false }
      };
    },
    stats() {
      let values;
      if (this.metric === 'bloodPressure') {
        values = this.trendPoints.map(p => p.systolic);
      } else {
        values = this.trendPoints.map(p => p.value);
      }
      if (values.length === 0) {
        return { average: null, max: null, min: null, validDays: 0 };
      }
      const sum = values.reduce((acc, v) => acc + v, 0);
      const digits = this.metric === 'weight' ? 2 : 0;
      return {
        average: round(sum / values.length, digits),
        max: round(Math.max(...values), digits),
        min: round(Math.min(...values), digits),
        validDays: values.length
      };
    },
    coverageDays() {
      const recorded = new Set(this.allRecords.map(r => r.date));
      const days = [];
      for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = toLocalISO(d);
        days.push({ date: iso, day: d.getDate(), hasRecord: recorded.has(iso) });
      }
      return days;
    },
    missingDays() {
      return this.coverageDays.filter(d => !d.hasRecord).length;
    },
    /**
     * 选定日期的治疗记录按类别分组，空值显示为"—"
     */
    dailyGroups() {
      const r = this.dailyRecord;
      if (!r) return [];
      const item = (label, val, suffix = '') => {
        const empty = val === null || val === undefined || String(val).trim() === '';
        return {
          label,
          value: empty ? '—' : `${val}${suffix}`,
          empty
        };
      };
      return [
        {
          title: '基本信息',
          items: [
            item('日期', r.date),
            item('星期', r.weekday ? `周${r.weekday}` : '')
          ]
        },
        {
          title: '血压与心率',
          items: [
            item('血压', r.bloodPressure),
            item('心率', r.heartRate, ' 次/分')
          ]
        },
        {
          title: '体重',
          items: [item('体重', r.weight, ' kg')]
        },
        {
          title: '治疗参数',
          items: [
            item('治疗方式', r.treatmentMethod),
            item('总治疗量', r.totalTreatmentVolume),
            item('治疗时间', r.treatmentTime, ' 小时'),
            item('单次注入量', r.singleInjectionVolume),
            item('末袋注入量', r.lastBagInjectionVolume),
            item('循环次数', r.cycleCount),
            item('加热袋', r.heatingBag),
            item('补充袋', r.supplementBag)
          ]
        },
        {
          title: '超滤量',
          items: [
            item('0周期超滤量', r.zeroCircleFlow),
            item('机器总超滤量', r.machineTotalFlow),
            item('日间超滤量', r.dayUltrafiltration),
            item('机器+手工总超滤量', r.machinePlusManualFlow)
          ]
        },
        {
          title: '腹透液',
          items: [
            item('日间手工注入量', r.dayManualInjection),
            item('日间注入浓度', r.dayInjectionConcentration),
            item('腹透液颜色', r.dialysateColor)
          ]
        },
        {
          title: '饮水',
          items: [
            item('治疗记录饮水量', r.waterIntake, ' ml'),
            item('喝水记录合计', this.dailyWaterTotal > 0 ? this.dailyWaterTotal : '', ' ml')
          ]
        }
      ];
    },
    /**
     * 机器总超滤量按年/按月汇总（空值不计入合计）
     */
    flowSummary() {
      const groups = {};
      this.allRecords.forEach(record => {
        const date = String(record.date || '');
        if (date.length < 7) return;
        const period = this.flowPeriod === 'year' ? date.slice(0, 4) : date.slice(0, 7);
        const raw = record.machineTotalFlow;
        const value = (raw === null || raw === undefined || String(raw).trim() === '') ? null : Number(raw);
        if (!groups[period]) groups[period] = { period, count: 0, total: 0 };
        if (value !== null && !isNaN(value)) {
          groups[period].count += 1;
          groups[period].total += value;
        }
      });
      return Object.values(groups)
        .filter(group => group.count > 0)
        .sort((a, b) => a.period.localeCompare(b.period))
        .map(group => ({
          period: this.flowPeriod === 'year' ? `${group.period}年` : group.period,
          count: group.count,
          total: Math.round(group.total * 100) / 100,
          average: Math.round((group.total / group.count) * 100) / 100
        }));
    },
    flowChartData() {
      return {
        labels: this.flowSummary.map(row => row.period),
        datasets: [
          {
            label: '机器总超滤量合计 (ml)',
            data: this.flowSummary.map(row => row.total),
            backgroundColor: 'rgba(122, 90, 248, 0.65)',
            borderColor: '#7a5af8',
            borderWidth: 1
          }
        ]
      };
    },
    flowChartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${context.parsed.y} ml`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#eef0f3' },
            ticks: { color: '#9aa0a6', font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9aa0a6', font: { size: 11 }, maxRotation: 60, minRotation: 0 }
          }
        }
      };
    }
  },
  watch: {
    selectedDate() {
      this.loadDailyRecord();
    }
  },
  mounted() {
    this.loadAllRecords();
    this.loadDailyRecord();
  },
  methods: {
    averageOf(values) {
      const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
      if (valid.length === 0) return null;
      const sum = valid.reduce((acc, v) => acc + v, 0);
      const digits = this.metric === 'weight' ? 2 : 0;
      return round(sum / valid.length, digits);
    },

    /**
     * 加载全部治疗记录与每日喝水合计
     * 优先读取本地 SQLite，非原生平台回退到 IndexedDB
     */
    async loadAllRecords() {
      this.loadingAll = true;
      try {
        let records = await getAllTreatmentRecordsFromSQLite();
        if (!records || records.length === 0) {
          records = await getAllTreatmentRecords();
        }
        this.allRecords = records || [];

        const totals = await getWaterTotalsByDateFromSQLite();
        const map = {};
        (totals || []).forEach(row => {
          map[row.date] = Number(row.total) || 0;
        });
        this.waterTotals = map;
      } catch (error) {
        console.error('加载治疗记录失败:', error);
        this.allRecords = [];
        this.waterTotals = {};
      } finally {
        this.loadingAll = false;
      }
    },

    /**
     * 加载选定日期的治疗记录与当日喝水合计
     */
    async loadDailyRecord() {
      this.dailyLoading = true;
      try {
        let record = await getTreatmentRecordFromSQLite(this.selectedDate);
        if (!record) {
          record = await getTreatmentRecordByDate(this.selectedDate);
        }
        this.dailyRecord = record || null;

        const waterRows = await getWaterIntakeFromSQLite(this.selectedDate);
        this.dailyWaterTotal = (waterRows || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        if (this.waterTotals[this.selectedDate] === undefined && this.dailyWaterTotal > 0) {
          this.waterTotals = { ...this.waterTotals, [this.selectedDate]: this.dailyWaterTotal };
        }
      } catch (error) {
        console.error('加载选定日期记录失败:', error);
        this.dailyRecord = null;
        this.dailyWaterTotal = 0;
      } finally {
        this.dailyLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.preview-page {
  max-width: 720px;
  margin: 0 auto;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 12px 24px;
  background-color: #f4f5f7;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 指标切换 */
.metric-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 8px;
  scrollbar-width: none;
}

.metric-tabs::-webkit-scrollbar {
  display: none;
}

.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background-color: #ffffff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

.metric-chip.active {
  background-color: #1f1f1f;
  border-color: #1f1f1f;
  color: #ffffff;
}

.metric-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 时间范围 */
.range-tabs {
  display: flex;
  gap: 8px;
  padding: 0 0 12px;
}

.range-chip {
  padding: 6px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background-color: #ffffff;
  color: #555;
  font-size: 14px;
  cursor: pointer;
}

.range-chip.active {
  background-color: #e8f0fe;
  border-color: #e8f0fe;
  color: #3d7ff0;
  font-weight: 600;
}

/* 卡片通用 */
.card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card-head h2 {
  margin: 0;
  font-size: 17px;
  color: #1f1f1f;
}

.card-meta {
  font-size: 13px;
  color: #9aa0a6;
  white-space: nowrap;
}

/* 趋势图 */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 8px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}

.legend-line {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-line.dashed {
  background-color: transparent !important;
  border-top: 2px dashed #e8a33d;
  border-radius: 0;
  height: 0;
  width: 14px;
}

.legend-value {
  color: #1f1f1f;
}

.chart-wrap {
  height: 260px;
  width: 100%;
  min-width: 0;
  position: relative;
}

.chart-wrap canvas {
  max-width: 100% !important;
}

.state-tip {
  padding: 30px 10px;
  text-align: center;
  color: #9aa0a6;
  font-size: 14px;
  background-color: #fafbfc;
  border-radius: 12px;
}

/* 区间统计 */
.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0 4px;
}

.stat {
  flex: 1;
  text-align: left;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.2;
}

.stat-sub {
  font-size: 13px;
  font-weight: 400;
  color: #9aa0a6;
}

.stat-label {
  margin-top: 4px;
  font-size: 12px;
  color: #9aa0a6;
}

.goal-note {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #fff8e6;
  border-radius: 10px;
  color: #a06600;
  font-size: 12px;
}

.goal-icon {
  margin-right: 4px;
}

/* 28天记录日历 */
.coverage-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.coverage-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40px;
  border: 1px solid transparent;
  border-radius: 10px;
  background-color: #f4f5f7;
  color: #b0b4ba;
  font-size: 13px;
  cursor: pointer;
}

.coverage-day.recorded {
  background-color: #e8f0fe;
  color: #3d7ff0;
  font-weight: 600;
}

.coverage-day.selected {
  border-color: #1f1f1f;
}

.day-dot {
  display: none;
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #3d7ff0;
}

.coverage-day.recorded .day-dot {
  display: block;
}

/* 选定日期记录 */
.date-input {
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #333;
}

.daily-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.record-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #3d7ff0;
  padding-left: 8px;
  border-left: 3px solid #3d7ff0;
  margin-bottom: 8px;
}

.record-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  background-color: #fafbfc;
  border-radius: 8px;
  font-size: 13px;
}

.record-label {
  color: #8a9099;
}

.record-value {
  color: #1f1f1f;
  font-weight: 500;
}

.record-value.value-empty {
  color: #c0c4c9;
  font-weight: 400;
}

/* 机器总超滤量对比 */
.flow-toggle {
  display: flex;
  gap: 6px;
}

.flow-toggle button {
  padding: 5px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background-color: #ffffff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
}

.flow-toggle button.active {
  background-color: #e8f0fe;
  border-color: #e8f0fe;
  color: #3d7ff0;
  font-weight: 600;
}

.flow-chart-wrap {
  height: 240px;
  margin-bottom: 12px;
}

.flow-table-wrap {
  overflow-x: auto;
}

.flow-table {
  width: 100%;
  border-collapse: collapse;
}

.flow-table th,
.flow-table td {
  padding: 9px 8px;
  border-bottom: 1px solid #eef0f3;
  text-align: center;
  font-size: 13px;
  white-space: nowrap;
}

.flow-table th {
  color: #9aa0a6;
  font-weight: 500;
  background-color: #fafbfc;
}

.flow-table td {
  color: #1f1f1f;
}
</style>
