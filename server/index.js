/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const cors = require('cors');
const db = require('./db'); // SQLite 连接

const app = express();

// ======================= 通用配置 =======================

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const SUCCESS_CODE = 0;

// 统一成功 / 失败返回格式
function ok(data, message = 'ok') {
  return { code: SUCCESS_CODE, message, data };
}

function fail(message = 'error', code = 1, data = null) {
  return { code, message, data };
}

// ======================= 订单查询（物流查询模块） =======================

// 订单列表暂时还用内存数组，后面再换成数据库
const orders = [
  {
    id: 1,
    orderId: 'O202411230001',
    trackingNo: 'SF202411230001',
    orderName: '上海办公用品采购项目',
    status: 'finished',
    amount: 1700000,
    createdAt: '2024-11-23 10:22:00',
  },
  {
    id: 2,
    orderId: 'O202411220002',
    trackingNo: 'YT202411220002',
    orderName: '广州信用日用日销订单',
    status: 'delivering',
    amount: 2670000,
    createdAt: '2024-11-22 09:15:00',
  },
  {
    id: 3,
    orderId: 'O202411210003',
    trackingNo: 'JD202411210003',
    orderName: '杭州仓家居东直销订单',
    status: 'pending',
    amount: 3800000,
    createdAt: '2024-11-21 14:08:00',
  },
  {
    id: 4,
    orderId: 'O202411200004',
    trackingNo: 'ZTO202411200004',
    orderName: '成都小店抖音电商订单',
    status: 'finished',
    amount: 3030000,
    createdAt: '2024-11-20 16:30:00',
  },
  {
    id: 5,
    orderId: 'O202411190005',
    trackingNo: 'YT202411190005',
    orderName: '深圳旗舰店直播间订单',
    status: 'cancelled',
    amount: 4500000,
    createdAt: '2024-11-19 20:12:00',
  },
];

// 订单列表接口：GET /api/orders
app.get('/api/orders', (req, res) => {
  const { keyword = '', status = '' } = req.query;

  let list = orders;

  if (keyword) {
    list = list.filter((o) => o.orderName.includes(keyword) || o.trackingNo.includes(keyword));
  }

  if (status) {
    list = list.filter((o) => o.status === status);
  }

  res.json(
    ok({
      list,
      total: list.length,
    }),
  );
});

// ======================= 包裹轨迹查询 =======================

