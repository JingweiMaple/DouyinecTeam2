// 区域订单热力点：用于高德热力图
export type OrderHeatPoint = {
  lng: number; // 经度
  lat: number; // 纬度
  count: number; // 订单量，用于控制热度
  city: string; // 城市名（用于排行）
  region?: string; // 可选：更细的区域，比如“华东、华北”
  status: 'delivered' | 'shipping' | 'exception'; // ★ 新增：订单状态
  channel?: 'shop' | 'live' | 'self' | 'other'; // 预留：渠道
};

// 城市维度统计：用于右侧表格排行
export type CityStat = {
  city: string;
  orderCount: number;
  percent: number; // 占比（0-1）
};

// 时间范围筛选项
export const TIME_RANGE_OPTIONS = [
  { label: '今日', value: 'today' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
];

// 区域筛选项（可以理解为商家重点区域）
export const REGION_OPTIONS = [
  { label: '全国', value: 'all' },
  { label: '华东地区', value: 'east' },
  { label: '上海市', value: 'shanghai' },
];
export const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '已完成', value: 'delivered' },
  { label: '派送中', value: 'shipping' },
  { label: '异常订单', value: 'exception' },
];

// 假数据：区域订单热力点（经纬度只是示意）
export const mockHeatPoints: OrderHeatPoint[] = [
  // 上海
  { lng: 121.4737, lat: 31.2304, count: 1200, city: '上海', region: '华东', status: 'delivered' },
  { lng: 121.52, lat: 31.2, count: 800, city: '上海', region: '华东', status: 'shipping' },

  // 杭州
  { lng: 120.1551, lat: 30.2741, count: 900, city: '杭州', region: '华东', status: 'delivered' },
  { lng: 120.18, lat: 30.28, count: 700, city: '杭州', region: '华东', status: 'exception' },

  // 南京
  { lng: 118.7969, lat: 32.0603, count: 500, city: '南京', region: '华东', status: 'shipping' },

  // 北京
  { lng: 116.4074, lat: 39.9042, count: 1100, city: '北京', region: '华北', status: 'delivered' },

  // 广州
  { lng: 113.2644, lat: 23.1291, count: 650, city: '广州', region: '华南', status: 'shipping' },
];

// 假数据：按城市汇总后的排行（右侧表格用）
// 先写死，后面可以用 mockHeatPoints 自动算出来
export const mockCityStats: CityStat[] = [
  { city: '上海', orderCount: 2000, percent: 0.32 },
  { city: '北京', orderCount: 1100, percent: 0.18 },
  { city: '杭州', orderCount: 1600, percent: 0.25 },
  { city: '广州', orderCount: 650, percent: 0.1 },
  { city: '南京', orderCount: 500, percent: 0.08 },
];
