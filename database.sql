-- 创建治疗记录表（如果不存在）
CREATE TABLE IF NOT EXISTS treatment_records (
    id SERIAL PRIMARY KEY,
    date VARCHAR(10) NOT NULL UNIQUE, -- 格式：YYYY-MM-DD
    weekday VARCHAR(2) NOT NULL, -- 格式：日、一、二...六
    blood_pressure VARCHAR(20), -- 血压，如：120/80
    weight VARCHAR(10), -- 体重(不带水)
    heating_bag VARCHAR(10) DEFAULT '2.5', -- 加热袋
    supplement_bag VARCHAR(10) DEFAULT '2.5', -- 补充袋
    treatment_method VARCHAR(20) DEFAULT 'IPD', -- 治疗方式
    total_treatment_volume VARCHAR(10) DEFAULT '8000', -- 总治疗量
    treatment_time VARCHAR(10) DEFAULT '10', -- 治疗时间
    single_injection_volume VARCHAR(10) DEFAULT '2000', -- 单次注入量
    last_bag_injection_volume VARCHAR(10) DEFAULT '0', -- 末袋注入量
    cycle_count VARCHAR(10) DEFAULT '4', -- 循环次数
    zero_circle_flow VARCHAR(20), -- 0周期超流量
    machine_total_flow VARCHAR(20), -- 机器总超滤量
    day_manual_injection VARCHAR(10) DEFAULT '2000', -- 日间手工注入量
    day_injection_concentration VARCHAR(50) DEFAULT '艾烤糊精', -- 日间注入浓度
    day_ultrafiltration VARCHAR(20), -- 日间超滤量
    machine_plus_manual_flow VARCHAR(20), -- 机器+手工总超滤量
    water_intake VARCHAR(20), -- 饮水量
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 更新时间
);

-- 创建日期索引，提高查询效率
CREATE INDEX IF NOT EXISTS idx_treatment_records_date ON treatment_records(date);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_treatment_records_updated_at
BEFORE UPDATE ON treatment_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
