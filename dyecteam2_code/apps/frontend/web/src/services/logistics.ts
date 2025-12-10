// src/services/logistics.ts
import { instance } from '../utils/request';

export interface OrderListParams {
  keyword?: string;
  status?: string;
}

// 说明：返回 Promise<{ code: number; message: string; data: { list: ..., total: ... } }>
export function fetchOrderList(params: OrderListParams) {
  return instance.get('/api/orders', { params });
}

export function fetchTrackDetail(trackingNo: string) {
  return instance.get(`/api/tracking/${trackingNo}`);
}

export function fetchDashboardOverview() {
  return instance.get('/api/dashboard/overview');
}

export function fetchRegionHeatmap() {
  return instance.get('/api/dashboard/region-heatmap');
}

// ⭐ 配送时效分析接口：返回 { code, message, data: { summary, trend7d, carrierStats, regionStats } }
export function fetchTimelinessAnalysis() {
  return instance.get('/api/dashboard/timeliness');
}

// ⭐ 异常订单监控接口：返回 { code, message, data: { summary, realtimeList, cityStats } }
export function fetchAbnormalDashboard() {
  return instance.get('/api/dashboard/abnormal');
}
export function getAllOrders() {
  return instance.get('/api/orders');
}
