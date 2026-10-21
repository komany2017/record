<template>
  <div class="record-page">
    <header class="page-header">
      <h1>记录</h1>
    </header>

    <div class="date-bar">
      <button type="button" class="date-nav" @click="shiftDate(-1)">‹ 前一天</button>
      <div class="date-title">
        <span class="date-main">{{ dateLabel }}</span>
        <span class="date-week">{{ weekdayLabel }}</span>
      </div>
      <button type="button" class="date-nav right" :disabled="isToday" @click="shiftDate(1)">后一天 ›</button>
    </div>

    <!-- 血压 / 心率 -->
    <section class="panel" id="section-bp">
      <div class="panel-head">
        <h2>血压 / 心率</h2>
        <button type="button" class="add-one" @click="addBp">+ 添加一次</button>
      </div>

      <div v-for="(m, idx) in bpList" :key="idx" class="measure-card">
        <div class="measure-head">
          <input type="time" class="time-input" v-model="m.time">
          <button type="button" class="del" @click="removeBp(idx)">删除</button>
        </div>
        <div class="measure-inputs">
          <label class="measure-field">
            <span class="field-box">
              <input type="number" inputmode="numeric" v-model="m.sbp" placeholder="—">
              <i>mmHg</i>
            </span>
            <span class="field-name">收缩压</span>
          </label>
          <span class="slash">/</span>
          <label class="measure-field">
            <span class="field-box">
              <input type="number" inputmode="numeric" v-model="m.dbp" placeholder="—">
              <i>mmHg</i>
            </span>
            <span class="field-name">舒张压</span>
          </label>
          <label class="measure-field">
            <span class="field-box">
              <input type="number" inputmode="numeric" v-model="m.hr" placeholder="—">
              <i>次/分</i>
            </span>
            <span class="field-name">心率</span>
          </label>
        </div>
        <div v-if="bpWarning(m)" class="warning">
          <span class="warning-dot">●</span>{{ bpWarning(m) }}
        </div>
      </div>

      <div v-if="!bpList.length" class="empty">暂无测量，点击「+ 添加一次」记录血压心率</div>
    </section>

    <!-- 出入量 -->
    <section class="panel" id="section-io">
      <div class="panel-head">
        <h2>出入量</h2>
      </div>

      <div class="intake-row big">
        <div class="intake-label">
          <span>饮水量</span>
          <i>上限 {{ goals.waterMax }} ml</i>
        </div>
        <div class="intake-input">
          <input type="number" inputmode="numeric" v-model="intake.water" placeholder="0">
          <span>ml</span>
        </div>
      </div>

      <div class="quick-chips">
        <button v-for="n in [100, 200, 300, 500]" :key="n" type="button" @click="addWater(n)">+{{ n }}</button>
        <button type="button" class="clear" @click="intake.water = ''">清零</button>
      </div>

      <div class="intake-row">
        <div class="intake-label">
          <span>其它入量</span>
          <i>粥、汤、水果等</i>
        </div>
        <div class="intake-input">
          <input type="number" inputmode="numeric" v-model="intake.other" placeholder="0">
          <span>ml</span>
        </div>
      </div>

      <div class="intake-row">
        <div class="intake-label">
          <span>尿量</span>
        </div>
        <div class="intake-input">
          <input type="number" inputmode="numeric" v-model="output.urine" placeholder="0">
          <span>ml</span>
        </div>
      </div>

      <div class="intake-row">
        <div class="intake-label">
          <span>其它出量</span>
          <i>呕吐、腹泻等</i>
        </div>
        <div class="intake-input">
          <input type="number" inputmode="numeric" v-model="output.other" placeholder="0">
          <span>ml</span>
        </div>
      </div>

      <div class="intake-row readonly">
        <div class="intake-label">
          <span>腹透出量</span>
          <i>由换液记录自动汇总</i>
        </div>
        <div class="intake-value">{{ sum.pdOut }}<span>ml</span></div>
      </div>

      <div class="totals">
        <div class="total-item">
          <span>总入量</span>
          <b>{{ sum.totalIntake }}</b>
        </div>
        <div class="total-item">
          <span>总出量</span>
          <b>{{ sum.totalOutput }}</b>
        </div>
        <div class="total-item">
          <span>净平衡</span>
          <b :class="{ blue: sum.balance >= 0, red: sum.balance < 0 }">{{ signed(sum.balance) }}</b>
        </div>
      </div>
    </section>

    <!-- 腹透液 -->
    <section class="panel" id="section-pd">
      <div class="panel-head">
        <h2>腹透液</h2>
        <div class="head-actions">
          <button type="button" class="mini-link" @click="applyProtocol">套用方案</button>
          <button type="button" class="mini-link" @click="addPd('manual')">+ 手工</button>
          <button type="button" class="mini-link" @click="addPd('apd')">+ APD</button>
        </div>
      </div>

      <div class="protocol-box">
        <div class="protocol-lines" @click="$router.push('/protocol')">
          <div v-for="line in protocolLines" :key="line.tag" class="protocol-line">
            <span class="tag">{{ line.tag }}</span>
            <span class="text">{{ line.text }}</span>
            <span class="sub">{{ line.sub }}</span>
          </div>
          <div v-if="!protocolLines.length" class="protocol-empty">尚未配置治疗方案</div>
        </div>
        <button type="button" class="config-link" @click="$router.push('/protocol')">配置 ›</button>
      </div>

      <div class="uf-grid">
        <div class="uf-cell">
          <span class="uf-label">0 周期引流</span>
          <b>{{ icoSum.out }}<i>ml</i></b>
        </div>
        <div class="uf-cell">
          <span class="uf-label">APD 总出量</span>
          <b>{{ apdSum.out }}<i>ml</i></b>
        </div>
        <div class="uf-cell">
          <span class="uf-label">总超滤</span>
          <b :class="sum.uf < 0 ? 'danger' : 'primary'">{{ sum.ufText }}<i>ml</i></b>
        </div>
      </div>

      <!-- 艾考糊精长留腹 -->
      <template v-if="icoList.length">
        <div class="sub-title">
          <span>艾考糊精长留腹</span>
          <button type="button" class="link" @click="batchFillIco">批量填入入量</button>
        </div>

        <div v-for="it in icoList" :key="it.localId" class="pd-card ico-card">
          <div class="pd-card-head">
            <input type="time" class="time-input" v-model="it.time">
            <span class="kind-chip ico">艾考糊精</span>
            <button type="button" class="del" @click="removePd(it)">×</button>
          </div>
          <div class="pd-grid">
            <label class="wide">
              <span>品牌</span>
              <select v-model="it.brand">
                <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
              </select>
            </label>
            <label class="wide">
              <span>浓度</span>
              <select v-model="it.conc">
                <option v-for="c in concentrations" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
            <label>
              <span>留腹</span>
              <input v-model="it.dwell" placeholder="10h">
            </label>
            <label>
              <span>灌入 ml</span>
              <input type="number" inputmode="numeric" v-model="it.volumeIn" placeholder="0">
            </label>
            <label>
              <span>引流 ml</span>
              <input type="number" inputmode="numeric" v-model="it.volumeOut" placeholder="0">
            </label>
            <div class="pd-uf">
              <span>超滤</span>
              <b :class="{ primary: ufOf(it) >= 0, danger: ufOf(it) < 0 }">{{ ufText(it) }}</b>
            </div>
          </div>
        </div>

        <div class="pd-foot">
          <div><span>艾考糊精灌入</span><b>{{ icoSum.in }}</b><i>ml</i></div>
          <div><span>艾考糊精引流</span><b>{{ icoSum.out }}</b><i>ml</i></div>
          <div><span>艾考糊精超滤</span><b class="primary">{{ icoSum.ufText }}</b><i>ml</i></div>
        </div>
      </template>

      <!-- APD 循环速录 -->
      <template v-if="apdList.length">
        <div class="apd-head">
          <div class="sub-title no-border">
            <span>APD 循环速录</span>
            <i class="apd-sub">· {{ apdList.length }} 个循环</i>
          </div>
          <button type="button" class="link" @click="batchFillApd">批量填入入量</button>
        </div>

        <div class="apd-table">
          <div class="apd-row apd-row-head">
            <span class="c-no">#</span>
            <span class="c-time">时间</span>
            <span class="c-input">灌入 ml</span>
            <span class="c-input">引流 ml</span>
            <span class="c-uf">超滤</span>
            <span class="c-del"></span>
          </div>
          <div v-for="it in apdList" :key="it.localId" class="apd-row">
            <span class="c-no badge">{{ it.cycleNo }}</span>
            <span class="c-time">
              <input type="time" v-model="it.time">
              <i v-if="it.nextDay" class="next-day">次日</i>
            </span>
            <input class="c-input" type="number" inputmode="numeric" v-model="it.volumeIn" placeholder="0">
            <input class="c-input" type="number" inputmode="numeric" v-model="it.volumeOut" placeholder="0">
            <span class="c-uf" :class="{ primary: ufOf(it) >= 0, danger: ufOf(it) < 0 }">{{ ufText(it) }}</span>
            <button type="button" class="c-del" @click="removePd(it)">×</button>
          </div>
        </div>

        <div class="pd-foot">
          <div><span>APD 灌入</span><b>{{ apdSum.in }}</b><i>ml</i></div>
          <div><span>APD 引流</span><b>{{ apdSum.out }}</b><i>ml</i></div>
          <div><span>APD 超滤</span><b class="primary">{{ apdSum.ufText }}</b><i>ml</i></div>
        </div>
      </template>

      <!-- 手工换液卡片 -->
      <div v-for="it in manualList" :key="it.localId" class="pd-card">
        <div class="pd-card-head">
          <input type="time" class="time-input" v-model="it.time">
          <span class="kind-chip">手工换液</span>
          <button type="button" class="del" @click="removePd(it)">×</button>
        </div>
        <div class="pd-grid">
          <label class="wide">
            <span>品牌</span>
            <select v-model="it.brand">
              <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
            </select>
          </label>
          <label class="wide">
            <span>浓度</span>
            <select v-model="it.conc">
              <option v-for="c in concentrations" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>
            <span>留腹</span>
            <input v-model="it.dwell" placeholder="4h">
          </label>
          <label>
            <span>灌入 ml</span>
            <input type="number" inputmode="numeric" v-model="it.volumeIn" placeholder="0">
          </label>
          <label>
            <span>引流 ml</span>
            <input type="number" inputmode="numeric" v-model="it.volumeOut" placeholder="0">
          </label>
          <div class="pd-uf">
            <span>超滤</span>
            <b :class="{ primary: ufOf(it) >= 0, danger: ufOf(it) < 0 }">{{ ufText(it) }}</b>
          </div>
        </div>
      </div>

      <div v-if="!pdList.length" class="empty">
        {{ protocolLines.length ? '点击右上角「套用方案」，一键生成当天全部换液条目' : '按每次换液记录，超滤量自动计算' }}
      </div>
    </section>

    <!-- 体重 -->
    <section class="panel">
      <div class="panel-title">体重</div>
      <div class="weight-row">
        <span class="weight-label">晨起空腹体重</span>
        <span class="weight-input">
          <input type="number" step="0.01" inputmode="decimal" v-model="weight" placeholder="—">
          <i>kg</i>
        </span>
      </div>
      <button v-if="lastWeight" type="button" class="last-weight" @click="weight = String(lastWeight)">
        沿用上次 {{ lastWeight }} kg
      </button>
    </section>

    <!-- 用药 -->
    <section class="panel">
      <div class="panel-head">
        <h2>用药</h2>
        <button type="button" class="add-one" @click="addEmptyMed">+ 添加</button>
      </div>

      <div v-for="(med, idx) in meds" :key="idx" class="med-row">
        <input class="med-name" v-model="med.name" placeholder="药名">
        <input class="med-dose" v-model="med.dose" placeholder="剂量">
        <select class="med-time" v-model="med.time">
          <option value="">时间</option>
          <option v-for="t in medTimes" :key="t" :value="t">{{ t }}</option>
        </select>
        <button type="button" class="med-del" @click="meds.splice(idx, 1)">×</button>
      </div>

      <div class="chips-label" v-if="availableMeds.length">常用</div>
      <div class="chips">
        <button
          v-for="m in availableMeds"
          :key="m"
          type="button"
          class="chip ghost"
          @click="addMedQuick(m)"
        >+ {{ m }}</button>
      </div>
    </section>

    <!-- 症状 -->
    <section class="panel">
      <div class="panel-head">
        <h2>症状</h2>
        <span class="panel-hint">可多选</span>
      </div>
      <div class="chips">
        <button
          v-for="s in symptoms"
          :key="s"
          type="button"
          class="chip"
          :class="{ active: symptomOn.includes(s) }"
          @click="toggleSymptom(s)"
        >{{ s }}</button>
      </div>
      <input class="symptom-other" v-model="symptomOther" placeholder="其它症状（多个用顿号分隔）">
    </section>

    <!-- 备注 -->
    <section class="panel">
      <div class="panel-head">
        <h2>备注</h2>
        <span class="panel-hint">{{ note.length }}/500</span>
      </div>
      <textarea v-model="note" maxlength="500" rows="3" placeholder="如饮食、活动、不适等（选填）"></textarea>
    </section>

    <button type="button" class="delete-day" @click="deleteDay">删除这一天的记录</button>

    <button type="button" class="save-btn" :disabled="saving" @click="save">
      {{ saving ? '保存中...' : '更新记录' }}
    </button>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script>
