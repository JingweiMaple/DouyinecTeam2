// src/services/logistics.ts

import { instance } from '../utils/request';

export interface OrderListParams {
  keyword?: string;
  status?: string;
}

export function fetchOrderList(params: OrderListParams) {
  return instance.get('/api/orders', { params });
}
export function fetchTrackDetail(trackingNo: string) {
  return instance.get(`/api/tracking/${trackingNo}`);
}
export function fetchDashboardOverview() {
  return instance.get('/api/dashboard/overview');
}
// src/services/logistics.ts 中
export function fetchRegionHeatmap() {
  return instance.get('/api/dashboard/region-heatmap');
}
// ⭐ 新增：配送时效分析接口
export function fetchTimelinessAnalysis() {
  // 对应 server/index.js 里的 /api/dashboard/timeliness
  return instance.get('/api/dashboard/timeliness');
}
export function fetchAbnormalDashboard() {
  // 对应 server/index.js 里的 /api/dashboard/abnormal
  return instance.get('/api/dashboard/abnormal');
}
