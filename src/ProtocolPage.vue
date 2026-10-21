<template>
  <div class="protocol-page">
    <header class="page-header">
      <button type="button" class="back" @click="$router.back()">‹</button>
      <h1>我的治疗方案</h1>
      <span class="back placeholder"></span>
    </header>

    <div class="intro">
      按实际处方配置一次，之后在记录页点「套用方案」，就能一键生成当天全部换液条目 ——
      <b>入量和时间自动填好，只需补上每次的出量</b>。
    </div>

    <!-- 白天长留腹 -->
    <section class="panel">
      <div class="panel-head">
        <h2>白天长留腹</h2>
        <button
          type="button"
          class="switch"
          :class="{ on: day.enabled }"
          @click="toggle('day')"
        ><i></i></button>
      </div>

      <template v-if="day.enabled">
        <div class="row">
          <span>灌入时间</span>
          <input type="time" v-model="day.time">
        </div>
        <div class="row">
          <span>灌入量</span>
          <span class="value">
            <input type="number" inputmode="numeric" v-model="day.volumeIn" placeholder="2000">
            <i>ml</i>
          </span>
        </div>
        <div class="row">
          <span>留腹时长</span>
          <input class="text-input" v-model="day.dwell" placeholder="如 10h">
        </div>
        <div class="row col">
          <span>透析液类型</span>
          <div class="chips">
            <button
              v-for="c in concentrations"
              :key="c"
              type="button"
              class="chip"
              :class="{ active: day.conc === c }"
              @click="day.conc = c"
            >{{ c }}</button>
          </div>
        </div>
        <div class="row">
          <span>品牌</span>
          <select v-model="day.brand">
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
      </template>
      <div v-else class="off-hint">已关闭，套用方案时不会生成白天的记录</div>
    </section>

    <!-- 夜间 APD -->
    <section class="panel">
      <div class="panel-head">
        <h2>夜间 APD 循环</h2>
        <button
          type="button"
          class="switch"
          :class="{ on: night.enabled }"
          @click="toggle('night')"
        ><i></i></button>
      </div>

      <template v-if="night.enabled">
        <div class="row">
          <span>循环次数</span>
          <span class="value">
            <input type="number" inputmode="numeric" v-model="night.cycles" placeholder="4">
            <i>次</i>
          </span>
        </div>
        <div class="row">
          <span>每循环灌入量</span>
          <span class="value">
            <input type="number" inputmode="numeric" v-model="night.volumeIn" placeholder="2000">
            <i>ml</i>
          </span>
        </div>
        <div class="row">
          <span>每循环时长</span>
          <span class="value">
            <input type="number" inputmode="decimal" v-model="night.hours" placeholder="2">
            <i>小时</i>
          </span>
        </div>
        <div class="row">
          <span>开始时间</span>
          <input type="time" v-model="night.startTime">
        </div>
        <div class="row col">
          <span>透析液类型</span>
          <div class="chips">
            <button
              v-for="c in concentrations"
              :key="c"
              type="button"
              class="chip"
              :class="{ active: night.conc === c }"
              @click="night.conc = c"
            >{{ c }}</button>
          </div>
        </div>
        <div class="row">
          <span>品牌</span>
          <select v-model="night.brand">
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
      </template>
      <div v-else class="off-hint">已关闭，套用方案时不会生成夜间的记录</div>
    </section>

    <!-- 方案预览 -->
    <section class="panel">
      <div class="panel-head">
        <h2>方案预览</h2>
        <span class="panel-hint">共 {{ preview.length }} 条 · 合计入量 {{ totalIn }} ml</span>
      </div>

      <div v-if="!preview.length" class="empty">请至少启用一项治疗方案</div>

      <div v-for="(item, index) in preview" :key="item.localId" class="preview-item">
        <span class="no">{{ index + 1 }}</span>
        <div class="pv-time">
          <span class="pv-t">{{ item.time }}</span>
          <span v-if="item.nextDay" class="pv-day">次日</span>
        </div>
        <div class="pv-main">
          <div class="pv-line1">
            <span class="pv-conc">{{ item.conc || '未设置类型' }}</span>
            <span v-if="item.cycleNo" class="pv-cycle">第 {{ item.cycleNo }}/{{ item.cycleTotal }} 循环</span>
          </div>
          <div class="pv-line2">
            {{ item.brand || '未设置品牌' }}<span v-if="item.dwell"> · 留腹 {{ item.dwell }}</span>
          </div>
        </div>
        <div class="pv-vol">{{ item.volumeIn || 0 }}<i>ml</i></div>
      </div>

      <div v-if="preview.length" class="pv-note">套用后每条的「出量」需要手填，超滤量会自动计算。</div>
    </section>

    <button type="button" class="save-btn" @click="save">保存方案</button>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script>