// 轨迹详情暂时还是内存 mock
const trackingDetailsMock = [
  // 1
  {
    trackingNo: 'SF202411230001',
    currentStatus: 'finished',
    estimatedDelivery: '2024-11-23 18:00',
    map: {
      origin: {
        lng: 121.465,
        lat: 31.22,
        name: '上海仓发货网点',
      },
      destination: {
        lng: 121.4737,
        lat: 31.2304,
        name: '上海市徐汇区政务中心',
      },
      currentLocation: {
        lng: 121.4737,
        lat: 31.2304,
        name: '签收地址',
        time: '2024-11-23 17:20',
        status: '已签收',
      },
      path: [
        { lng: 121.465, lat: 31.22 },
        { lng: 121.47, lat: 31.225 },
        { lng: 121.4737, lat: 31.2304 },
      ],
    },
    timeline: [
      {
        time: '2024-11-23 17:20',
        status: '已签收',
        desc: '快件已由 收件人 签收，如有问题请联系顺丰客服。',
      },
      {
        time: '2024-11-23 15:05',
        status: '派送中',
        desc: '顺丰快递员 李师傅 正在为您派送，请保持电话畅通。',
      },
      {
        time: '2024-11-23 10:50',
        status: '运输中',
        desc: '快件已到达【上海中转场】，准备派送。',
      },
      {
        time: '2024-11-23 09:10',
        status: '已揽收',
        desc: '快件已由【上海仓发货网点】揽收。',
      },
      {
        time: '2024-11-23 08:30',
        status: '已下单',
        desc: '商家已创建物流订单，等待快递公司揽收。',
      },
    ],
    orderInfo: {
      orderName: '上海办公用品采购项目',
      trackingNo: 'SF202411230001',
      company: '顺丰速运',
      currentStatusText: '已完成',
      receiverName: '上海市某办公楼前台',
      receiverPhone: '021-66668888',
      receiverAddress: '上海市静安区××路××号',
      senderName: '抖音电商·办公用品旗舰店',
      senderAddress: '上海市嘉定区××路××号 仓储中心',
      price: 1700000,
      orderTime: '2024-11-23 10:22:00',
    },
  },
  // 2
  {
    trackingNo: 'YT202411220002',
    currentStatus: 'delivering',
    estimatedDelivery: '2024-11-23 20:00',
    map: {
      origin: {
        lng: 113.2644,
        lat: 23.1291,
        name: '广州白云区电商仓',
      },
      destination: {
        lng: 113.2806,
        lat: 23.1252,
        name: '广州市天河区写字楼',
      },
      currentLocation: {
        lng: 113.275,
        lat: 23.13,
        name: '广州天河转运中心',
        time: '2024-11-22 18:30',
        status: '派送中',
      },
      path: [
        { lng: 113.2644, lat: 23.1291 },
        { lng: 113.27, lat: 23.128 },
        { lng: 113.275, lat: 23.13 },
        { lng: 113.2806, lat: 23.1252 },
      ],
    },
    timeline: [
      {
        time: '2024-11-22 18:30',
        status: '派送中',
        desc: '快递员 张伟(18800001111) 正在为您派送，请保持电话畅通。',
      },
      {
        time: '2024-11-22 15:10',
        status: '运输中',
        desc: '快件已到达【广州天河转运中心】。',
      },
      {
        time: '2024-11-22 12:00',
        status: '已揽收',
        desc: '快件已由【广州白云区电商仓】揽收。',
      },
      {
        time: '2024-11-22 09:15',
        status: '已下单',
        desc: '商家已创建物流订单，等待快递公司揽收。',
      },
    ],
    orderInfo: {
      orderName: '广州信用日用日销订单',
      trackingNo: 'YT202411220002',
      company: '韵达快递',
      currentStatusText: '配送中',
      receiverName: '广州天河客户',
      receiverPhone: '18600002222',
      receiverAddress: '广东省广州市天河区××路××号',
      senderName: '抖音电商·信用日用专营店',
      senderAddress: '广东省广州市白云区××跨境电商产业园',
      price: 2670000,
      orderTime: '2024-11-22 09:15:00',
    },
  },
  // 3
  {
    trackingNo: 'JD202411210003',
    currentStatus: 'pending',
    estimatedDelivery: '2024-11-25 18:00',
    map: {
      origin: {
        lng: 120.1551,
        lat: 30.2741,
        name: '杭州萧山家居仓',
      },
      destination: {
        lng: 121.4737,
        lat: 31.2304,
        name: '上海市浦东新区居民小区',
      },
      currentLocation: null,
      path: [],
    },
    timeline: [
      {
        time: '2024-11-21 14:08',
        status: '待发货',
        desc: '订单已创建，等待商家打包发货。',
      },
    ],
    orderInfo: {
      orderName: '杭州仓家居春装订单',
      trackingNo: 'JD202411210003',
      company: '京东快递',
      currentStatusText: '待发货',
      receiverName: '上海用户A',
      receiverPhone: '18500003333',
      receiverAddress: '上海市浦东新区××路××号',
      senderName: '抖音电商·家居春装旗舰店',
      senderAddress: '浙江省杭州市萧山区××电商仓',
      price: 3800000,
      orderTime: '2024-11-21 14:08:00',
    },
  },
  // 4
  {
    trackingNo: 'ZTO202411200004',
    currentStatus: 'finished',
    estimatedDelivery: '2024-11-21 19:00',
    map: {
      origin: {
        lng: 104.0665,
        lat: 30.5723,
        name: '成都双流发货网点',
      },
      destination: {
        lng: 104.071,
        lat: 30.663,
        name: '成都市金牛区社区',
      },
      currentLocation: {
        lng: 104.071,
        lat: 30.663,
        name: '签收地址',
        time: '2024-11-21 18:10',
        status: '已签收',
      },
      path: [
        { lng: 104.0665, lat: 30.5723 },
        { lng: 104.069, lat: 30.62 },
        { lng: 104.071, lat: 30.663 },
      ],
    },
    timeline: [
      {
        time: '2024-11-21 18:10',
        status: '已签收',
        desc: '快件已由 家人 代签收。',
      },
      {
        time: '2024-11-21 15:00',
        status: '派送中',
        desc: '中通快递员 王师傅 正在为您派送。',
      },
      {
        time: '2024-11-21 09:30',
        status: '运输中',
        desc: '快件已到达【成都金牛区分拨中心】。',
      },
      {
        time: '2024-11-20 20:30',
        status: '已揽收',
        desc: '快件已由【成都双流发货网点】揽收。',
      },
    ],
    orderInfo: {
      orderName: '成都小店抖音电商订单',
      trackingNo: 'ZTO202411200004',
      company: '中通快递',
      currentStatusText: '已完成',
      receiverName: '成都用户B',
      receiverPhone: '18900004444',
      receiverAddress: '四川省成都市金牛区××路××号',
      senderName: '抖音电商·成都小店',
      senderAddress: '四川省成都市双流区××仓储中心',
      price: 3030000,
      orderTime: '2024-11-20 16:30:00',
    },
  },
  // 5
  {
    trackingNo: 'YT202411190005',
    currentStatus: 'cancelled',
    estimatedDelivery: null,
    map: {
      origin: null,
      destination: null,
      currentLocation: null,
      path: [],
    },
    timeline: [
      {
        time: '2024-11-19 21:00',
        status: '已取消',
        desc: '用户申请取消订单，商家已同意，物流单未创建。',
      },
      {
        time: '2024-11-19 20:12',
        status: '已下单',
        desc: '订单已创建，等待商家处理。',
      },
    ],
    orderInfo: {
      orderName: '深圳抖咖旗舰店订单',
      trackingNo: 'YT202411190005',
      company: '韵达快递',
      currentStatusText: '已取消',
      receiverName: '深圳用户C',
      receiverPhone: '18800005555',
      receiverAddress: '广东省深圳市南山区××科技园',
      senderName: '抖咖旗舰店',
      senderAddress: '广东省深圳市宝安区××仓',
      price: 4500000,
      orderTime: '2024-11-19 20:12:00',
    },
  },
];

