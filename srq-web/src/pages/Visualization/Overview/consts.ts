// src/pages/Visualization/Overview/consts.ts

export type OverviewCard = {
  id: number;
  title: string;
  value: string;
  desc: string;
};

export const overviewCards: OverviewCard[] = [
  {
    id: 1,
    title: '今日订单总量',
    value: '8,520 单',
    desc: '较昨日 +12.4%',
  },
  {
    id: 2,
    title: '今日异常订单数',
    value: '96 单',
    desc: '异常占比约 1.1%',
  },
  {
    id: 3,
    title: '平均配送时长',
    value: '24.7 小时',
    desc: '系统期望 ≤ 48 小时',
  },
  {
    id: 4,
    title: '整体准时率',
    value: '89.8%',
    desc: '达标阈值 ≥ 90%',
  },
];

export type OrderTrendPoint = {
  date: string;
  orders: number;
  abnormalRate: number; // 0~1
};

export const orderTrend7d: OrderTrendPoint[] = [
  { date: '11-17', orders: 7800, abnormalRate: 0.012 },
  { date: '11-18', orders: 8200, abnormalRate: 0.011 },
  { date: '11-19', orders: 8600, abnormalRate: 0.013 },
  { date: '11-20', orders: 9100, abnormalRate: 0.01 },
  { date: '11-21', orders: 8750, abnormalRate: 0.012 },
  { date: '11-22', orders: 8920, abnormalRate: 0.011 },
  { date: '11-23', orders: 9050, abnormalRate: 0.01 },
];

export type ModuleSnapshot = {
  key: 'heatmap' | 'timeliness' | 'abnormal';
  title: string;
  desc: string;
  primaryMetric: string;
  secondary: string;
};

export const moduleSnapshots: ModuleSnapshot[] = [
  {
    key: 'heatmap',
    title: '区域订单密度热力图',
    desc: '从地图维度观察不同区域的订单分布与热点区域。',
    primaryMetric: '热点城市：上海 / 广州 / 杭州',
    secondary: '华东地区订单占比约 46.2%',
  },
  {
    key: 'timeliness',
    title: '配送时效分析',
    desc: '监控整体配送效率与达成率，识别时效波动风险。',
    primaryMetric: '近7天平均配送时长：24.7 小时',
    secondary: '整体准时率：89.8%',
  },
  {
    key: 'abnormal',
    title: '异常订单监控',
    desc: '实时捕捉配送超时、派送失败等异常，并支持下钻处理。',
    primaryMetric: '当前异常订单数：96 单',
    secondary: '其中高危异常：24 单',
  },
];