import { PD_BRANDS, PD_CONCENTRATIONS } from './utils/pdConstants.js';
import { loadProtocol, saveProtocol, buildPdList } from './utils/protocol.js';

function num(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

export default {
  name: 'ProtocolPage',
  data() {
    return {
      brands: PD_BRANDS,
      concentrations: PD_CONCENTRATIONS,
      day: { enabled: true, time: '08:00', volumeIn: '', dwell: '', conc: '', brand: '' },
      night: {
        enabled: true,
        cycles: '4',
        volumeIn: '',
        hours: '2',
        startTime: '20:00',
        conc: '',
        brand: ''
      },
      toast: '',
      toastTimer: null
    };
  },
  computed: {
    protocol() {
      return {
        enabled: !!(this.day.enabled || this.night.enabled),
        day: {
          enabled: !!this.day.enabled,
          label: '白天长留腹',
          brand: this.day.brand || '',
          conc: this.day.conc || '',
          volumeIn: num(this.day.volumeIn),
          time: this.day.time || '',
          dwell: this.day.dwell || ''
        },
        night: {
          enabled: !!this.night.enabled,
          label: '夜间 APD',
          cycles: num(this.night.cycles) || 4,
          volumeIn: num(this.night.volumeIn),
          hours: num(this.night.hours) || 2,
          startTime: this.night.startTime || '20:00',
          brand: this.night.brand || '',
          conc: this.night.conc || ''
        }
      };
    },
    preview() {
      return buildPdList(this.protocol);
    },
    totalIn() {
      return this.preview.reduce((sum, it) => sum + num(it.volumeIn), 0);
    }
  },
  mounted() {
    const saved = loadProtocol();
    this.day = {
      enabled: saved.day.enabled !== false,
      time: saved.day.time || '08:00',
      volumeIn: saved.day.volumeIn === undefined ? '' : String(saved.day.volumeIn),
      dwell: saved.day.dwell || '',
      conc: saved.day.conc || '',
      brand: saved.day.brand || ''
    };
    this.night = {
      enabled: saved.night.enabled !== false,
      cycles: String(saved.night.cycles ?? 4),
      volumeIn: saved.night.volumeIn === undefined ? '' : String(saved.night.volumeIn),
      hours: String(saved.night.hours ?? 2),
      startTime: saved.night.startTime || '20:00',
      conc: saved.night.conc || '',
      brand: saved.night.brand || ''
    };
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  },
  methods: {
    toggle(key) {
      this[key].enabled = !this[key].enabled;
    },
    showToast(text) {
      this.toast = text;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toast = ''; }, 2200);
    },
    save() {
      const proto = this.protocol;
      if (!proto.day.enabled && !proto.night.enabled) {
        this.showToast('请至少启用一项治疗时段');
        return;
      }
      if (proto.day.enabled && !proto.day.volumeIn) {
        this.showToast('请填写白天灌入量');
        return;
      }
      if (proto.night.enabled && !proto.night.volumeIn) {
        this.showToast('请填写每循环灌入量');
        return;
      }
      if (proto.night.enabled && proto.night.cycles < 1) {
        this.showToast('循环次数至少为 1');
        return;
      }
      saveProtocol(proto);
      this.showToast('方案已保存');
      setTimeout(() => this.$router.back(), 600);
    }
  }
};
</script>