app.get('/api/tracking/:trackingNo', (req, res) => {
  const { trackingNo } = req.params;
  const detail = trackingDetailsMock.find((item) => item.trackingNo === trackingNo);

  if (!detail) {
    return res.status(404).json(fail('未找到该快递单号的轨迹信息', 404));
  }

  return res.json(ok(detail));
});

// ======================= 可视化：热力图 & 时效 & 异常 =======================

// 热力图需要用到的城市坐标
const CITY_COORDS = {
  上海市: { lng: 121.47, lat: 31.23 },
  杭州市: { lng: 120.16, lat: 30.28 },
  广州市: { lng: 113.27, lat: 23.13 },
  深圳市: { lng: 114.06, lat: 22.55 },
  北京市: { lng: 116.4, lat: 39.9 },
  天津市: { lng: 117.2, lat: 39.12 },
  成都市: { lng: 104.07, lat: 30.67 },
  重庆市: { lng: 106.55, lat: 29.56 },
  武汉市: { lng: 114.3, lat: 30.6 },
  郑州市: { lng: 113.63, lat: 34.75 },
  西安市: { lng: 108.95, lat: 34.27 },
  南京市: { lng: 118.8, lat: 32.06 },
};

// 承运商 mock（先保留）
const timelinessByCarrier = [
  { carrier: '顺丰速运', avgHours: 20.5, onTimeRate: 0.955, orderCount: 2600 },
  { carrier: '京东快递', avgHours: 22.1, onTimeRate: 0.942, orderCount: 2100 },
  { carrier: '中通快递', avgHours: 25.8, onTimeRate: 0.902, orderCount: 1800 },
  { carrier: '韵达快递', avgHours: 27.3, onTimeRate: 0.874, orderCount: 1500 },
  { carrier: '其他', avgHours: 28.9, onTimeRate: 0.851, orderCount: 520 },
];