import {
  initSQLite,
  getTreatmentRecordFromSQLite,
  saveTreatmentRecordToSQLite,
  getBpMeasurementsFromSQLite,
  saveBpMeasurementsToSQLite,
  getPdExchangesFromSQLite,
  savePdExchangesToSQLite,
  getMedicationsFromSQLite,
  saveMedicationsToSQLite,
  getWaterIntakeFromSQLite,
  setDailyWaterTotal,
  getLatestWeightBeforeFromSQLite,
  deleteDayRecordsFromSQLite
} from './utils/sqliteDb.js';
import {
  PD_BRANDS,
  PD_CONCENTRATIONS,
  SYMPTOMS,
  COMMON_MEDS,
  MED_TIMES,
  DEFAULT_GOALS
} from './utils/pdConstants.js';
import { loadProtocol, buildPdList, summaryLines } from './utils/protocol.js';

function toLocalISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function numOf(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function num(value) {
  const n = numOf(value);
  return n === null ? 0 : n;
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function nowTime() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default {
  name: 'RecordPage',
  data() {
    const today = toLocalISO(new Date());
    return {
      selectedDate: today,
      brands: PD_BRANDS,
      concentrations: PD_CONCENTRATIONS,
      symptoms: SYMPTOMS,
      medTimes: MED_TIMES,
      goals: { ...DEFAULT_GOALS },
      protocol: loadProtocol(),
      bpList: [],
      intake: { water: '', other: '' },
      output: { urine: '', other: '' },
      pdList: [],
      weight: '',
      lastWeight: '',
      meds: [],
      symptomOn: [],
      symptomOther: '',
      note: '',
      loadedPdCount: 0,
      saving: false,
      toast: '',
      toastTimer: null
    };
  },
  computed: {
    isToday() {
      return this.selectedDate === toLocalISO(new Date());
    },
    dateLabel() {
      const d = new Date(`${this.selectedDate}T00:00:00`);
      const text = `${d.getMonth() + 1}月${d.getDate()}日`;
      return this.isToday ? `${text}（今天）` : text;
    },
    weekdayLabel() {
      const d = new Date(`${this.selectedDate}T00:00:00`);
      return `周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`;
    },
    icoList() {
      return this.pdList.filter(it => String(it.conc || '').includes('艾考糊精'));
    },
    apdList() {
      return this.pdList.filter(it => !String(it.conc || '').includes('艾考糊精') && it.mode === 'APD 自动腹膜透析');
    },
    manualList() {
      return this.pdList.filter(it => !String(it.conc || '').includes('艾考糊精') && it.mode !== 'APD 自动腹膜透析');
    },
    sum() {
      let pdIn = 0;
      let pdOut = 0;
      this.pdList.forEach(it => {
        pdIn += num(it.volumeIn);
        pdOut += num(it.volumeOut);
      });
      const totalIntake = num(this.intake.water) + num(this.intake.other);
      const totalOutput = num(this.output.urine) + num(this.output.other) + pdOut;
      const uf = pdOut - pdIn;
      return {
        pdIn: round(pdIn),
        pdOut: round(pdOut),
        uf: round(uf),
        ufText: uf > 0 ? `+${round(uf)}` : String(round(uf)),
        totalIntake: round(totalIntake),
        totalOutput: round(totalOutput),
        balance: round(totalOutput - totalIntake)
      };
    },
    apdSum() {
      const list = this.apdList;
      const inVol = list.reduce((s, it) => s + num(it.volumeIn), 0);
      const outVol = list.reduce((s, it) => s + num(it.volumeOut), 0);
      const uf = outVol - inVol;
      return {
        in: round(inVol),
        out: round(outVol),
        uf: round(uf),
        ufText: uf > 0 ? `+${round(uf)}` : String(round(uf))
      };
    },
    icoSum() {
      const list = this.icoList;
      const inVol = list.reduce((s, it) => s + num(it.volumeIn), 0);
      const outVol = list.reduce((s, it) => s + num(it.volumeOut), 0);
      const uf = outVol - inVol;
      return {
        in: round(inVol),
        out: round(outVol),
        uf: round(uf),
        ufText: uf > 0 ? `+${round(uf)}` : String(round(uf))
      };
    },
    protocolLines() {
      return summaryLines(this.protocol);
    },
    availableMeds() {
      const names = this.meds.map(m => m.name);
      return COMMON_MEDS.filter(m => !names.includes(m));
    }
  },
  watch: {
    selectedDate() {
      this.load();
    }
  },
  mounted() {
    this.load();
    const hash = this.$route.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 260);
    }
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  },
  methods: {
    async load() {
      try {
        await initSQLite();
        this.goals = {
          ...DEFAULT_GOALS,
          waterMax: Number(localStorage.getItem('waterLimit')) || DEFAULT_GOALS.waterMax
        };
        this.protocol = loadProtocol();

        const [record, bps, pdRows, meds, waterRows, last] = await Promise.all([
          getTreatmentRecordFromSQLite(this.selectedDate),
          getBpMeasurementsFromSQLite(this.selectedDate),
          getPdExchangesFromSQLite(this.selectedDate),
          getMedicationsFromSQLite(this.selectedDate),
          getWaterIntakeFromSQLite(this.selectedDate),
          getLatestWeightBeforeFromSQLite(this.selectedDate)
        ]);

        const rec = record || {};
        this.bpList = (bps || []).length > 0
          ? bps.map(m => ({
            time: m.time || '',
            sbp: m.systolic === null ? '' : String(m.systolic),
            dbp: m.diastolic === null ? '' : String(m.diastolic),
            hr: m.heartRate === null ? '' : String(m.heartRate)
          }))
          : (String(rec.bloodPressure || '').trim() !== ''
            ? [{
              time: this.recordTime(rec),
              sbp: String(rec.bloodPressure).split('/')[0] || '',
              dbp: String(rec.bloodPressure).split('/')[1] || '',
              hr: rec.heartRate === null ? '' : String(rec.heartRate || '')
            }]
            : []);

        this.pdList = (pdRows || []).map(row => ({
          localId: `db-${row.id}`,
          time: row.time || '',
          brand: row.brand || '',
          conc: row.conc || '',
          mode: row.mode || '',
          dwell: row.dwell || '',
          volumeIn: row.volumeIn === null ? '' : String(row.volumeIn),
          volumeOut: row.volumeOut === null ? '' : String(row.volumeOut),
          cycleNo: Number(row.cycleNo) || 0,
          cycleTotal: Number(row.cycleTotal) || 0,
          nextDay: !!row.nextDay
        }));
        this.loadedPdCount = this.pdList.length;

        this.weight = (String(rec.weight ?? '').trim() === '') ? '' : String(rec.weight);
        this.intake.water = waterRows && waterRows.length > 0
          ? String(round(waterRows.reduce((s, r) => s + num(r.amount), 0)))
          : (String(rec.waterIntake ?? '').trim() === '' ? '' : String(rec.waterIntake));
        this.intake.other = String(rec.otherIntake ?? '').trim() === '' ? '' : String(rec.otherIntake);
        this.output.urine = String(rec.urineOutput ?? '').trim() === '' ? '' : String(rec.urineOutput);
        this.output.other = String(rec.otherOutput ?? '').trim() === '' ? '' : String(rec.otherOutput);
        this.note = rec.note || '';

        const savedSymptoms = this.parseSymptoms(rec.symptoms);
        this.symptomOn = savedSymptoms.filter(s => SYMPTOMS.includes(s));
        this.symptomOther = savedSymptoms.filter(s => !SYMPTOMS.includes(s)).join('、');

        this.meds = (meds || []).map(m => ({ name: m.name || '', dose: m.dose || '', time: m.time || '' }));
        this.lastWeight = last ? last.weight : '';
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 加载记录失败: ${error.message}`);
      }
    },
    recordTime(record) {
      if (!record || !record.updatedAt) return '';
      const d = new Date(record.updatedAt);
      if (isNaN(d.getTime())) return '';
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    },
    parseSymptoms(raw) {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (error) {
        return String(raw).split(/[、,，\s]+/).filter(Boolean);
      }
    },
    shiftDate(offset) {
      const d = new Date(`${this.selectedDate}T00:00:00`);
      d.setDate(d.getDate() + offset);
      const next = toLocalISO(d);
      if (next > toLocalISO(new Date())) return;
      this.selectedDate = next;
    },
    addBp() {
      this.bpList.push({ time: nowTime(), sbp: '', dbp: '', hr: '' });
    },
    removeBp(index) {
      this.bpList.splice(index, 1);
    },
    bpWarning(m) {
      const parts = [];
      const sbp = numOf(m.sbp);
      const dbp = numOf(m.dbp);
      const hr = numOf(m.hr);
      if (sbp !== null && sbp > this.goals.sbpMax) parts.push(`收缩压 ${sbp} mmHg，高于 ${this.goals.sbpMax}`);
      if (dbp !== null && dbp > this.goals.dbpMax) parts.push(`舒张压 ${dbp} mmHg，高于 ${this.goals.dbpMax}`);
      if (hr !== null && (hr > this.goals.hrMax || hr < this.goals.hrMin)) {
        parts.push(`心率 ${hr} 次/分，参考 ${this.goals.hrMin}-${this.goals.hrMax}`);
      }
      return parts.join('；');
    },
    addWater(amount) {
      this.intake.water = String(round(num(this.intake.water) + amount));
    },
    addPd(kind) {
      if (kind === 'apd') {
        const night = this.protocol.night || {};
        const count = this.apdList.length;
        const item = {
          localId: uid(),
          time: count === 0 ? (night.startTime || '20:00') : '',
          brand: night.brand || PD_BRANDS[1],
          conc: night.conc || PD_CONCENTRATIONS[0],
          mode: 'APD 自动腹膜透析',
          dwell: `${night.hours || 2}h`,
          volumeIn: night.volumeIn ? String(night.volumeIn) : '',
          volumeOut: '',
          cycleNo: count + 1,
          cycleTotal: count + 1,
          nextDay: false
        };
        if (count > 0) {
          const last = this.apdList[count - 1];
          const [h, m] = (last.time || '20:00').split(':').map(Number);
          const next = new Date();
          next.setHours(h + (Number(night.hours) || 2), m, 0, 0);
          item.time = `${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
          item.nextDay = next.getDate() !== new Date().getDate() || next.getDay() !== new Date().getDay();
        }
        this.pdList.push(item);
        this.normalizeApd();
        return;
      }
      this.pdList.push({
        localId: uid(),
        time: nowTime(),
        brand: PD_BRANDS[1],
        conc: PD_CONCENTRATIONS[0],
        mode: 'CAPD 手工换液',
        dwell: '4h',
        volumeIn: '',
        volumeOut: '',
        cycleNo: 0,
        cycleTotal: 0,
        nextDay: false
      });
    },
    normalizeApd() {
      const apd = this.apdList;
      apd.forEach((it, index) => {
        it.cycleNo = index + 1;
        it.cycleTotal = apd.length;
      });
    },
    removePd(item) {
      this.pdList = this.pdList.filter(it => it.localId !== item.localId);
      this.normalizeApd();
    },
    ufOf(item) {
      return num(item.volumeOut) - num(item.volumeIn);
    },
    ufText(item) {
      if (numOf(item.volumeIn) === null && numOf(item.volumeOut) === null) return '—';
      const uf = this.ufOf(item);
      return uf > 0 ? `+${round(uf)}` : String(round(uf));
    },
    signed(value) {
      return value > 0 ? `+${value}` : String(value);
    },
    applyProtocol() {
      if (!this.protocolLines.length) {
        this.showToast('请先配置治疗方案');
        this.$router.push('/protocol');
        return;
      }
      if (this.pdList.length && !window.confirm('套用方案将覆盖当前换液记录，是否继续？')) return;
      this.pdList = buildPdList(this.protocol);
      this.loadedPdCount = this.pdList.length;
      this.showToast('已按方案生成换液条目');
    },
    batchFillApd() {
      const volumeIn = num(this.protocol.night && this.protocol.night.volumeIn);
      if (!volumeIn) {
        this.showToast('请先在方案里设置夜间灌入量');
        return;
      }
      let filled = 0;
      this.apdList.forEach(it => {
        if (numOf(it.volumeIn) === null) {
          it.volumeIn = String(volumeIn);
          filled++;
        }
      });
      this.showToast(filled ? `已填入 ${volumeIn} ml × ${filled}` : '入量都已填过啦');
    },
    batchFillIco() {
      const volumeIn = num(this.protocol.day && this.protocol.day.volumeIn);
      if (!volumeIn) {
        this.showToast('请先在方案里设置白天灌入量');
        return;
      }
      let filled = 0;
      this.icoList.forEach(it => {
        if (numOf(it.volumeIn) === null) {
          it.volumeIn = String(volumeIn);
          filled++;
        }
      });
      this.showToast(filled ? `已填入 ${volumeIn} ml × ${filled}` : '入量都已填过啦');
    },
    addEmptyMed() {
      this.meds.push({ name: '', dose: '', time: '' });
    },
    addMedQuick(name) {
      this.meds.push({ name, dose: '', time: '' });
    },
    toggleSymptom(name) {
      if (this.symptomOn.includes(name)) {
        this.symptomOn = this.symptomOn.filter(s => s !== name);
      } else {
        this.symptomOn = [...this.symptomOn, name];
      }
    },
    showToast(text) {
      this.toast = text;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toast = ''; }, 2200);
    },
    async save() {
      if (this.saving) return;
      this.saving = true;
      try {
        const cleanBp = this.bpList
          .filter(m => numOf(m.sbp) !== null || numOf(m.dbp) !== null || numOf(m.hr) !== null)
          .map(m => ({
            time: m.time,
            systolic: numOf(m.sbp),
            diastolic: numOf(m.dbp),
            heartRate: numOf(m.hr)
          }));

        let bloodPressure = '';
        let heartRate = '';
        if (cleanBp.length > 0) {
          const latest = cleanBp[cleanBp.length - 1];
          if (latest.systolic !== null || latest.diastolic !== null) {
            bloodPressure = `${latest.systolic ?? ''}/${latest.diastolic ?? ''}`;
          }
          heartRate = latest.heartRate === null ? '' : String(latest.heartRate);
        }

        const cleanPd = this.pdList
          .filter(it => it.brand || numOf(it.volumeIn) !== null || numOf(it.volumeOut) !== null)
          .map(it => ({
            time: it.time || '',
            brand: it.brand || '',
            conc: it.conc || '',
            mode: it.mode || '',
            dwell: it.dwell || '',
            volumeIn: numOf(it.volumeIn),
            volumeOut: numOf(it.volumeOut),
            cycleNo: it.cycleNo || 0,
            cycleTotal: it.cycleTotal || 0,
            nextDay: !!it.nextDay
          }));

        const symptoms = [...this.symptomOn];
        String(this.symptomOther || '')
          .split(/[、,，\s]+/)
          .filter(Boolean)
          .forEach(s => {
            if (!symptoms.includes(s)) symptoms.push(s);
          });

        const waterValue = numOf(this.intake.water);
        const payload = {
          date: this.selectedDate,
          weekday: this.weekdayOf(this.selectedDate),
          bloodPressure,
          heartRate,
          waterIntake: waterValue === null ? '' : String(waterValue),
          otherIntake: numOf(this.intake.other) === null ? '' : numOf(this.intake.other),
          urineOutput: numOf(this.output.urine) === null ? '' : numOf(this.output.urine),
          otherOutput: numOf(this.output.other) === null ? '' : numOf(this.output.other),
          weight: this.weight === '' || this.weight === null ? '' : Number(this.weight).toFixed(2),
          note: this.note,
          symptoms: JSON.stringify(symptoms)
        };

        if (cleanPd.length > 0) {
          const pdIn = this.sum.pdIn;
          const pdOut = this.sum.pdOut;
          payload.totalTreatmentVolume = String(pdIn);
          payload.machineTotalFlow = String(this.apdSum.uf);
          payload.machinePlusManualFlow = String(this.sum.uf);
          payload.cycleCount = String(this.apdList.length);
          payload.dayManualInjection = String(this.icoSum.in + this.manualList.reduce((s, it) => s + num(it.volumeIn), 0));
          payload.dayUltrafiltration = String(this.icoSum.uf + this.manualList.reduce((s, it) => s + this.ufOf(it), 0));
          payload.zeroCircleFlow = String(this.icoSum.uf);
        } else if (this.loadedPdCount > 0) {
          payload.totalTreatmentVolume = '';
          payload.machineTotalFlow = '';
          payload.machinePlusManualFlow = '';
          payload.cycleCount = '';
          payload.dayManualInjection = '';
          payload.dayUltrafiltration = '';
          payload.zeroCircleFlow = '';
        }

        const result = await saveTreatmentRecordToSQLite(payload);
        if (!result.success) {
          this.showToast('保存失败，请重试');
          return;
        }
        await saveBpMeasurementsToSQLite(this.selectedDate, cleanBp);
        await savePdExchangesToSQLite(this.selectedDate, cleanPd);
        await saveMedicationsToSQLite(this.selectedDate, this.meds);
        await setDailyWaterTotal(this.selectedDate, waterValue || 0);
        this.loadedPdCount = cleanPd.length;
        this.showToast('记录已更新');
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 保存记录失败: ${error.message}`);
        this.showToast('保存失败，请重试');
      } finally {
        this.saving = false;
      }
    },
    async deleteDay() {
      if (!window.confirm(`确定删除 ${this.dateLabel} 的治疗、血压、换液和用药记录吗？喝水记录会保留。`)) return;
      const result = await deleteDayRecordsFromSQLite(this.selectedDate);
      if (result.success) {
        this.showToast('已删除');
        this.$router.replace('/');
      } else {
        this.showToast('删除失败，请重试');
      }
    },
    weekdayOf(date) {
      const d = new Date(`${date}T00:00:00`);
      return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    }
  }
};
</script>

<style scoped>
.record-page {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding-bottom: 200px;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 60;
  background: #ffffff;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  text-align: center;
  border-bottom: 1px solid #f0f2f5;
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2430;
}

.date-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 6px;
}

.date-nav {
  border: none;
  background: #e9edf6;
  color: #5b6b8c;
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 8px;
}

.date-nav:disabled {
  opacity: 0.4;
}

.date-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.date-main {
  font-size: 16px;
  font-weight: 600;
  color: #1f2430;
}

.date-week {
  font-size: 11px;
  color: #9aa0a6;
}

.panel {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin: 10px 12px 0;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.05);
  scroll-margin-top: 72px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2430;
}

.panel-hint {
  font-size: 11px;
  color: #9aa0a6;
}

.add-one {
  border: none;
  background: none;
  color: #3d7ff0;
  font-size: 12px;
  padding: 2px 0;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.mini-link {
  border: none;
  background: #eef3ff;
  color: #3d7ff0;
  font-size: 11px;
  padding: 5px 9px;
  border-radius: 8px;
}

.measure-card {
  background: #f7f8fb;
  border-radius: 12px;
  padding: 10px 10px 12px;
  margin-bottom: 10px;
}

.measure-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.time-input {
  border: none;
  background: #e9eefb;
  color: #4a6fb5;
  font-size: 12px;
  border-radius: 7px;
  padding: 5px 10px;
  outline: none;
}

.del {
  border: none;
  background: none;
  color: #b0b5bd;
  font-size: 12px;
  padding: 2px 4px;
}

.measure-inputs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.measure-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-box {
  display: flex;
  align-items: baseline;
  background: #ffffff;
  border-radius: 10px;
  padding: 9px 8px 7px;
  box-shadow: inset 0 0 0 1px #e8ebf1;
}

.field-box input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 19px;
  font-weight: 700;
  color: #232936;
  padding: 0;
}

.field-box i {
  font-style: normal;
  font-size: 9px;
  color: #9aa0a6;
  margin-left: 2px;
  white-space: nowrap;
}

.field-name {
  font-size: 10px;
  color: #9aa0a6;
  text-align: center;
}

.slash {
  color: #c3c8d2;
  font-size: 16px;
  padding-bottom: 22px;
}

.warning {
  margin-top: 9px;
  background: #fff6e5;
  color: #c58a2b;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
  padding: 7px 10px;
}

.warning-dot {
  font-size: 9px;
  margin-right: 5px;
}

.empty {
  text-align: center;
  color: #b3b8c2;
  font-size: 12px;
  padding: 16px 0;
}

.intake-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #f2f4f7;
}

.intake-row.big {
  border-top: none;
  padding-top: 2px;
}

.intake-label span {
  display: block;
  font-size: 14px;
  color: #3c4250;
}

.intake-label i {
  display: block;
  font-style: normal;
  font-size: 10px;
  color: #9aa0a6;
  margin-top: 2px;
}

.intake-input {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.intake-input input {
  width: 96px;
  border: none;
  background: transparent;
  text-align: right;
  font-size: 20px;
  font-weight: 600;
  color: #232936;
  outline: none;
  padding: 0;
}

.intake-row.big .intake-input input {
  font-size: 26px;
  font-weight: 700;
}

.intake-input span,
.intake-value span {
  font-size: 11px;
  color: #9aa0a6;
}

.intake-value {
  font-size: 18px;
  font-weight: 600;
  color: #232936;
}

.quick-chips {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
}

.quick-chips button {
  flex: 1;
  border: none;
  background: #f1f3f8;
  color: #5f6673;
  font-size: 12px;
  border-radius: 18px;
  padding: 8px 0;
}

.quick-chips button.clear {
  color: #9aa0a6;
  background: #fafbfd;
  box-shadow: inset 0 0 0 1px #eceef2;
}

.totals {
  display: flex;
  background: #f4f7ff;
  border-radius: 12px;
  padding: 12px 8px;
  margin-top: 8px;
}

.total-item {
  flex: 1;
  text-align: center;
}

.total-item span {
  display: block;
  font-size: 11px;
  color: #8b919c;
}

.total-item b {
  display: block;
  margin-top: 2px;
  font-size: 17px;
  font-weight: 700;
  color: #232936;
}

.total-item b.blue { color: #3d7ff0; }
.total-item b.red { color: #e0574a; }

.protocol-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #f4f7ff;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.protocol-lines {
  flex: 1;
  min-width: 0;
}

.protocol-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  color: #3c4250;
  line-height: 1.7;
}

.protocol-line .tag {
  background: #e3ebff;
  color: #4f7df3;
  font-size: 10px;
  border-radius: 5px;
  padding: 1px 5px;
}

.protocol-line .sub {
  color: #9aa0a6;
  font-size: 10px;
}

.protocol-empty {
  font-size: 12px;
  color: #9aa0a6;
}

.config-link {
  border: none;
  background: none;
  color: #4f7df3;
  font-size: 12px;
  white-space: nowrap;
  padding: 0;
}

.uf-grid {
  display: flex;
  background: #f8f9fc;
  border-radius: 12px;
  padding: 12px 8px;
  margin-bottom: 12px;
}

.uf-cell {
  flex: 1;
  text-align: center;
}

.uf-label {
  display: block;
  font-size: 10px;
  color: #8b919c;
}

.uf-cell b {
  display: block;
  margin-top: 3px;
  font-size: 16px;
  font-weight: 700;
  color: #232936;
}

.uf-cell b.primary { color: #3d7ff0; }
.uf-cell b.danger { color: #e0574a; }

.uf-cell i {
  font-style: normal;
  font-size: 10px;
  color: #9aa0a6;
  margin-left: 2px;
}

.sub-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #3c4250;
  padding: 10px 0 8px;
  border-top: 1px solid #f2f4f7;
  margin-top: 4px;
}

.sub-title.no-border {
  border-top: none;
  padding: 0;
  margin: 0;
}

.sub-title span {
  font-size: 13px;
}

.apd-sub {
  font-style: normal;
  font-size: 10px;
  color: #9aa0a6;
  margin-left: 4px;
}

.link {
  border: none;
  background: none;
  color: #3d7ff0;
  font-size: 11px;
  padding: 0;
}

.pd-card {
  background: #fafbfd;
  border: 1px solid #eef0f5;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 10px;
}

.pd-card.ico-card {
  background: #f7f4ff;
  border-color: #eee7ff;
}

.pd-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.kind-chip {
  flex: 1;
  font-size: 10px;
  color: #8b919c;
}

.kind-chip.ico {
  color: #7a5af8;
}

.pd-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.pd-grid .wide {
  grid-column: span 2;
}

.pd-grid label,
.pd-uf {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.pd-grid label span,
.pd-uf span {
  font-size: 10px;
  color: #9aa0a6;
}

.pd-grid input,
.pd-grid select {
  width: 100%;
  border: none;
  background: #ffffff;
  border-radius: 8px;
  height: 32px;
  padding: 0 7px;
  font-size: 12px;
  color: #232936;
  outline: none;
  box-shadow: inset 0 0 0 1px #e8ebf1;
}

.pd-grid input[type='number'] {
  text-align: right;
}

.pd-uf b {
  font-size: 14px;
  line-height: 32px;
  text-align: right;
  font-weight: 700;
  color: #8b919c;
}

.pd-uf b.primary { color: #3d7ff0; }
.pd-uf b.danger { color: #e0574a; }

.apd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 8px;
  border-top: 1px solid #f2f4f7;
  margin-top: 4px;
}

.apd-table {
  background: #f4f7ff;
  border-radius: 12px;
  padding: 6px;
}

.apd-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 4px;
}

.apd-row-head {
  font-size: 10px;
  color: #9aa0a6;
  padding-bottom: 2px;
}

.apd-row .c-no {
  width: 22px;
  flex: 0 0 22px;
  text-align: center;
}

.apd-row .c-no.badge {
  background: #e3ebff;
  color: #4f7df3;
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 0;
}

.apd-row .c-time {
  width: 74px;
  flex: 0 0 74px;
  position: relative;
}

.apd-row .c-time input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  color: #4a5160;
  padding: 0;
  text-align: center;
}

.next-day {
  position: absolute;
  right: 0;
  top: 11px;
  font-style: normal;
  font-size: 8px;
  color: #c58a2b;
}

.apd-row .c-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: none;
  background: #ffffff;
  border-radius: 7px;
  padding: 0 4px;
  font-size: 12px;
  text-align: center;
  color: #232936;
  outline: none;
}

.apd-row .c-uf {
  width: 42px;
  flex: 0 0 42px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: #8b919c;
}

.apd-row .c-uf.primary { color: #3d7ff0; }
.apd-row .c-uf.danger { color: #e0574a; }

.apd-row .c-del {
  width: 16px;
  flex: 0 0 16px;
  border: none;
  background: none;
  color: #c3c8d2;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.pd-foot {
  display: flex;
  background: #f8f9fc;
  border-radius: 12px;
  padding: 10px 8px;
  margin-top: 8px;
}

.pd-foot > div {
  flex: 1;
  text-align: center;
}

.pd-foot span {
  display: block;
  font-size: 10px;
  color: #8b919c;
}

.pd-foot b {
  display: block;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  color: #232936;
}

.pd-foot b.primary { color: #3d7ff0; }

.pd-foot i {
  font-style: normal;
  font-size: 9px;
  color: #9aa0a6;
  margin-left: 2px;
}

.panel-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1f2430;
  margin-bottom: 12px;
}

.weight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.weight-label {
  font-size: 13px;
  color: #6b7280;
}

.weight-input {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.weight-input input {
  width: 110px;
  border: none;
  border-bottom: 1px solid #e3e6ec;
  background: transparent;
  text-align: right;
  font-size: 24px;
  font-weight: 700;
  color: #232936;
  padding: 0 0 2px;
  outline: none;
}

.weight-input i {
  font-style: normal;
  font-size: 11px;
  color: #9aa0a6;
}

.last-weight {
  margin-top: 12px;
  border: 1px solid #e3e6ec;
  background: #fafbfd;
  color: #8b919c;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 18px;
}

.med-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.med-row input,
.med-row select {
  border: 1px solid #e8ebf1;
  background: #ffffff;
  border-radius: 9px;
  height: 36px;
  padding: 0 8px;
  font-size: 12px;
  color: #232936;
  outline: none;
}

.med-name {
  flex: 1.4;
  min-width: 0;
}

.med-dose {
  flex: 0.8;
  min-width: 0;
}

.med-time {
  flex: 1;
  min-width: 0;
  background: #f7f8fb;
}

.med-del {
  width: 22px;
  flex: 0 0 22px;
  border: none;
  background: none;
  color: #c3c8d2;
  font-size: 16px;
  padding: 0;
}

.chips-label {
  margin: 12px 0 8px;
  font-size: 11px;
  color: #9aa0a6;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: none;
  background: #f1f3f8;
  color: #5f6673;
  border-radius: 18px;
  padding: 8px 14px;
  font-size: 12px;
}

.chip.ghost {
  background: #ffffff;
  border: 1px dashed #dfe3ea;
  color: #8b919c;
}

.chip.active {
  background: #4f7df3;
  color: #ffffff;
}

.symptom-other {
  width: 100%;
  border: 1px solid #e8ebf1;
  border-radius: 10px;
  height: 38px;
  padding: 0 12px;
  font-size: 12px;
  color: #232936;
  outline: none;
  margin-top: 12px;
}

textarea {
  width: 100%;
  border: 1px solid #e8ebf1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: #232936;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}

.delete-day {
  display: block;
  margin: 18px auto 0;
  border: none;
  background: none;
  color: #e0574a;
  font-size: 13px;
  padding: 8px;
}

.save-btn {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  height: 48px;
  border: none;
  border-radius: 12px;
  background: #4f7df3;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(79, 125, 243, 0.32);
  z-index: 110;
}

.save-btn:disabled {
  opacity: 0.7;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(138px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  background: rgba(31, 36, 48, 0.88);
  color: #ffffff;
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 20px;
  z-index: 120;
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
