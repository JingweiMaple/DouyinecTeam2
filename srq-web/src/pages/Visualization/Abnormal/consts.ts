// src/pages/Visualization/Abnormal/consts.ts

export type TimeRangeOption = {
  label: string;
  value: string;
};

export type SelectOption = {
  label: string;
  value: string;
};

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: '近2小时', value: '2h' },
  { label: '近24小时', value: '24h' },
  { label: '近7天', value: '7d' },
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

export const ABNORMAL_TYPE_OPTIONS: SelectOption[] = [
  { label: '全部异常', value: 'all' },
  { label: '配送超时', value: 'overtime' },
  { label: '派送失败', value: 'delivery_fail' },
  { label: '物流停滞', value: 'stuck' },
  { label: '退件/改派', value: 'returned' },
  { label: '用户投诉', value: 'complaint' },
];

export type AbnormalType = 'overtime' | 'delivery_fail' | 'stuck' | 'returned' | 'complaint';

export type Severity = 'high' | 'medium' | 'low';

export type AbnormalOrder = {
  id: string; // 订单号
  city: string;
  area: '华东' | '华北' | '华南';
  abnormalType: AbnormalType;
  severity: Severity;
  delayHours: number; // 超时/停滞时长（小时）
  status: string; // 当前状态描述
  triggerTime: string; // 触发时间，例如 '2025-11-23 10:32'
  company?: string; // 快递公司
};

export type AbnormalCityStat = {
  city: string;
  area: '华东' | '华北' | '华南';
  abnormalCount: number;
  highSeverityCount: number;
  percent: number; // 在当前筛选条件下的异常占比（0~1）
};

// 模拟整个平台在当前时间段内的总订单量（用来算“异常占比”）
export const MOCK_TOTAL_ORDERS = 28000;

// 模拟异常订单数据（最近一段时间）
export const mockAbnormalOrders: AbnormalOrder[] = [
  {
    id: 'DY202511230001',
    city: '上海',
    area: '华东',
    abnormalType: 'overtime',
    severity: 'high',
    delayHours: 26.5,
    status: '派送中，预计今日18:00送达',
    triggerTime: '2025-11-23 10:32',
    company: '韵达快递',
  },
  {
    id: 'DY202511230002',
    city: '上海',
    area: '华东',
    abnormalType: 'stuck',
    severity: 'medium',
    delayHours: 20.1,
    status: '快件在【上海转运中心】停留超过24小时',
    triggerTime: '2025-11-23 09:15',
    company: '中通快递',
  },
  {
    id: 'DY202511230003',
    city: '杭州',
    area: '华东',
    abnormalType: 'delivery_fail',
    severity: 'high',
    delayHours: 8.3,
    status: '派送失败，收件人电话无人接听',
    triggerTime: '2025-11-23 11:05',
    company: '顺丰速运',
  },
  {
    id: 'DY202511230004',
    city: '南京',
    area: '华东',
    abnormalType: 'complaint',
    severity: 'medium',
    delayHours: 3.5,
    status: '用户反馈包裹破损，等待平台核查',
    triggerTime: '2025-11-23 08:42',
    company: '圆通速递',
  },
  {
    id: 'DY202511230005',
    city: '广州',
    area: '华南',
    abnormalType: 'returned',
    severity: 'medium',
    delayHours: 12.0,
    status: '快件退回发货仓，原因：地址不详',
    triggerTime: '2025-11-23 07:26',
    company: '申通快递',
  },
  {
    id: 'DY202511230006',
    city: '深圳',
    area: '华南',
    abnormalType: 'overtime',
    severity: 'high',
    delayHours: 30.2,
    status: '超过系统期望送达时间48小时',
    triggerTime: '2025-11-23 06:50',
    company: '京东快递',
  },
  {
    id: 'DY202511230007',
    city: '北京',
    area: '华北',
    abnormalType: 'stuck',
    severity: 'low',
    delayHours: 10.4,
    status: '快件在【北京东站】待装车',
    triggerTime: '2025-11-23 09:58',
    company: '极兔速递',
  },
  {
    id: 'DY202511230008',
    city: '天津',
    area: '华北',
    abnormalType: 'delivery_fail',
    severity: 'medium',
    delayHours: 6.1,
    status: '投递失败，快件放入驿站等待自提',
    triggerTime: '2025-11-23 07:53',
    company: '韵达快递',
  },
  {
    id: 'DY202511230009',
    city: '上海',
    area: '华东',
    abnormalType: 'complaint',
    severity: 'low',
    delayHours: 1.8,
    status: '用户反馈配送员服务态度差',
    triggerTime: '2025-11-23 10:05',
    company: '顺丰速运',
  },
  {
    id: 'DY202511230010',
    city: '广州',
    area: '华南',
    abnormalType: 'overtime',
    severity: 'high',
    delayHours: 22.7,
    status: '快件转运延误，预计明日送达',
    triggerTime: '2025-11-23 05:39',
    company: '中通快递',
  },
];

// 异常占比的“警戒线”阈值，超过就认为偏高，用红色提示
export const ABNORMAL_RATE_THRESHOLD = 0.05;

// 高危异常（比如超时>24h、派送失败）的警报阈值
export const HIGH_SEVERITY_THRESHOLD = 30;
