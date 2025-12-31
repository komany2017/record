import Dexie from 'dexie';

// 创建Dexie数据库实例
const db = new Dexie('TreatmentRecordsDB');

// 配置数据库版本和表结构
db.version(1).stores({
  treatmentRecords: 'date, weekday, bloodPressure, weight, zeroCircleFlow, machineTotalFlow, dayManualInjection, dayInjectionConcentration, dayUltrafiltration, machinePlusManualFlow, waterIntake, createdAt, updatedAt'
});

// 保存或更新治疗记录
export async function saveTreatmentRecord(data) {
  try {
    console.log(`[${new Date().toISOString()}] 保存/更新治疗记录，日期: ${data.date}`);
    const record = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 使用date作为主键，存在则更新，不存在则插入
    await db.treatmentRecords.put(record);
    console.log(`[${new Date().toISOString()}] 治疗记录保存/更新成功，日期: ${data.date}`);
    return { success: true, data: record };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 保存治疗记录失败，日期: ${data.date}，错误: ${error.message}`);
    return { success: false, message: '保存治疗记录失败' };
  }
}

// 根据日期获取治疗记录
export async function getTreatmentRecordByDate(date) {
  try {
    console.log(`[${new Date().toISOString()}] 查询指定日期的治疗记录，日期: ${date}`);
    const record = await db.treatmentRecords.get(date);
    console.log(`[${new Date().toISOString()}] 查询完成，${record ? '找到记录' : '未找到记录'}`);
    return record;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 查询治疗记录失败，日期: ${date}，错误: ${error.message}`);
    return null;
  }
}

// 获取所有治疗记录
export async function getAllTreatmentRecords() {
  try {
    console.log(`[${new Date().toISOString()}] 查询所有治疗记录`);
    const records = await db.treatmentRecords.toArray();
    console.log(`[${new Date().toISOString()}] 查询完成，共找到 ${records.length} 条记录`);
    return records;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 查询所有治疗记录失败，错误: ${error.message}`);
    return [];
  }
}

// 删除治疗记录
export async function deleteTreatmentRecord(date) {
  try {
    console.log(`[${new Date().toISOString()}] 删除指定日期的治疗记录，日期: ${date}`);
    await db.treatmentRecords.delete(date);
    console.log(`[${new Date().toISOString()}] 删除治疗记录成功，日期: ${date}`);
    return { success: true, message: '删除治疗记录成功' };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 删除治疗记录失败，日期: ${date}，错误: ${error.message}`);
    return { success: false, message: '删除治疗记录失败' };
  }
}

// 根据日期范围获取治疗记录
export async function getTreatmentRecordsByDateRange(startDate, endDate) {
  try {
    console.log(`[${new Date().toISOString()}] 查询日期范围的治疗记录，开始日期: ${startDate}，结束日期: ${endDate}`);
    const records = await db.treatmentRecords
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    
    console.log(`[${new Date().toISOString()}] 查询完成，共找到 ${records.length} 条记录`);
    return { success: true, data: records };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 查询日期范围治疗记录失败，开始日期: ${startDate}，结束日期: ${endDate}，错误: ${error.message}`);
    return { success: false, message: '获取日期范围治疗记录失败' };
  }
}
