<template>
  <div class="me-page">
    <header class="hero">
      <h1>我的</h1>
    </header>

    <section class="profile">
      <div class="avatar">腹</div>
      <div class="profile-text">
        <div class="name">腹透康</div>
        <div class="sub">数据保存在本机 SQLite</div>
      </div>
    </section>

    <section class="panel">
      <button type="button" class="row" @click="$router.push('/protocol')">
        <span>我的治疗方案</span>
        <span class="protocol-summary">{{ protocolSummary }}<i class="chev">›</i></span>
      </button>
      <button type="button" class="row" @click="$router.push('/manage')">
        <span>数据导入 / 导出</span>
        <span class="chev">›</span>
      </button>
      <button type="button" class="row" @click="$router.push('/water')">
        <span>喝水记录管理</span>
        <span class="chev">›</span>
      </button>
      <div class="row">
        <span>每日饮水量上限</span>
        <span class="limit">
          <input type="number" inputmode="numeric" v-model="waterLimit" @change="saveLimit">
          <i>ml</i>
        </span>
      </div>
    </section>

    <section class="panel">
      <div class="row static">
        <span>治疗记录</span>
        <b>{{ recordCount }} 条</b>
      </div>
      <div class="row static">
        <span>数据存储</span>
        <b>本地 SQLite</b>
      </div>
      <div class="row static">
        <span>版本</span>
        <b>1.0.0</b>
      </div>
    </section>
  </div>
</template>

<script>
import { initSQLite, getAllTreatmentRecordsFromSQLite } from './utils/sqliteDb.js';
import { loadProtocol } from './utils/protocol.js';

export default {
  name: 'MePage',
  data() {
    return {
      waterLimit: 1000,
      recordCount: 0,
      protocolSummary: '',
      toastTimer: null
    };
  },
  async mounted() {
    this.waterLimit = Number(localStorage.getItem('waterLimit')) || 1000;
    const protocol = loadProtocol();
    const day = protocol.day && protocol.day.enabled;
    const night = protocol.night && protocol.night.enabled;
    const parts = [];
    if (day) parts.push(`白天 ${protocol.day.volumeIn || 0}ml`);
    if (night) parts.push(`夜间 ${protocol.night.cycles || 0}×${protocol.night.volumeIn || 0}ml`);
    this.protocolSummary = parts.length ? parts.join(' · ') : '未配置';
    try {
      await initSQLite();
      const records = await getAllTreatmentRecordsFromSQLite();
      this.recordCount = (records || []).length;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 加载我的页面数据失败: ${error.message}`);
    }
  },
  methods: {
    saveLimit() {
      const value = Number(this.waterLimit);
      this.waterLimit = value > 0 ? value : 1000;
      localStorage.setItem('waterLimit', String(this.waterLimit));
    }
  }
};
</script>

<style scoped>
.me-page {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding-bottom: 20px;
}

.hero {
  background: linear-gradient(135deg, #5b7cf7 0%, #6a8dfa 55%, #7b9bfb 100%);
  padding: calc(14px + env(safe-area-inset-top, 0px)) 20px 50px;
  text-align: center;
}

.hero h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 1px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border-radius: 16px;
  margin: -34px 12px 12px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
  position: relative;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  background: #eef3ff;
  color: #4f7df3;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2430;
}

.sub {
  margin-top: 3px;
  font-size: 11px;
  color: #9aa0a6;
}

.panel {
  background: #ffffff;
  border-radius: 16px;
  margin: 0 12px 12px;
  padding: 2px 16px;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: none;
  background: none;
  border-bottom: 1px solid #f4f6f9;
  padding: 15px 0;
  font-size: 14px;
  color: #3c4250;
  text-align: left;
}

.row:last-child {
  border-bottom: none;
}

.row.static {
  color: #6b7280;
}

.row b {
  font-weight: 600;
  color: #232936;
}

.chev {
  color: #c3c8d2;
  font-size: 18px;
}

.protocol-summary {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #9aa0a6;
  max-width: 60%;
  text-align: right;
}

.protocol-summary .chev {
  font-style: normal;
}

.limit {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.limit input {
  width: 70px;
  border: none;
  background: #f4f6f9;
  border-radius: 8px;
  padding: 6px 8px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #232936;
  outline: none;
}

.limit i {
  font-style: normal;
  font-size: 11px;
  color: #9aa0a6;
}
</style>