// 异常监控 mock

// 异常监控接口
// 异常订单监控：从 SQLite 统计
app.get('/api/dashboard/abnormal', (req, res) => {
  try {
    // 1）从数据库取出需要的字段
    const rows = db
      .prepare(
        `
        SELECT
          order_no,
          order_name,
          recv_city,
          region,
          status,
          remark,
          created_at
        FROM orders
      `,
      )
      .all();

    const totalOrders = rows.length;

    // 定义“异常”规则：status='abnormal' 或 remark='urgent'
    const abnormalOrders = rows.filter((row) => row.status === 'abnormal' || row.remark === 'urgent');

    const currentAbnormalCount = abnormalOrders.length;
    const highRiskOrders = abnormalOrders.filter((row) => row.remark === 'urgent');
    const highRiskCount = highRiskOrders.length;

    // 占比：0~1 的小数，前端再 *100 显示百分比
    const abnormalRate = totalOrders > 0 ? currentAbnormalCount / totalOrders : 0;

    // 告警阈值（0~1），先写死 5%
    const warningThreshold = 0.05;

    const summary = {
      currentAbnormalCount,
      abnormalRate,
      highRiskCount,
      warningThreshold,
    };

    // 2）实时异常列表：结构对齐前端 AbnormalOrder 类型
    const now = new Date();

    const realtimeList = abnormalOrders.map((row, index) => {
      const created = row.created_at ? new Date(row.created_at) : null;
      const durationHours = created ? Number(((now.getTime() - created.getTime()) / 3600000).toFixed(1)) : 0;

      const isHigh = row.remark === 'urgent';
      const city = row.recv_city || row.region || '未知';

      return {
        id: index + 1,
        orderNo: row.order_no,
        city,
        abnormalType: isHigh ? '高风险预警' : '配送异常',
        severity: isHigh ? '高' : '中',
        durationHours,
        currentStatus: isHigh ? '已触发高风险预警，待人工处理' : '异常待跟进',
        triggerTime: row.created_at,
      };
    });

    // 3）按城市汇总统计：结构对齐 AbnormalCityStat
    const cityMap = new Map(); // city -> { city, abnormalCount, highRiskCount }

    abnormalOrders.forEach((row) => {
      const city = row.recv_city || row.region || '未知';
      if (!cityMap.has(city)) {
        cityMap.set(city, {
          city,
          abnormalCount: 0,
          highRiskCount: 0,
        });
      }
      const item = cityMap.get(city);
      item.abnormalCount += 1;
      if (row.remark === 'urgent') {
        item.highRiskCount += 1;
      }
    });

    const cityStats = Array.from(cityMap.values()).map((item) => ({
      ...item,
      // percent 也是 0~1 的小数
      percent: currentAbnormalCount > 0 ? item.abnormalCount / currentAbnormalCount : 0,
    }));

    return res.json(
      ok({
        summary,
        realtimeList,
        cityStats,
      }),
    );
  } catch (err) {
    console.error('统计异常订单出错：', err);
    return res.status(500).json(fail('数据库查询失败', 500));
  }
});

// ======================= 区域订单热力图（SQLite） =======================