<style scoped>
.protocol-page {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding-bottom: 200px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 60;
  background: #ffffff;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 12px 12px;
  border-bottom: 1px solid #f0f2f5;
}

.page-header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2430;
}

.back {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  color: #3c4250;
  padding: 0;
}

.back.placeholder {
  visibility: hidden;
}

.intro {
  margin: 12px 12px 0;
  padding: 12px 14px;
  background: #eef3ff;
  color: #5b6b8c;
  font-size: 12px;
  line-height: 1.6;
  border-radius: 12px;
}

.intro b {
  color: #3d7ff0;
  font-weight: 600;
}

.panel {
  background: #ffffff;
  border-radius: 16px;
  padding: 6px 16px 12px;
  margin: 12px 12px 0;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f4f6f9;
}

.panel-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2430;
}

.panel-hint {
  font-size: 11px;
  color: #9aa0a6;
}

.switch {
  width: 44px;
  height: 26px;
  border: none;
  border-radius: 13px;
  background: #d8dde6;
  padding: 2px;
  transition: background 0.2s;
}

.switch i {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s;
}

.switch.on {
  background: #3d7ff0;
}

.switch.on i {
  transform: translateX(18px);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f4f6f9;
  font-size: 13px;
  color: #5f6673;
}

.row:last-child {
  border-bottom: none;
}

.row.col {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.row input,
.row select {
  border: none;
  background: #f4f6f9;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #232936;
  text-align: right;
  outline: none;
}

.row input[type="time"] {
  min-width: 96px;
}

.row select {
  max-width: 180px;
}

.text-input {
  width: 110px;
}

.value {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.value input {
  width: 84px;
}

.value i {
  font-style: normal;
  font-size: 11px;
  color: #9aa0a6;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid #e4e8f0;
  background: #ffffff;
  color: #5f6673;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 16px;
}

.chip.active {
  border-color: #3d7ff0;
  background: #eef3ff;
  color: #3d7ff0;
  font-weight: 600;
}

.off-hint {
  padding: 14px 0 8px;
  font-size: 12px;
  color: #9aa0a6;
}

.empty {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: #9aa0a6;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid #f4f6f9;
}

.preview-item:last-of-type {
  border-bottom: none;
}

.no {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  background: #f1f3f7;
  color: #8b919c;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv-time {
  flex: none;
  width: 48px;
  display: flex;
  flex-direction: column;
}

.pv-t {
  font-size: 13px;
  font-weight: 600;
  color: #232936;
}

.pv-day {
  font-size: 10px;
  color: #e8735f;
}

.pv-main {
  flex: 1;
  min-width: 0;
}

.pv-line1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pv-conc {
  font-size: 13px;
  color: #232936;
  font-weight: 600;
}

.pv-cycle {
  font-size: 10px;
  color: #3d7ff0;
  background: #eef3ff;
  border-radius: 6px;
  padding: 1px 5px;
}

.pv-line2 {
  margin-top: 2px;
  font-size: 11px;
  color: #9aa0a6;
}

.pv-vol {
  flex: none;
  font-size: 14px;
  font-weight: 700;
  color: #3d7ff0;
}

.pv-vol i {
  font-style: normal;
  font-size: 10px;
  font-weight: 400;
  color: #9aa0a6;
  margin-left: 2px;
}

.pv-note {
  padding-top: 10px;
  font-size: 11px;
  color: #9aa0a6;
}

.save-btn {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #5b7cf7, #7b9bfb);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(91, 124, 247, 0.32);
  z-index: 110;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 90px;
  transform: translateX(-50%);
  background: rgba(31, 36, 48, 0.88);
  color: #ffffff;
  font-size: 13px;
  padding: 9px 16px;
  border-radius: 20px;
  z-index: 100;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
