<template>
  <div class="today-page">
    <header class="hero">
      <h1>腹透康</h1>
    </header>

    <section class="panel overview">
      <div class="panel-head">
        <h2>今日概览</h2>
        <button type="button" class="link" @click="goRecord('bp')">编辑 ›</button>
      </div>

      <div class="bp-row">
        <div class="bp-main">
          <span class="field-label">最近血压</span>
          <div class="bp-value" :class="{ placeholder: !latestBp }">
            {{ bpText }}<span class="unit">mmHg</span>
          </div>
          <div class="meta">{{ bpTime }} 测量 · 共{{ bpCount }}次</div>
        </div>
        <div class="bp-side">
          <span class="field-label">心率</span>
          <div class="bp-value small" :class="{ placeholder: heartRateText === '—' }">
            {{ heartRateText }}<span class="unit">次/分</span>
          </div>
          <div class="meta">体重 {{ weightText }} kg</div>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric">
          <span class="field-label">饮水量</span>
          <div class="metric-value teal">{{ waterIntake }}<span class="unit">ml</span></div>
          <div class="meta">上限 {{ waterLimit }} ml</div>
        </div>
        <div class="metric">
          <span class="field-label">总入量</span>
          <div class="metric-value purple">{{ totalIntake }}<span class="unit">ml</span></div>
          <div class="meta">含其它入量 {{ otherIntake }}</div>
        </div>
        <div class="metric">
          <span class="field-label">总出量</span>
          <div class="metric-value green">{{ totalOutput }}<span class="unit">ml</span></div>
          <div class="meta">尿量 {{ urineOutput }} · 腹透 {{ dialysateOut }}</div>
        </div>
        <div class="metric">
          <span class="field-label">超滤量</span>
          <div class="metric-value blue">{{ ultrafiltrationText }}<span class="unit">ml</span></div>
          <div class="meta">目标 1000-2000 ml</div>
        </div>
      </div>

      <div class="exchange">换液 {{ exchangeCount }} 次</div>
    </section>

    <section class="quick-panel">
      <button
        v-for="item in quicks"
        :key="item.key"
        type="button"
        class="quick-item"
        @click="goRecord(item.focus)"
      >
        <span class="quick-icon" :style="{ backgroundColor: item.color }">{{ item.char }}</span>
        <span class="quick-label">{{ item.label }}</span>
      </button>
    </section>

    <section class="panel trend-panel">
      <div class="panel-head">
        <h2>近 7 天超滤量</h2>
        <button type="button" class="link" @click="$router.push('/preview')">趋势 ›</button>
      </div>

      <div class="chart-legend">
        <i class="legend-dot"></i>
        <span>超滤量</span>
        <span class="legend-avg">均 {{ averageUf }}ml</span>
      </div>

      <div class="chart-wrap">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </section>
  </div>
</template>

<script>
import {
  initSQLite,
  getTreatmentRecordFromSQLite,
  getBpMeasurementsFromSQLite,
  getPdExchangesFromSQLite,
  getWaterIntakeFromSQLite,
  getDailyUfSeriesFromSQLite
} from './utils/sqliteDb.js';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  Tooltip
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, BarController, LineController, Tooltip
);

function toLocalISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default {
  name: 'TodayPage',
  components: { Bar },
  data() {
    return {
      today: toLocalISO(new Date()),
      record: null,
      bpMeasurements: [],
      exchanges: [],
      waterRows: [],
      ufSeries: [],
      waterLimit: 1000,
      quicks: [
        { key: 'bp', char: '压', label: '血压心率', focus: 'section-bp', color: '#e8735f' },
        { key: 'water', char: '饮', label: '饮水量', focus: 'section-io', color: '#4fb3ac' },
        { key: 'output', char: '出', label: '出入量', focus: 'section-io', color: '#56ab84' },
        { key: 'fluid', char: '液', label: '腹透液', focus: 'section-pd', color: '#4f7df3' }
      ],
      loading: true
    };
  },
  computed: {
    latestBp() {
      const rows = this.bpMeasurements.filter(m => m.systolic !== null && m.systolic !== undefined);
      if (rows.length > 0) {
        return rows[rows.length - 1];
      }
      const raw = String((this.record && this.record.bloodPressure) || '').trim();
      if (!raw) return null;
      const parts = raw.split('/');
      return {
        systolic: Number(parts[0]),
        diastolic: Number(parts[1]),
        heartRate: this.record.heartRate,
        time: this.recordTime,
        fallback: true
      };
    },
    bpText() {
      if (!this.latestBp) return '—';
      const d = Number(this.latestBp.diastolic);
      return isNaN(d) ? `${this.latestBp.systolic}` : `${this.latestBp.systolic}/${d}`;
    },
    bpTime() {
      return (this.latestBp && this.latestBp.time) || '—';
    },
    bpCount() {
      if (this.bpMeasurements.length > 0) return this.bpMeasurements.length;
      return this.latestBp ? 1 : 0;
    },
    heartRateText() {
      if (!this.latestBp) return '—';
      const hr = this.latestBp.heartRate;
      if (hr === null || hr === undefined || String(hr).trim() === '') return '—';
      return String(Math.round(Number(hr)));
    },
    recordTime() {
      if (!this.record || !this.record.updatedAt) return '';
      const d = new Date(this.record.updatedAt);
      if (isNaN(d.getTime())) return '';
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    },
    weightText() {
      const w = this.record && this.record.weight;
      return (w === null || w === undefined || String(w).trim() === '') ? '—' : w;
    },
    waterIntake() {
      if (this.waterRows.length > 0) {
        return this.waterRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      }
      const value = this.record && this.record.waterIntake;
      return (String(value ?? '').trim() === '') ? 0 : Math.round(Number(value));
    },
    otherIntake() {
      return Math.round(Number(this.record && this.record.otherIntake) || 0);
    },
    urineOutput() {
      return Math.round(Number(this.record && this.record.urineOutput) || 0);
    },
    totalIntake() {
      return Math.round(this.waterIntake + this.otherIntake);
    },
    pdIn() {
      return this.exchanges.reduce((sum, c) => sum + (Number(c.volumeIn) || 0), 0);
    },
    pdOut() {
      return this.exchanges.reduce((sum, c) => sum + (Number(c.volumeOut) || 0), 0);
    },
    hasCycles() {
      return this.exchanges.length > 0;
    },
    dayManualInjection() {
      return Number(this.record && this.record.dayManualInjection) || 0;
    },
    dayUltrafiltration() {
      return Number(this.record && this.record.dayUltrafiltration) || 0;
    },
    dialysateOut() {
      if (this.hasCycles) {
        return Math.round(this.pdOut);
      }
      // 旧记录没有循环明细时，按「总治疗量 + 日间注入 + 超滤量」推算腹透出量
      const record = this.record || {};
      const totalIn = Number(record.totalTreatmentVolume);
      if (String(record.totalTreatmentVolume ?? '').trim() === '' || isNaN(totalIn)) return 0;
      return Math.round(totalIn + this.dayManualInjection + this.machineUf);
    },
    totalOutput() {
      return Math.round(this.urineOutput + this.dialysateOut);
    },
    machineUf() {
      if (this.hasCycles) {
        return Math.round(this.pdOut - this.pdIn);
      }
      const record = this.record || {};
      const plus = Number(record.machinePlusManualFlow);
      if (String(record.machinePlusManualFlow ?? '').trim() !== '' && !isNaN(plus)) {
        return Math.round(plus);
      }
      return Math.round(
        (Number(record.zeroCircleFlow) || 0) +
        (Number(record.machineTotalFlow) || 0) +
        (Number(record.dayUltrafiltration) || 0)
      );
    },
    ultrafiltration() {
      if (this.hasCycles) {
        return Math.round(this.pdOut - this.pdIn);
      }
      return this.machineUf;
    },
    ultrafiltrationText() {
      const value = this.ultrafiltration;
      return value > 0 ? `+${value}` : String(value);
    },
    exchangeCount() {
      if (this.hasCycles) return this.exchanges.length;
      return Number(this.record && this.record.cycleCount) || 0;
    },
    last7Days() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(toLocalISO(d));
      }
      return days;
    },
    chartValues() {
      return this.last7Days.map(date => {
        const row = this.ufSeries.find(item => item.date === date);
        return row ? Math.round(row.uf) : 0;
      });
    },
    averageUf() {
      const values = this.chartValues.filter(v => v !== 0);
      if (values.length === 0) return 0;
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    },
    chartData() {
      return {
        labels: this.last7Days.map(date => date.slice(5).replace('-', '/')),
        datasets: [
          {
            type: 'bar',
            label: '超滤量',
            data: this.chartValues,
            backgroundColor: '#6b8dfb',
            borderRadius: 5,
            barPercentage: 0.62,
            categoryPercentage: 0.72,
            order: 2
          },
          {
            type: 'line',
            label: '上限',
            data: this.chartValues.map(() => 2000),
            borderColor: '#e8b23d',
            borderDash: [5, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 1
          },
          {
            type: 'line',
            label: '下限',
            data: this.chartValues.map(() => 1000),
            borderColor: '#8fbfa8',
            borderDash: [5, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 1
          }
        ]
      };
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${context.parsed.y} ml`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: '#e8eaee' },
            ticks: { color: '#9aa0a6', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 2100,
            grid: { color: '#eef0f3' },
            border: { display: false },
            ticks: { color: '#b0b5bd', font: { size: 10 }, stepSize: 500 }
          }
        }
      };
    }
  },
  watch: {
    '$route.path'() {
      if (this.$route.path === '/') this.loadData();
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    goRecord(focus) {
      this.$router.push(`/record#${focus || 'section-bp'}`);
    },
    async loadData() {
      this.loading = true;
      try {
        await initSQLite();
        this.waterLimit = Number(localStorage.getItem('waterLimit')) || 1000;
        const start = this.last7Days[0];
        const [record, bps, exchanges, water, series] = await Promise.all([
          getTreatmentRecordFromSQLite(this.today),
          getBpMeasurementsFromSQLite(this.today),
          getPdExchangesFromSQLite(this.today),
          getWaterIntakeFromSQLite(this.today),
          getDailyUfSeriesFromSQLite(start, this.today)
        ]);
        this.record = record || null;
        this.bpMeasurements = bps || [];
        this.exchanges = exchanges || [];
        this.waterRows = water || [];
        this.ufSeries = series || [];
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 加载今日概览失败: ${error.message}`);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.today-page {
  min-height: 100vh;
  background-color: #eef1f8;
  padding-bottom: 16px;
}

.hero {
  background: linear-gradient(135deg, #5b7cf7 0%, #6a8dfa 55%, #7b9bfb 100%);
  padding: calc(14px + env(safe-area-inset-top, 0px)) 20px 54px;
  text-align: center;
}

.hero h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #ffffff;
}

.panel {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin: 0 12px;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
}

.overview {
  margin-top: -40px;
  position: relative;
  z-index: 1;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1f2430;
}

.link {
  border: none;
  background: none;
  color: #8b919c;
  font-size: 13px;
  padding: 4px 0;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #8b919c;
}

.bp-row {
  display: flex;
  align-items: flex-start;
}

.bp-main {
  flex: 1.2;
  padding-right: 12px;
}

.bp-side {
  flex: 1;
  border-left: 1px solid #eef0f3;
  padding-left: 16px;
}

.bp-value {
  font-size: 32px;
  line-height: 1.15;
  font-weight: 700;
  color: #232936;
  margin-top: 2px;
  letter-spacing: -0.5px;
}

.bp-value.small {
  font-size: 30px;
}

.bp-value.placeholder {
  color: #c3c8d2;
  font-weight: 400;
  font-size: 26px;
  letter-spacing: 0;
}

.unit {
  font-size: 12px;
  font-weight: 400;
  color: #8b919c;
  margin-left: 4px;
  letter-spacing: 0;
}

.meta {
  margin-top: 2px;
  font-size: 11px;
  color: #9aa0a6;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 12px;
  margin-top: 18px;
  border-top: 1px solid #f0f2f5;
  padding-top: 16px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 2px;
  line-height: 1.2;
}

.metric-value.teal { color: #2aa79b; }
.metric-value.purple { color: #7a5af8; }
.metric-value.green { color: #3fa379; }
.metric-value.blue { color: #3d7ff0; }

.exchange {
  display: inline-block;
  margin-top: 16px;
  background: #f1f3f7;
  color: #5f6673;
  font-size: 12px;
  border-radius: 8px;
  padding: 7px 12px;
}

.quick-panel {
  display: flex;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 12px 14px;
  margin: 12px 12px 0;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
}

.quick-item {
  flex: 1;
  border: none;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
}

.quick-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  color: #ffffff;
  font-size: 19px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-label {
  font-size: 12px;
  color: #5f6673;
}

.trend-panel {
  margin-top: 12px;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5f6673;
  margin-bottom: 8px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b8dfb;
}

.legend-avg {
  color: #9aa0a6;
  margin-left: 6px;
}

.chart-wrap {
  height: 180px;
}
</style>
