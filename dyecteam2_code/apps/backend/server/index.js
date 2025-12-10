/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const cors = require('cors');
const db = require('./db'); // SQLite 连接

// ⭐ 新增：为了给“用户端 3002”发 HTTP 请求
const http = require('http'); // 新增

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
// 订单状态枚举（你们自己约的：6 = 需要评价）
const ORDER_STATUS_MAP = {
  0: '待付款',
  1: '待发货',
  2: '已发货', // ★ 兼容旧数据
  3: '运输中',
  4: '已发货', // ★ 对齐前端：前端点“已发货”传 4
  5: '已签收',
  6: '需要评价', // ★ 你们重点用的
};

// 统一成功 / 失败返回格式
function ok(data, message = 'ok') {
  return { code: SUCCESS_CODE, message, data };
}

function fail(message = 'error', code = 1, data = null) {
  return { code, message, data };
}

// ==================== 新增：用户端服务配置 + 通知函数 ====================

// 用户端服务地址（你那边是 3002）
const USER_HOST = 'localhost';
const USER_PORT = 3002;

/**
 * 通知「用户端」：这笔订单已经被商家发货了
 * -> 调用 http://localhost:3002/api/merchant/ship
 * -> 用户端会把自己 orders.status 从 delivering 改成 shipped
 */
