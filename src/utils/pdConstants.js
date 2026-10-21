/**
 * 腹透记录常量（与小程序 E:\pd-tracker 保持一致）
 */

export const PD_CONCENTRATIONS = [
  '1.5% 葡萄糖',
  '2.5% 葡萄糖',
  '4.25% 葡萄糖',
  '7.5% 艾考糊精',
  '1.1% 氨基酸',
  '不适用'
];

export const PD_BRANDS = [
  '百特 Extraneal(艾考糊精)',
  '百特 Dianeal',
  '费森尤斯 CAPD/DPCA',
  '费森尤斯 balance',
  '威高',
  '华仁',
  '其他'
];

export const PD_MODES = ['CAPD 手工换液', 'APD 自动腹膜透析', '其它'];

export const DEFAULT_PROTOCOL = {
  enabled: true,
  day: {
    enabled: true,
    label: '白天长留腹',
    brand: '百特 Extraneal(艾考糊精)',
    conc: '7.5% 艾考糊精',
    volumeIn: 2000,
    time: '08:00',
    dwell: '10h'
  },
  night: {
    enabled: true,
    label: '夜间 APD',
    cycles: 4,
    volumeIn: 2000,
    hours: 2,
    startTime: '20:00',
    brand: '百特 Dianeal',
    conc: '1.5% 葡萄糖'
  }
};

export const SYMPTOMS = [
  '水肿', '乏力', '头晕', '胸闷', '气短', '恶心', '呕吐',
  '腹痛', '腹泻', '便秘', '食欲差', '皮肤瘙痒', '抽筋',
  '发热', '透析液浑浊', '出口处红肿', '体重明显增加'
];

export const COMMON_MEDS = [
  '氨氯地平', '硝苯地平', '缬沙坦', '氯沙坦', '培哚普利',
  '美托洛尔', '呋塞米', '螺内酯', '碳酸钙', '复方α酮酸片', '促红素'
];

export const MED_TIMES = ['早餐前', '早餐后', '午餐后', '晚餐后', '睡前', '必要时'];

export const DEFAULT_GOALS = {
  sbpMax: 140,
  dbpMax: 90,
  hrMin: 60,
  hrMax: 100,
  waterMax: 1000,
  ufMin: 1000,
  ufMax: 2000,
  intakeMin: 500,
  intakeMax: 1000
};