app.get('/api/dashboard/region-heatmap', (req, res) => {
  try {
    const { timeRange = '30d', region = 'all', status = 'all' } = req.query;
    console.log('[region-heatmap] query:', { timeRange, region, status });

    const rows = db
      .prepare(
        `
        SELECT
          recv_city,
          region,
          COUNT(*) AS order_count
        FROM orders
        GROUP BY recv_city, region
      `,
      )
      .all();

    if (!rows || rows.length === 0) {
      return res.json(
        ok({
          points: [],
          cityAgg: [],
        }),
      );
    }

    const cityAgg = rows.map((row) => {
      const city = row.recv_city || '未知';
      const coords = CITY_COORDS[city] || {};
      return {
        city,
        region: row.region || '其他',
        lng: coords.lng ?? null,
        lat: coords.lat ?? null,
        totalCount: row.order_count,
      };
    });

    const points = cityAgg
      .filter((c) => c.lng != null && c.lat != null)
      .map((c) => ({
        city: c.city,
        region: c.region,
        lng: c.lng,
        lat: c.lat,
        count: c.totalCount,
      }));

    return res.json(
      ok({
        points,
        cityAgg,
      }),
    );
  } catch (err) {
    console.error('统计区域订单密度出错：', err);
    return res.status(500).json(fail('数据库查询失败', 500));
  }
});

// ======================= 配送时效分析（SQLite） =======================