function notifyUserOrderShipped(orderNo) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      order_no: orderNo,
    });

    const options = {
      host: USER_HOST,
      port: USER_PORT,
      path: '/api/merchant/ship',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        console.log('[notifyUserOrderShipped] done for', orderNo);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('notifyUserOrderShipped error:', e.message);
      // 通知失败不影响商家端自己更新状态
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// ======================= 吴经纬新增加的部分：CORS =======================
// 允许跨域（如果前端需要）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
// 使用 cors 中间件
app.use(
  cors({
    origin: ['http://localhost:3003', 'http://localhost:3000'], // 允许的源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的方法
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // 允许的头部
    credentials: true, // 允许发送 cookies
    optionsSuccessStatus: 200, // 对 OPTIONS 请求返回 200
  }),
);
// 吴经纬新增加的部分

// ======================= 订单查询（物流查询模块） =======================

// 这里仍然用内存数组，和可视化用的 SQLite 订单表是两套数据，互不影响
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

// ======================= 包裹轨迹查询 =======================

// 轨迹详情暂时还是内存 mock
const trackingDetailsMock = [
  // ...（这里保持你们原来的 mock 不动，省略）
  // 为了回答简短，我删掉了中间长 mock，你自己从原文件里粘回来就行
];

// === 这里你把上面那段 trackingDetailsMock 原样贴回去即可 ===

app.get('/api/tracking/:trackingNo', (req, res) => {
  const { trackingNo } = req.params;
  const detail = trackingDetailsMock.find((item) => item.trackingNo === trackingNo);

  if (!detail) {
    return res.status(404).json(fail('未找到该快递单号的轨迹信息', 404));
  }

  return res.json(ok(detail));
});

// ======================= 可视化：热力图 & 时效 & 异常 =======================

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

const timelinessByCarrier = [
  { carrier: '顺丰速运', avgHours: 20.5, onTimeRate: 0.955, orderCount: 2600 },
  { carrier: '京东快递', avgHours: 22.1, onTimeRate: 0.942, orderCount: 2100 },
  { carrier: '中通快递', avgHours: 25.8, onTimeRate: 0.902, orderCount: 1800 },
  { carrier: '韵达快递', avgHours: 27.3, onTimeRate: 0.874, orderCount: 1500 },
  { carrier: '其他', avgHours: 28.9, onTimeRate: 0.851, orderCount: 520 },
];

// ======================= 异常订单监控：从 SQLite 统计 =======================

app.get('/api/dashboard/abnormal', (req, res) => {
  try {
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

    const abnormalOrders = rows.filter((row) => row.status === 'abnormal' || row.remark === 'urgent');

    const currentAbnormalCount = abnormalOrders.length;
    const highRiskOrders = abnormalOrders.filter((row) => row.remark === 'urgent');
    const highRiskCount = highRiskOrders.length;

    const abnormalRate = totalOrders > 0 ? currentAbnormalCount / totalOrders : 0;

    const warningThreshold = 0.05;

    const summary = {
      currentAbnormalCount,
      abnormalRate,
      highRiskCount,
      warningThreshold,
    };

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

    const cityMap = new Map();

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

    const SLA_HOURS = 48;

    let totalOrders7d = 0;
    let delayedOrders7d = 0;
    let sumHours7d = 0;
    let validHoursCount7d = 0;
    let onTimeCount7d = 0;

    const trendMap = new Map();
    dayKeys.forEach((key) => {
      trendMap.set(key, {
        date: dayLabelMap.get(key),
        total: 0,
        sumHours: 0,
        onTimeCount: 0,
      });
    });

    const regionMap = new Map();

    rows.forEach((row) => {
      const date = (row.created_at || '').slice(0, 10);
      const hours = typeof row.delivery_hours === 'number' ? row.delivery_hours : null;

      if (!last7Set.has(date)) return;

      const region = row.region || '其他';

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
    const onTimeRate7d = validHoursCount7d > 0 ? Number((onTimeCount7d / validHoursCount7d).toFixed(3)) : 0;

    const summary = {
      avgDeliveryHours7d,
      onTimeRate7d,
      totalOrders7d,
      delayedOrders7d,
    };

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

// ================ 吴经纬新增加的部分 主要接口：获取所有订单列表 =======================

// 1. 获取所有订单
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();

    res.json({
      success: true,
      data: orders,
      count: orders.length,
      message: `获取到 ${orders.length} 条订单`,
    });
  } catch (error) {
    console.error('获取订单失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message,
    });
  }
});

// =================== 更新订单状态接口（含发货 → 通知用户端） =======================

// 更新订单状态接口（商家侧 + 给用户端确认收货用）
app.put('/api/orders/update-status', async (req, res) => {
  try {
    const { order_no, order_status } = req.body;

    // 1）校验入参 ------------------------------------------------
    if (!order_no) {
      return res.status(400).json({
        success: false,
        message: '订单编号不能为空',
      });
    }

    if (order_status === undefined) {
      return res.status(400).json({
        success: false,
        message: '订单状态不能为空',
      });
    }

    if (Number.isNaN(Number(order_status))) {
      return res.status(400).json({
        success: false,
        message: '订单状态必须是数字',
      });
    }

    const statusNum = Number(order_status);

    if (statusNum < 0 || statusNum > 6) {
      return res.status(400).json({
        success: false,
        message: `订单状态不合法：${statusNum}，合法范围为 0~6（其中 6 = 需要评价）`,
      });
    }

    // 2）查订单是否存在 -------------------------------------------
    const checkStmt = db.prepare('SELECT id, order_no, order_status FROM orders WHERE order_no = ?');
    const order = checkStmt.get(order_no);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `订单编号 ${order_no} 不存在`,
      });
    }

    // 3）更新 order_status 字段 ------------------------------------
    const updateStmt = db.prepare('UPDATE orders SET order_status = ? WHERE order_no = ?');
    const result = updateStmt.run(statusNum, order_no);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        message: '更新失败，可能是状态未改变',
      });
    }

    // ⭐⭐ 关键逻辑：如果改成“已发货”(2 或 4)，就通知用户端把对应订单改成 delivering ⭐⭐
    if (statusNum === 2 || statusNum === 4) {
      console.log('[update-status] status =', statusNum, ' (已发货), notify user server to mark delivering:', order_no);
      await notifyUserOrderShipped(order_no);
    }

    // 4）查询更新后的数据，返回给前端 ------------------------------
    const updatedOrder = db
      .prepare(
        `
        SELECT id, order_no, order_name, order_status, status, receiver_name, total_price, created_at 
        FROM orders WHERE order_no = ?
      `,
      )
      .get(order_no);

    const statusText = ORDER_STATUS_MAP[updatedOrder.order_status] || '未知状态';

    return res.json({
      success: true,
      message: `订单 ${order_no} 状态已更新为 ${statusNum}（${statusText}）`,
      data: {
        ...updatedOrder,
        statusText, // 给前端一个中文说明，例如“需要评价”
      },
      changes: result.changes,
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message,
    });
  }
});

// ======================= 启动服务器 =======================

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
  console.log('📊 数据库文件: logistics_v2.db');
  console.log('\n🛒 可用接口:');
  console.log('  GET  /api/orders              - 获取所有订单');
  console.log('  GET  /api/orders/paged        - 分页获取订单');
  console.log('  GET  /api/orders/filtered     - 筛选获取订单');
  console.log('  GET  /api/orders/stats        - 获取订单统计');
  console.log('  GET  /api/health              - 健康检查');
  console.log('\n🔧 查询参数示例:');
  console.log('  /api/orders/paged?page=1&limit=20');
  console.log('  /api/orders/filtered?status=normal&recv_city=上海');
});
