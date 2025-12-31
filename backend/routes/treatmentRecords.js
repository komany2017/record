const express = require('express');
const router = express.Router();
const db = require('../db');

// 转换字段名（前端驼峰命名法到数据库下划线命名法）
const transformToDB = (data) => {
  const dbData = {
    date: data.date,
    weekday: data.weekday,
    blood_pressure: data.bloodPressure,
    weight: data.weight,
    zero_circle_flow: data.zeroCircleFlow,
    machine_total_flow: data.machineTotalFlow,
    day_manual_injection: data.dayManualInjection,
    day_injection_concentration: data.dayInjectionConcentration,
    day_ultrafiltration: data.dayUltrafiltration,
    water_intake: data.waterIntake
  };
  
  // 计算机器+手工总超滤量
  if (dbData.machine_total_flow !== undefined && dbData.day_manual_injection !== undefined) {
    dbData.machine_plus_manual_flow = dbData.machine_total_flow + dbData.day_manual_injection;
  }
  
  return dbData;
};

// 转换字段名（数据库下划线命名法到前端驼峰命名法）
const transformToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    date: data.date,
    weekday: data.weekday,
    bloodPressure: data.blood_pressure,
    weight: data.weight,
    heatingBag: data.heating_bag,
    supplementBag: data.supplement_bag,
    treatmentMethod: data.treatment_method,
    totalTreatmentVolume: data.total_treatment_volume,
    treatmentTime: data.treatment_time,
    singleInjectionVolume: data.single_injection_volume,
    lastBagInjectionVolume: data.last_bag_injection_volume,
    cycleCount: data.cycle_count,
    zeroCircleFlow: data.zero_circle_flow,
    machineTotalFlow: data.machine_total_flow,
    dayManualInjection: data.day_manual_injection,
    dayInjectionConcentration: data.day_injection_concentration,
    dayUltrafiltration: data.day_ultrafiltration,
    machinePlusManualFlow: data.machine_plus_manual_flow,
    waterIntake: data.water_intake,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// 创建或更新治疗记录
