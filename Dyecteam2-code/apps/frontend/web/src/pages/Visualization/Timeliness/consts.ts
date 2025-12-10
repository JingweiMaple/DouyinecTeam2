// src/pages/Visualization/Timeliness/consts.ts

export type TimeRangeOption = {
  label: string;
  value: string;
};

export type SelectOption = {
  label: string;
  value: string;
};

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
];

export const REGION_OPTIONS: SelectOption[] = [
  { label: '全国', value: 'all' },
  { label: '华东地区', value: 'east' },
  { label: '华北地区', value: 'north' },
  { label: '华南地区', value: 'south' },
];

export const ORDER_TYPE_OPTIONS: SelectOption[] = [
  { label: '全部订单', value: 'all' },
  { label: '普通订单', value: 'normal' },
  { label: '加急订单', value: 'express' },
];

// 按城市/区域聚合的配送时效统计
export type RegionTimeliness = {
  region: string; // 城市/区域名
  avgHours: number; // 平均配送时长（小时）
  orderCount: number; // 订单量
  onTimeRate: number; // 准时率（0~1）
  area: '华东' | '华北' | '华南';
};

// mock：不同城市的配送时效表现
export const mockRegionStats: RegionTimeliness[] = [
  { region: '上海', avgHours: 21.5, orderCount: 2000, onTimeRate: 0.93, area: '华东' },
  { region: '杭州', avgHours: 24.2, orderCount: 1600, onTimeRate: 0.9, area: '华东' },
  { region: '南京', avgHours: 26.8, orderCount: 900, onTimeRate: 0.88, area: '华东' },
  { region: '北京', avgHours: 27.3, orderCount: 1100, onTimeRate: 0.86, area: '华北' },
  { region: '天津', avgHours: 29.1, orderCount: 700, onTimeRate: 0.84, area: '华北' },
  { region: '广州', avgHours: 25.4, orderCount: 950, onTimeRate: 0.9, area: '华南' },
  { region: '深圳', avgHours: 23.6, orderCount: 1200, onTimeRate: 0.92, area: '华南' },
];

// 用于“按天”的时效趋势（这里先做 7 天的假数据）
export type DailyTimeliness = {
  date: string; // 例如 11-17
  avgHours: number;
  onTimeRate: number;
};

export const mockDailyStats7d: DailyTimeliness[] = [
  { date: '11-17', avgHours: 24.3, onTimeRate: 0.92 },
  { date: '11-18', avgHours: 25.1, onTimeRate: 0.91 },
  { date: '11-19', avgHours: 26.5, onTimeRate: 0.9 },
  { date: '11-20', avgHours: 27.8, onTimeRate: 0.89 },
  { date: '11-21', avgHours: 26.2, onTimeRate: 0.9 },
  { date: '11-22', avgHours: 24.9, onTimeRate: 0.92 },
  { date: '11-23', avgHours: 23.7, onTimeRate: 0.93 },
];

// 系统时效要求（SLA），比如 48 小时内送达算准时
export const SYSTEM_EXPECT_HOURS = 48;
// 准时率达标阈值，比如 90% 以上视为“整体符合系统要求”
export const SYSTEM_ON_TIME_THRESHOLD = 0.9;