app.get('/api/dashboard/timeliness', (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          delivery_hours,
          created_at,
          region
        FROM orders
      `,
      )
      .all();

    const now = new Date();

    // 近 7 天日期
    const dayKeys = [];
    const dayLabelMap = new Map();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayKeys.push(key);
      dayLabelMap.set(key, label);
    }
    const last7Set = new Set(dayKeys);

    const SLA_HOURS = 48; // 48 小时内算准时

    // summary 统计
    let totalOrders7d = 0;
    let delayedOrders7d = 0;
    let sumHours7d = 0;
    let validHoursCount7d = 0;
    let onTimeCount7d = 0;

    // 趋势
    const trendMap = new Map();
    dayKeys.forEach((key) => {
      trendMap.set(key, {
        date: dayLabelMap.get(key),
        total: 0,
        sumHours: 0,
        onTimeCount: 0,
      });
    });

    // 区域
    const regionMap = new Map();

    rows.forEach((row) => {
      const date = (row.created_at || '').slice(0, 10);
      const hours = typeof row.delivery_hours === 'number' ? row.delivery_hours : null;

      if (!last7Set.has(date)) return;

      const region = row.region || '其他';

      // summary
      totalOrders7d += 1;
      if (hours != null) {
        sumHours7d += hours;
        validHoursCount7d += 1;
        if (hours > SLA_HOURS) {
          delayedOrders7d += 1;
        } else {
          onTimeCount7d += 1;
        }
      }

      // 趋势
      const tItem = trendMap.get(date);
      if (tItem) {
        tItem.total += 1;
        if (hours != null) {
          tItem.sumHours += hours;
          if (hours <= SLA_HOURS) {
            tItem.onTimeCount += 1;
          }
        }
      }

      // 区域
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          region,
          total: 0,
          sumHours: 0,
          onTimeCount: 0,
        });
      }
      const rItem = regionMap.get(region);
      rItem.total += 1;
      if (hours != null) {
        rItem.sumHours += hours;
        if (hours <= SLA_HOURS) {
          rItem.onTimeCount += 1;
        }
      }
    });

    const avgDeliveryHours7d = validHoursCount7d > 0 ? Number((sumHours7d / validHoursCount7d).toFixed(1)) : 0;
    // ⭐ 注意：这里返回 0~1 小数
    const onTimeRate7d = validHoursCount7d > 0 ? Number((onTimeCount7d / validHoursCount7d).toFixed(3)) : 0;

    const summary = {
      avgDeliveryHours7d,
      onTimeRate7d,
      totalOrders7d,
      delayedOrders7d,
    };

    // 趋势数组：onTimeRate 为 0~1 小数
    const trend7d = dayKeys.map((key) => {
      const item = trendMap.get(key);
      const avgHours = item.total > 0 ? Number((item.sumHours / item.total).toFixed(1)) : 0;
      const onTimeRate = item.total > 0 ? Number((item.onTimeCount / item.total).toFixed(3)) : 0;
      return {
        date: item.date,
        avgHours,
        onTimeRate,
      };
    });

    // 区域数组：onTimeRate 为 0~1 小数
    const regionStats = Array.from(regionMap.values()).map((r) => ({
      region: r.region,
      avgHours: r.total > 0 ? Number((r.sumHours / r.total).toFixed(1)) : 0,
      onTimeRate: r.total > 0 ? Number((r.onTimeCount / r.total).toFixed(3)) : 0,
      orderCount: r.total,
    }));

    const carrierStats = timelinessByCarrier;

    return res.json(
      ok({
        summary,
        trend7d,
        carrierStats,
        regionStats,
      }),
    );
  } catch (err) {
    console.error('统计配送时效出错：', err);
    return res.status(500).json(fail('数据库查询失败', 500));
  }
});

// ======================= 仪表盘总览：从 SQLite 统计 =======================

app.get('/api/dashboard/overview', (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT
        order_no,
        order_name,
        delivery_hours,
        created_at,
        recv_city,
        region,
        ship_city,
        status,
        remark
      FROM orders
    `,
      )
      .all();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let todayOrderCount = 0;
    let todayAbnormalCount = 0;
    let yesterdayOrderCount = 0;

    let sumDeliveryHours = 0;
    let deliveryCount = 0;
    let onTimeCount = 0;
    const SLA_HOURS = 48;
    const ONTIME_TARGET = 90;

    rows.forEach((row) => {
      const date = (row.created_at || '').slice(0, 10);

      if (date === todayStr) {
        todayOrderCount += 1;
        if (row.status === 'abnormal') {
          todayAbnormalCount += 1;
        }
      } else if (date === yesterdayStr) {
        yesterdayOrderCount += 1;
      }

      if (typeof row.delivery_hours === 'number') {
        sumDeliveryHours += row.delivery_hours;
        deliveryCount += 1;
        if (row.delivery_hours <= SLA_HOURS) {
          onTimeCount += 1;
        }
      }
    });

    const avgDeliveryHours = deliveryCount > 0 ? Number((sumDeliveryHours / deliveryCount).toFixed(1)) : 0;
    const onTimeRate = deliveryCount > 0 ? Number(((onTimeCount / deliveryCount) * 100).toFixed(1)) : 0;

    const todayOrderCompare =
      yesterdayOrderCount > 0
        ? Number((((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100).toFixed(1))
        : 0;

    const todayAbnormalRate =
      todayOrderCount > 0 ? Number(((todayAbnormalCount / todayOrderCount) * 100).toFixed(2)) : 0;

    const summary = {
      todayOrderCount,
      todayOrderCompare,
      todayAbnormalCount,
      todayAbnormalRate,
      avgDeliveryHours,
      slaDeliveryHours: SLA_HOURS,
      onTimeRate,
      onTimeTarget: ONTIME_TARGET,
    };

    // 近7天趋势
    const dayList = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const show = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayList.push({ key: dateStr, label: show });
    }

    const trendMap = new Map();
    dayList.forEach((d) => {
      trendMap.set(d.key, { date: d.label, orderCount: 0, abnormalCount: 0 });
    });

    rows.forEach((row) => {
      const date = (row.created_at || '').slice(0, 10);
      if (trendMap.has(date)) {
        const item = trendMap.get(date);
        item.orderCount += 1;
        if (row.status === 'abnormal') {
          item.abnormalCount += 1;
        }
      }
    });

    const trend7d = Array.from(trendMap.values());

    // 当前指标快照
    const totalOrders = rows.length;
    const totalAbnormal = rows.filter((r) => r.status === 'abnormal').length;
    const totalNormal = totalOrders - totalAbnormal;

    const abnormalRate = totalOrders > 0 ? Number(((totalAbnormal / totalOrders) * 100).toFixed(2)) : 0;
    const normalRate = 100 - abnormalRate;

    const statusSnapshot = {
      normalCount: totalNormal,
      abnormalCount: totalAbnormal,
      abnormalRate,
      normalRate,
      description:
        abnormalRate < 5 ? '当前整体运行稳定，异常占比较低。' : '异常占比较高，建议重点排查异常订单所在区域及环节。',
    };

    // 区域订单概览
    const regionCountMap2 = new Map();
    rows.forEach((row) => {
      const reg = row.region || '其他';
      regionCountMap2.set(reg, (regionCountMap2.get(reg) || 0) + 1);
    });

    const regionArr = Array.from(regionCountMap2.entries()).sort((a, b) => b[1] - a[1]);
    const topRegions = regionArr.slice(0, 3).map((r) => r[0]);
    const topTotal = regionArr.slice(0, 3).reduce((sum, r) => sum + r[1], 0);
    const topRegionsRate = totalOrders > 0 ? Number(((topTotal / totalOrders) * 100).toFixed(1)) : 0;

    const regionSummary = {
      topRegions,
      topRegionsRate,
      desc: `从数据来看，${topRegions.join(' / ')} 等区域是当前订单最集中的区域。`,
    };

    // 配送时效概览
    const last7Dates = new Set(dayList.map((d) => d.key));
    let sum7d = 0;
    let count7d = 0;
    let onTime7d = 0;

    rows.forEach((row) => {
      const date = (row.created_at || '').slice(0, 10);
      if (last7Dates.has(date) && typeof row.delivery_hours === 'number') {
        sum7d += row.delivery_hours;
        count7d += 1;
        if (row.delivery_hours <= SLA_HOURS) {
          onTime7d += 1;
        }
      }
    });

    const avgDeliveryHours7d = count7d > 0 ? Number((sum7d / count7d).toFixed(1)) : 0;
    const onTimeRate7d = count7d > 0 ? Number(((onTime7d / count7d) * 100).toFixed(1)) : 0;

    const efficiencySummary = {
      avgDeliveryHours7d,
      onTimeRate7d,
      riskDesc:
        onTimeRate7d >= ONTIME_TARGET
          ? '近7天整体配送时效表现稳定。'
          : '近7天配送时效略有波动，建议关注超时订单集中区域。',
    };

    // 异常订单概览
    const todayAbnormalOrders = rows.filter((row) => {
      const date = (row.created_at || '').slice(0, 10);
      return date === todayStr && row.status === 'abnormal';
    });

    const todaySevereCount = todayAbnormalOrders.filter((o) => o.remark === 'urgent').length;

    const exceptionSummary = {
      todayAbnormalCount,
      todaySevereCount,
      desc:
        todayAbnormalCount === 0
          ? '当前暂无异常订单，运行状态良好。'
          : '存在一定数量的异常订单，建议及时跟进处理高风险订单。',
    };

    const data = {
      summary,
      trend7d,
      statusSnapshot,
      regionSummary,
      efficiencySummary,
      exceptionSummary,
    };

    return res.json(ok(data));
  } catch (err) {
    console.error('统计仪表盘总览出错：', err);
    return res.status(500).json(fail('服务器内部错误', 500));
  }
});

// ======================= 可视化订单明细：直接返回 SQLite 行 =======================

app.get('/api/visual/orders', (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT
        order_no,
        order_name,
        delivery_hours,
        created_at,
        recv_city,
        region,
        ship_city,
        status,
        remark
      FROM orders
      ORDER BY created_at DESC
    `,
      )
      .all();

    return res.json(ok(rows));
  } catch (err) {
    console.error('查询可视化订单数据出错：', err);
    return res.status(500).json(fail('数据库查询失败', 500));
  }
});

// ======================= 启动服务 =======================

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