router.post('/', (req, res) => {
  try {
    const dbData = transformToDB(req.body);
    
    // 检查是否已存在相同日期的记录
    db.get('SELECT * FROM treatment_records WHERE date = ?', [dbData.date], (err, row) => {
      if (err) {
        console.error('查询治疗记录失败:', err);
        return res.status(500).json({ success: false, message: '保存治疗记录失败' });
      }
      
      if (row) {
        // 更新现有记录
        const updateQuery = `
          UPDATE treatment_records SET 
            weekday = ?, blood_pressure = ?, weight = ?, 
            zero_circle_flow = ?, machine_total_flow = ?, day_manual_injection = ?, 
            day_injection_concentration = ?, day_ultrafiltration = ?, machine_plus_manual_flow = ?, 
            water_intake = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE date = ?
        `;
        
        const updateParams = [
          dbData.weekday, dbData.blood_pressure, dbData.weight,
          dbData.zero_circle_flow, dbData.machine_total_flow, dbData.day_manual_injection,
          dbData.day_injection_concentration, dbData.day_ultrafiltration, dbData.machine_plus_manual_flow,
          dbData.water_intake, dbData.date
        ];
        
        db.run(updateQuery, updateParams, function(err) {
          if (err) {
            console.error('更新治疗记录失败:', err);
            return res.status(500).json({ success: false, message: '保存治疗记录失败' });
          }
          
          // 获取更新后的记录
          db.get('SELECT * FROM treatment_records WHERE date = ?', [dbData.date], (err, updatedRow) => {
            if (err) {
              console.error('获取更新后记录失败:', err);
              return res.status(500).json({ success: false, message: '保存治疗记录失败' });
            }
            
            res.json({
              success: true,
              message: '治疗记录已更新',
              data: transformToFrontend(updatedRow)
            });
          });
        });
      } else {
        // 创建新记录
        const insertQuery = `
          INSERT INTO treatment_records (
            date, weekday, blood_pressure, weight, zero_circle_flow, machine_total_flow, 
            day_manual_injection, day_injection_concentration, day_ultrafiltration, 
            machine_plus_manual_flow, water_intake
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertParams = [
          dbData.date, dbData.weekday, dbData.blood_pressure, dbData.weight, dbData.zero_circle_flow,
          dbData.machine_total_flow, dbData.day_manual_injection, dbData.day_injection_concentration,
          dbData.day_ultrafiltration, dbData.machine_plus_manual_flow, dbData.water_intake
        ];
        
        db.run(insertQuery, insertParams, function(err) {
          if (err) {
            console.error('插入治疗记录失败:', err);
            return res.status(500).json({ success: false, message: '保存治疗记录失败' });
          }
          
          // 获取插入后的记录
          db.get('SELECT * FROM treatment_records WHERE id = ?', [this.lastID], (err, newRow) => {
            if (err) {
              console.error('获取新记录失败:', err);
              return res.status(500).json({ success: false, message: '保存治疗记录失败' });
            }
            
            res.json({
              success: true,
              message: '治疗记录已保存',
              data: transformToFrontend(newRow)
            });
          });
        });
      }
    });
  } catch (error) {
    console.error('保存治疗记录失败:', error);
    res.status(500).json({ success: false, message: '保存治疗记录失败' });
  }
});

// 根据日期获取治疗记录
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    
    db.get('SELECT * FROM treatment_records WHERE date = ?', [date], (err, row) => {
      if (err) {
        console.error('获取治疗记录失败:', err);
        return res.status(500).json({ success: false, message: '获取治疗记录失败' });
      }
      
      res.json({
        success: true,
        data: transformToFrontend(row)
      });
    });
  } catch (error) {
    console.error('获取治疗记录失败:', error);
    res.status(500).json({ success: false, message: '获取治疗记录失败' });
  }
});

// 获取所有治疗记录
router.get('/', (req, res) => {
  try {
    db.all('SELECT * FROM treatment_records ORDER BY date', [], (err, rows) => {
      if (err) {
        console.error('获取所有治疗记录失败:', err);
        return res.status(500).json({ success: false, message: '获取所有治疗记录失败' });
      }
      
      const records = rows.map(transformToFrontend);
      
      res.json({
        success: true,
        data: records
      });
    });
  } catch (error) {
    console.error('获取所有治疗记录失败:', error);
    res.status(500).json({ success: false, message: '获取所有治疗记录失败' });
  }
});

// 获取指定日期范围的治疗记录
router.get('/range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 验证参数
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '请提供起始日期和结束日期' });
    }
    
    db.all(
      'SELECT * FROM treatment_records WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, endDate],
      (err, rows) => {
        if (err) {
          console.error('获取日期范围治疗记录失败:', err);
          return res.status(500).json({ success: false, message: '获取日期范围治疗记录失败' });
        }
        
        const records = rows.map(transformToFrontend);
        
        res.json({
          success: true,
          data: records
        });
      }
    );
  } catch (error) {
    console.error('获取日期范围治疗记录失败:', error);
    res.status(500).json({ success: false, message: '获取日期范围治疗记录失败' });
  }
});

// 删除治疗记录
router.delete('/:date', (req, res) => {
  try {
    const { date } = req.params;
    
    db.run('DELETE FROM treatment_records WHERE date = ?', [date], function(err) {
      if (err) {
        console.error('删除治疗记录失败:', err);
        return res.status(500).json({ success: false, message: '删除治疗记录失败' });
      }
      
      if (this.changes > 0) {
        res.json({ success: true, message: '治疗记录已删除' });
      } else {
        res.status(404).json({ success: false, message: '治疗记录不存在' });
      }
    });
  } catch (error) {
    console.error('删除治疗记录失败:', error);
    res.status(500).json({ success: false, message: '删除治疗记录失败' });
  }
});

module.exports = router;
