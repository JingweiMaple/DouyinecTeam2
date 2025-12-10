// ================= 引入依赖&创建 Express 应用 =====================
const path = require("path"); // 引入 path 模块，用于处理文件路径
const express = require("express"); // 引入 express 模块，用于创建 Web 应用
const cors = require("cors"); // 引入 cors 模块，用于处理跨域请求
const Database = require("better-sqlite3"); // 引入 better-sqlite3 模块，用于操作 SQLite 数据库
const http = require("http"); // 引入 http 模块，用于创建 HTTP 服务器
const WebSocket = require("ws"); // 引入 ws 模块，用于创建 WebSocket 服务器，更新小车位置

const app = express(); // 创建 Express 应用实例
// ==================== 配置中间件 ======================
app.use(
  cors({
    origin: true, // 允许所有来源的请求
    credentials: true, // 允许发送包含凭据的请求
  })
);
app.use(express.json()); // 解析 JSON 请求体

// ==================== 连接 / 创建 SQLite ====================

const dbFile = path.join(__dirname, "logistics-mobile.db");
const db = new Database(dbFile);

// ==================== *工具函数 ======================*
// 从城市字符串中提取省份
function extractProvince(cityStr) {
  if (!cityStr) return "";
  const m = cityStr.match(/^(.+?[省市])/);
  return m ? m[1] : cityStr;
}

// 计算预计送达时间
function computeEtaTime(orderLike, routePoints) {
  let baseTime = null;

  if (routePoints && routePoints.length > 0 && routePoints[0].time) {
    baseTime = routePoints[0].time;
  } else {
    baseTime =
      orderLike?.shipped_at || orderLike?.paid_at || orderLike?.created_at;
  }

  if (!baseTime) return null;

  const senderProvince = orderLike.sender_province || "";
  const receiverProvince = orderLike.receiver_province || "";

  const sameProvince =
    senderProvince && receiverProvince && senderProvince === receiverProvince;

  const n = routePoints?.length || 0;
  let addDays = 1;

  if (sameProvince) {
    addDays = 1;
  } else {
    if (n <= 2) addDays = 1;
    else if (n === 3) addDays = 2;
    else addDays = 3;
  }

  const d = new Date(baseTime);
  d.setDate(d.getDate() + addDays);
  return d.toISOString();
}

// 取件码，按 orderId + seq 算
function generatePickupCode(orderId, seq) {
  const area = (orderId % 6) + 1; // 1~6
  const row = (seq % 6) + 1; // 1~6
  const idx = 10 + ((orderId * 13 + seq * 7) % 90); // 10~99
  return `R${area}-${row}-${idx}`;
}

// 从 DB 里面取出当前订单的取件信息
function getPickupInfoFromDb(orderId) {
  const row = db
    .prepare(
      `
    SELECT seq, pickup_code AS code, pickup_station AS station
    FROM order_route_points
    WHERE order_id = ? AND pickup_code IS NOT NULL
    ORDER BY seq
    LIMIT 1
  `
    )
    .get(orderId);

  return row || null;
}

// 待取件不显示取件码补码（数据库pickup_code为空）
function ensurePickupInfoForOrder(orderId) {
  const lastPoint = db
    .prepare(
      `
      SELECT id, seq, status, city, pickup_code, pickup_station
      FROM order_route_points
      WHERE order_id = ?
      ORDER BY seq DESC
      LIMIT 1
    `
    )
    .get(orderId);

  if (lastPoint && lastPoint.status === "待取件" && !lastPoint.pickup_code) {
    const code = generatePickupCode(orderId, lastPoint.seq);
    const station =
      lastPoint.pickup_station ||
      (lastPoint.city ? `${lastPoint.city}××驿站` : "自提点");

    db.prepare(
      "UPDATE order_route_points SET pickup_code = ?, pickup_station = ? WHERE id = ?"
    ).run(code, station, lastPoint.id);

    console.log("[ENSURE PICKUP INFO]", {
      orderId,
      seq: lastPoint.seq,
      code,
      station,
    });
  }
}

// ========== 新增：通知商家端“该订单需要评价” ==========
// 商家端服务地址
const MERCHANT_HOST = "localhost";
const MERCHANT_PORT = 3001;

/**
 * 调用商家端接口，把指定 order_no 对应的订单的 order_status 改成 6
 * 注意：这里只是转发，不改本地数据库
 */
function notifyMerchantNeedReview(orderNo) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      order_no: orderNo,
      order_status: 6, // 商家端字段名是 order_status，6 = 需要评价
    });

    const options = {
      host: MERCHANT_HOST,
      port: MERCHANT_PORT,
      path: "/api/orders/update-status",
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      // 不关心返回内容，只要把响应读完即可
      res.on("data", () => {});
      res.on("end", () => resolve());
    });

    req.on("error", (e) => {
      console.error("notifyMerchantNeedReview error:", e.message);
      // 通知失败也不要影响用户端自身接口
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// ==================== 建表 ====================

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,

  shop_name         TEXT NOT NULL,
  channel           TEXT NOT NULL,

  order_title       TEXT NOT NULL,
  order_no          TEXT NOT NULL,
  tracking_no       TEXT NOT NULL UNIQUE,

  price_cents       INTEGER NOT NULL,
  quantity          INTEGER NOT NULL,

  image_url         TEXT,
  item_spec         TEXT,

  remark            TEXT,
  advantage_tags    TEXT,

  status            TEXT NOT NULL,

  sender_province   TEXT,
  sender_city       TEXT,
  sender_address    TEXT,
  sender_lng        REAL,
  sender_lat        REAL,

  receiver_province TEXT,
  receiver_city     TEXT,
  receiver_address  TEXT,
  receiver_lng      REAL,
  receiver_lat      REAL,

  receiver_name     TEXT,
  receiver_phone    TEXT,

  eta_time          TEXT,

  created_at        TEXT,
  paid_at           TEXT,
  shipped_at        TEXT,
  finished_at       TEXT,
  updated_at        TEXT,

  exception_reason  TEXT
);

CREATE TABLE IF NOT EXISTS order_route_points (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  seq             INTEGER NOT NULL,
  lng             REAL NOT NULL,
  lat             REAL NOT NULL,
  city            TEXT,
  status          TEXT,
  description     TEXT,
  time            TEXT,
  pickup_code     TEXT,
  pickup_station  TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS order_realtime (
  order_id    INTEGER PRIMARY KEY,
  lng         REAL NOT NULL,
  lat         REAL NOT NULL,
  status      TEXT,
  eta_time    TEXT,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS order_influencers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  influencer_name TEXT NOT NULL,
  buyers_count    INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
`);

// 补字段（兼容老库）删库重启也正常工作
try {
  const colsOrders = db
    .prepare("PRAGMA table_info(orders)")
    .all()
    .map((c) => c.name);

  if (!colsOrders.includes("receiver_name")) {
    db.exec("ALTER TABLE orders ADD COLUMN receiver_name TEXT");
  }
  if (!colsOrders.includes("receiver_phone")) {
    db.exec("ALTER TABLE orders ADD COLUMN receiver_phone TEXT");
  }
  if (!colsOrders.includes("eta_time")) {
    db.exec("ALTER TABLE orders ADD COLUMN eta_time TEXT");
  }
  if (!colsOrders.includes("exception_reason")) {
    db.exec("ALTER TABLE orders ADD COLUMN exception_reason TEXT");
  }

  const colsRoute = db
    .prepare("PRAGMA table_info(order_route_points)")
    .all()
    .map((c) => c.name);
  if (!colsRoute.includes("pickup_code")) {
    db.exec("ALTER TABLE order_route_points ADD COLUMN pickup_code TEXT");
  }
  if (!colsRoute.includes("pickup_station")) {
    db.exec("ALTER TABLE order_route_points ADD COLUMN pickup_station TEXT");
  }

  // order_influencers 如果旧库里没有，也建一下
  const colsInfluencers = db
    .prepare("PRAGMA table_info(order_influencers)")
    .all()
    .map((c) => c.name);
  if (colsInfluencers.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_influencers (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id        INTEGER NOT NULL,
        influencer_name TEXT NOT NULL,
        buyers_count    INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `);
  }
} catch (e) {
  console.warn("补字段警告（可忽略）:", e.message);
}

// ==================== Seed Demo 订单 ====================

const row = db.prepare("SELECT COUNT(*) AS c FROM orders").get();
if (row.c === 0) {
  console.log("Seeding rich demo data (7 orders)...");

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      shop_name, channel,
      order_title, order_no, tracking_no,
      price_cents, quantity,
      image_url, item_spec,
      remark, advantage_tags,
      status,
      sender_province, sender_city, sender_address, sender_lng, sender_lat,
      receiver_province, receiver_city, receiver_address, receiver_lng, receiver_lat,
      receiver_name, receiver_phone,
      eta_time,
      created_at, paid_at, shipped_at, finished_at, updated_at,
      exception_reason
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertRoute = db.prepare(`
    INSERT INTO order_route_points
      (order_id, seq, lng, lat, city, status, description, time, pickup_code, pickup_station)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRealtime = db.prepare(`
    INSERT INTO order_realtime
      (order_id, lng, lat, status, eta_time, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?)
  `);

  const insertInfluencer = db.prepare(`
    INSERT INTO order_influencers (order_id, influencer_name, buyers_count)
    VALUES (?, ?, ?)
  `);

  function seedInfluencers(orderId, list) {
    list.forEach((item) => {
      insertInfluencer.run(orderId, item.influencer_name, item.buyers_count);
    });
  }

  // ====== 线路模板（略，保持你原来的，下面全都没动） ======
  const routeBJ_TJ_LY_SH = [
    {
      lng: 116.407,
      lat: 39.904,
      city: "北京市",
      status: "已揽收",
      description: "快件已由【北京朝阳仓】揽收，准备发往【北京转运中心】",
      time: "2025-11-20T09:30:00",
    },
    {
      lng: 117.2,
      lat: 39.133,
      city: "天津市",
      status: "运输中",
      description: "快件已到达【天津转运中心】，准备发往【上海转运中心】",
      time: "2025-11-20T13:50:00",
    },
    {
      lng: 121.4,
      lat: 31.22,
      city: "上海市长宁区",
      status: "派送中",
      description: "快件已到达【长宁××营业部】，正在派送途中。",
      time: "2025-11-21T09:30:00",
    },
    {
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "待取件",
      description: "快件已放入【徐汇区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-21T11:20:00",
    },
  ];

  const routeSY_JN_SH = [
    {
      lng: 123.431,
      lat: 41.796,
      city: "辽宁省沈阳市",
      status: "已揽收",
      description: "快件已由【沈阳铁西仓】揽收，准备发往【沈阳转运中心】",
      time: "2025-11-18T10:10:00",
    },
    {
      lng: 117.12,
      lat: 36.651,
      city: "山东省济南市",
      status: "运输中",
      description: "快件已到达【济南转运中心】，准备发往【南京转运中心】",
      time: "2025-11-18T19:40:00",
    },
    {
      lng: 118.802,
      lat: 32.064,
      city: "江苏省南京市",
      status: "派送中",
      description: "快件已到达【南京集散中心】，准备发往【上海长宁自提点】",
      time: "2025-11-19T06:30:00",
    },
    {
      lng: 121.4,
      lat: 31.22,
      city: "上海市长宁区",
      status: "待取件",
      description: "快件已放入【长宁××自提柜】，请尽快前往自提点取件。",
      time: "2025-11-19T11:20:00",
    },
  ];

  const routeGZ_CS_WH_Pudong = [
    {
      lng: 113.264,
      lat: 23.129,
      city: "广东省广州市",
      status: "已揽收",
      description: "快件已由【广州白云仓】揽收，准备发往【广州转运中心】",
      time: "2025-11-17T09:20:00",
    },
    {
      lng: 112.982,
      lat: 28.194,
      city: "湖南省长沙市",
      status: "运输中",
      description: "快件已到达【长沙转运中心】，准备发往【武汉转运中心】",
      time: "2025-11-17T17:50:00",
    },
    {
      lng: 114.305,
      lat: 30.592,
      city: "湖北省武汉市",
      status: "运输中",
      description: "快件已到达【武汉转运中心】，正发往【上海转运中心】",
      time: "2025-11-18T02:50:00",
    },
    {
      lng: 121.614,
      lat: 31.214,
      city: "上海市浦东新区",
      status: "派送中",
      description: "快件已到达【浦东××营业部】，正在派送途中。",
      time: "2025-11-18T11:20:00",
    },
    {
      lng: 121.614,
      lat: 31.214,
      city: "上海市浦东新区",
      status: "待取件",
      description: "快件已放入【浦东新区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-18T13:00:00",
    },
  ];

  const routeSZ_HZ_Minhang = [
    {
      lng: 114.057,
      lat: 22.543,
      city: "广东省深圳市",
      status: "已揽收",
      description: "快件已由【深圳龙华仓】揽收，准备发往【深圳转运中心】",
      time: "2025-11-16T09:00:00",
    },
    {
      lng: 120.155,
      lat: 30.274,
      city: "浙江省杭州市",
      status: "运输中",
      description: "快件已到达【杭州转运中心】，正发往【上海转运中心】",
      time: "2025-11-16T18:30:00",
    },
    {
      lng: 121.408,
      lat: 31.172,
      city: "上海市闵行区",
      status: "派送中",
      description: "快件已到达【闵行××营业部】，正在派送途中。",
      time: "2025-11-17T09:30:00",
    },
    {
      lng: 121.408,
      lat: 31.172,
      city: "上海市闵行区",
      status: "待取件",
      description: "快件已放入【闵行区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-17T11:00:00",
    },
  ];

  const routeCD_CQ_HF_SH = [
    {
      lng: 104.066,
      lat: 30.572,
      city: "四川省成都市",
      status: "已揽收",
      description: "快件已由【成都青白江仓】揽收，准备发往【成都转运中心】",
      time: "2025-11-15T08:30:00",
    },
    {
      lng: 106.551,
      lat: 29.563,
      city: "重庆市",
      status: "运输中",
      description: "快件已到达【重庆转运中心】，准备发往【合肥转运中心】",
      time: "2025-11-15T17:10:00",
    },
    {
      lng: 117.227,
      lat: 31.82,
      city: "安徽省合肥市",
      status: "运输中",
      description: "快件已到达【合肥转运中心】，正发往【上海转运中心】",
      time: "2025-11-16T03:40:00",
    },
    {
      lng: 121.4,
      lat: 31.22,
      city: "上海市长宁区",
      status: "派送中",
      description: "快件已到达【长宁××营业部】，正在派送途中。",
      time: "2025-11-16T12:30:00",
    },
    {
      lng: 121.4,
      lat: 31.22,
      city: "上海市长宁区",
      status: "待取件",
      description: "快件已放入【长宁区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-16T15:00:00",
    },
  ];

  const routeHZ_JX_XH = [
    {
      lng: 120.155,
      lat: 30.274,
      city: "浙江省杭州市",
      status: "已揽收",
      description: "快件已由【杭州余杭仓】揽收，准备发往【杭州转运中心】",
      time: "2025-11-19T10:00:00",
    },
    {
      lng: 120.755,
      lat: 30.746,
      city: "浙江省嘉兴市",
      status: "运输中",
      description: "快件已到达【嘉兴转运中心】，正发往【上海转运中心】",
      time: "2025-11-19T14:20:00",
    },
    {
      lng: 121.408,
      lat: 31.172,
      city: "上海市闵行区",
      status: "派送中",
      description: "快件已到达【闵行××营业部】，正在派送途中。",
      time: "2025-11-19T18:30:00",
    },
    {
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "待取件",
      description: "快件已放入【徐汇区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-19T19:05:00",
    },
  ];

  const routeLocalSH = [
    {
      lng: 121.266,
      lat: 31.374,
      city: "上海市嘉定区",
      status: "已揽收",
      description: "快件已由【嘉定仓】揽收，准备发往【宝山转运点】",
      time: "2025-11-20T09:20:00",
    },
    {
      lng: 121.489,
      lat: 31.404,
      city: "上海市宝山区",
      status: "运输中",
      description: "快件已到达【宝山转运点】，正发往【徐汇营业部】",
      time: "2025-11-20T12:10:00",
    },
    {
      lng: 121.43,
      lat: 31.16,
      city: "上海市徐汇区",
      status: "派送中",
      description: "快件已到达【徐汇营业部】，正在派送途中。",
      time: "2025-11-20T15:30:00",
    },
    {
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "待取件",
      description: "快件已放入【徐汇区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-20T17:45:00",
    },
  ];

  function seedOrder(config) {
    const routePoints = config.routePoints;
    const eta_time = computeEtaTime(config, routePoints);

    const info = insertOrder.run(
      config.shop_name,
      config.channel,
      config.order_title,
      config.order_no,
      config.tracking_no,
      config.price_cents,
      config.quantity,
      config.image_url || null,
      config.item_spec || null,
      config.remark || null,
      config.advantage_tags || null,
      config.status,
      config.sender_province,
      config.sender_city,
      config.sender_address,
      config.sender_lng,
      config.sender_lat,
      config.receiver_province,
      config.receiver_city,
      config.receiver_address,
      config.receiver_lng,
      config.receiver_lat,
      config.receiver_name || null,
      config.receiver_phone || null,
      eta_time,
      config.created_at,
      config.paid_at,
      config.shipped_at,
      config.finished_at,
      config.updated_at,
      null
    );

    const orderId = info.lastInsertRowid;

    routePoints.forEach((p, idx) => {
      insertRoute.run(
        orderId,
        idx,
        p.lng,
        p.lat,
        p.city,
        p.status,
        p.description,
        p.time,
        null,
        null
      );
    });

    if (config.realtime) {
      insertRealtime.run(
        orderId,
        config.realtime.lng,
        config.realtime.lat,
        config.realtime.status || "运输中",
        eta_time,
        config.realtime.updated_at
      );
    }

    ensurePickupInfoForOrder(orderId);

    console.log(
      "Demo order inserted:",
      config.order_no,
      "id =",
      orderId,
      "eta_time =",
      eta_time
    );
    return orderId;
  }

  // ====== 具体 7 条订单（保持你原来的，不再逐条注释） ======
  const orderId1 = seedOrder({
    shop_name: "天猫 百分趣旗舰店",
    channel: "tmall",
    order_title: "奥妙除菌消毒洗衣液 花香柠檬 2L*2 瓶",
    order_no: "TB202511210001",
    tracking_no: "434894534579619",
    price_cents: 2480,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/3965545/pexels-photo-3965545.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "2L*2 瓶 / 花香柠檬",
    remark: "深层去味，除菌率 99.9%，适合日常衣物清洗。",
    advantage_tags: "假一赔四,极速退款,7天无理由退换",
    status: "pending",
    sender_province: "北京市",
    sender_city: "北京市",
    sender_address: "北京市朝阳区 ×× 电商仓",
    sender_lng: 116.407,
    sender_lat: 39.904,
    receiver_province: "上海市",
    receiver_city: "徐汇区",
    receiver_address: "梅陇路130号 华东理工大学 人工货架区",
    receiver_lng: 121.432,
    receiver_lat: 31.148,
    receiver_name: "宋瑞琪",
    receiver_phone: "18200005336",
    created_at: "2025-11-21T10:15:00",
    paid_at: "2025-11-21T10:16:00",
    shipped_at: "2025-11-21T12:00:00",
    finished_at: null,
    updated_at: "2025-11-21T12:00:00",
    routePoints: routeBJ_TJ_LY_SH,
    realtime: {
      lng: 118.8,
      lat: 36.0,
      status: "运输中",
      updated_at: "2025-11-22T09:30:00",
    },
  });

  seedInfluencers(orderId1, [
    { influencer_name: "贾乃亮", buyers_count: 3280 },
    { influencer_name: "陈翔六点半", buyers_count: 1450 },
  ]);

  const orderId2 = seedOrder({
    shop_name: "天猫 官方旗舰店",
    channel: "tmall",
    order_title: "女士长款连帽羽绒服 90绒 保暖外套",
    order_no: "TB202511190002",
    tracking_no: "434894534579620",
    price_cents: 65900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/7671166/pexels-photo-7671166.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "米白色 / M",
    remark: "宽松版型，适合 160cm-170cm 身高，日常通勤保暖。",
    advantage_tags: "顺丰包邮,极速退款",
    status: "pending",
    sender_province: "辽宁省",
    sender_city: "沈阳市",
    sender_address: "沈阳铁西物流园 羽绒服仓",
    sender_lng: 123.431,
    sender_lat: 41.796,
    receiver_province: "上海市",
    receiver_city: "长宁区",
    receiver_address: "上海市长宁区 某某小区 1号楼",
    receiver_lng: 121.4,
    receiver_lat: 31.22,
    receiver_name: "张同学",
    receiver_phone: "18500001111",
    created_at: "2025-11-19T09:12:00",
    paid_at: "2025-11-19T09:13:00",
    shipped_at: "2025-11-19T11:00:00",
    finished_at: null,
    updated_at: "2025-11-19T11:00:00",
    routePoints: routeSY_JN_SH,
    realtime: {
      lng: 118.0,
      lat: 37.5,
      status: "运输中",
      updated_at: "2025-11-19T21:30:00",
    },
  });

  seedInfluencers(orderId2, [
    { influencer_name: "李金铭", buyers_count: 2120 },
    { influencer_name: "李子柒", buyers_count: 960 },
  ]);

  const orderId3 = seedOrder({
    shop_name: "天猫 旗舰跑鞋店",
    channel: "tmall",
    order_title: "男士缓震跑步鞋 网面透气运动鞋",
    order_no: "TB202511180003",
    tracking_no: "434894534579621",
    price_cents: 32900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/1552104/pexels-photo-1552104.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "黑色 / 42 码",
    remark: "适合日常跑步与健身，脚感偏软，建议选大半码。",
    advantage_tags: "七天无理由,运费险",
    status: "pending",
    sender_province: "广东省",
    sender_city: "广州市",
    sender_address: "广州市白云区 运动鞋华南仓",
    sender_lng: 113.264,
    sender_lat: 23.129,
    receiver_province: "上海市",
    receiver_city: "浦东新区",
    receiver_address: "上海市浦东新区 张江高科技园区 某宿舍楼",
    receiver_lng: 121.614,
    receiver_lat: 31.214,
    receiver_name: "李同学",
    receiver_phone: "13900002222",
    created_at: "2025-11-18T08:20:00",
    paid_at: "2025-11-18T08:21:00",
    shipped_at: "2025-11-18T10:30:00",
    finished_at: null,
    updated_at: "2025-11-18T10:30:00",
    routePoints: routeGZ_CS_WH_Pudong,
    realtime: {
      lng: 114.0,
      lat: 29.5,
      status: "运输中",
      updated_at: "2025-11-19T08:00:00",
    },
  });

  seedInfluencers(orderId3, [
    { influencer_name: "董宇辉", buyers_count: 3980 },
    { influencer_name: "陈翔六点半", buyers_count: 820 },
  ]);

  const orderId4 = seedOrder({
    shop_name: "天猫 官方数码旗舰店",
    channel: "tmall",
    order_title: "XPhone 14 Pro 256G 5G手机",
    order_no: "TB202511170004",
    tracking_no: "434894534579622",
    price_cents: 699900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "远峰蓝 / 256G",
    remark: "支持 120Hz 高刷屏，快充头需单独购买。",
    advantage_tags: "官方正品,分期免息,全国联保",
    status: "pending",
    sender_province: "广东省",
    sender_city: "深圳市",
    sender_address: "深圳市龙华区 智能手机华南仓",
    sender_lng: 114.057,
    sender_lat: 22.543,
    receiver_province: "上海市",
    receiver_city: "闵行区",
    receiver_address: "上海市闵行区 某某公寓",
    receiver_lng: 121.408,
    receiver_lat: 31.172,
    receiver_name: "王老师",
    receiver_phone: "13700003333",
    created_at: "2025-11-17T09:00:00",
    paid_at: "2025-11-17T09:01:00",
    shipped_at: "2025-11-17T11:00:00",
    finished_at: null,
    updated_at: "2025-11-17T11:00:00",
    routePoints: routeSZ_HZ_Minhang,
    realtime: {
      lng: 120.5,
      lat: 30.5,
      status: "运输中",
      updated_at: "2025-11-17T21:10:00",
    },
  });

  seedInfluencers(orderId4, [
    { influencer_name: "贾乃亮", buyers_count: 5120 },
    { influencer_name: "董宇辉", buyers_count: 4680 },
  ]);

  const orderId5 = seedOrder({
    shop_name: "天猫 网红零食铺",
    channel: "tmall",
    order_title: "坚果零食大礼包 2.5kg 家庭装",
    order_no: "TB202511160005",
    tracking_no: "434894534579623",
    price_cents: 15900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/4109990/pexels-photo-4109990.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "综合口味 / 礼盒装",
    remark: "含坚果、肉干、膨化等 16 小包，保质期 180 天。",
    advantage_tags: "多件多折,第二件半价",
    status: "pending",
    sender_province: "四川省",
    sender_city: "成都市",
    sender_address: "成都市青白江区 休闲零食仓",
    sender_lng: 104.066,
    sender_lat: 30.572,
    receiver_province: "上海市",
    receiver_city: "长宁区",
    receiver_address: "上海市长宁区 某小区 5 号楼",
    receiver_lng: 121.4,
    receiver_lat: 31.22,
    receiver_name: "赵同学",
    receiver_phone: "13600004444",
    created_at: "2025-11-16T08:10:00",
    paid_at: "2025-11-16T08:11:00",
    shipped_at: "2025-11-16T10:00:00",
    finished_at: null,
    updated_at: "2025-11-16T10:00:00",
    routePoints: routeCD_CQ_HF_SH,
    realtime: {
      lng: 117.5,
      lat: 31.5,
      status: "运输中",
      updated_at: "2025-11-17T09:40:00",
    },
  });

  seedInfluencers(orderId5, [
    { influencer_name: "陈翔六点半", buyers_count: 3520 },
    { influencer_name: "贾乃亮", buyers_count: 1888 },
  ]);

  const orderId6 = seedOrder({
    shop_name: "天猫 数码配件旗舰店",
    channel: "tmall",
    order_title: "蓝牙降噪耳机 入耳式",
    order_no: "TB202511150006",
    tracking_no: "434894534579624",
    price_cents: 29900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "珍珠白 / 标配充电仓",
    remark: "支持主动降噪与通透模式，可同时连接两台设备。",
    advantage_tags: "30天无忧退换,赠运费险",
    status: "pending",
    sender_province: "浙江省",
    sender_city: "杭州市",
    sender_address: "杭州市余杭区 数码仓储中心",
    sender_lng: 120.155,
    sender_lat: 30.274,
    receiver_province: "上海市",
    receiver_city: "徐汇区",
    receiver_address: "上海市徐汇区 某学生公寓",
    receiver_lng: 121.432,
    receiver_lat: 31.148,
    receiver_name: "钱同学",
    receiver_phone: "13500005555",
    created_at: "2025-11-15T09:20:00",
    paid_at: "2025-11-15T09:21:00",
    shipped_at: "2025-11-15T11:00:00",
    finished_at: null,
    updated_at: "2025-11-15T11:00:00",
    routePoints: routeHZ_JX_XH,
    realtime: {
      lng: 120.9,
      lat: 31.0,
      status: "运输中",
      updated_at: "2025-11-15T20:10:00",
    },
  });

  seedInfluencers(orderId6, [
    { influencer_name: "李金铭", buyers_count: 1680 },
    { influencer_name: "董宇辉", buyers_count: 950 },
  ]);

  const orderId7 = seedOrder({
    shop_name: "淘宝 城市鲜花速递",
    channel: "taobao",
    order_title: "鲜花速递 玫瑰花束 19 朵",
    order_no: "TB202511140007",
    tracking_no: "434894534579625",
    price_cents: 19900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/931162/pexels-photo-931162.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "红玫瑰 / 含花瓶",
    remark: "同城当日达，默认不附贺卡，如需留言可在备注填写。",
    advantage_tags: "同城闪送,破损包赔",
    status: "pending",
    sender_province: "上海市",
    sender_city: "嘉定区",
    sender_address: "上海市嘉定区 鲜花冷链仓",
    sender_lng: 121.266,
    sender_lat: 31.374,
    receiver_province: "上海市",
    receiver_city: "徐汇区",
    receiver_address: "上海市徐汇区 某写字楼 前台",
    receiver_lng: 121.432,
    receiver_lat: 31.148,
    receiver_name: "陈小姐",
    receiver_phone: "13800006666",
    created_at: "2025-11-14T09:05:00",
    paid_at: "2025-11-14T09:06:00",
    shipped_at: "2025-11-14T10:00:00",
    finished_at: null,
    updated_at: "2025-11-14T10:00:00",
    routePoints: routeLocalSH,
    realtime: {
      lng: 121.4,
      lat: 31.3,
      status: "派送中",
      updated_at: "2025-11-14T11:30:00",
    },
  });

  seedInfluencers(orderId7, [
    { influencer_name: "李子柒", buyers_count: 2760 },
  ]);

  console.log("Rich demo data (7 orders) seeding finished.");
}

// ================= HTTP 接口 =================

// 订单列表（带取件码）
app.get("/api/orders", (req, res) => {
  const orders = db
    .prepare(
      `
      SELECT
        id,
        shop_name,
        channel,
        order_title,
        order_no,
        tracking_no,
        price_cents,
        quantity,
        image_url,
        item_spec,
        remark,
        advantage_tags,
        status,
        sender_city,
        receiver_city,
        receiver_address,
        receiver_name,
        receiver_phone,
        eta_time,
        created_at,
        exception_reason
      FROM orders
      ORDER BY created_at DESC
    `
    )
    .all();

  const pickupStmt = db.prepare(`
    SELECT
      seq,
      pickup_code AS code,
      pickup_station AS station
    FROM order_route_points
    WHERE order_id = ?
      AND pickup_code IS NOT NULL
    ORDER BY seq
    LIMIT 1
  `);

  const enriched = orders.map((o) => {
    const pickup = pickupStmt.get(o.id);

    if (pickup) {
      o.pickup_code = pickup.code;
      o.pickup_station = pickup.station;
      // 如果需要，可以在前端根据 pickup_code 判断“待取件”横条
    }

    return o;
  });

  res.json(enriched);
});

// 通过运单号查表
app.get("/api/tracking/:trackingNo", (req, res) => {
  const trackingNo = req.params.trackingNo;

  const order = db
    .prepare("SELECT * FROM orders WHERE tracking_no = ?")
    .get(trackingNo);

  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  const route = db
    .prepare(
      "SELECT * FROM order_route_points WHERE order_id = ? ORDER BY seq ASC"
    )
    .all(order.id);

  ensurePickupInfoForOrder(order.id);

  let realtime = db
    .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
    .get(order.id);

  const eta = computeEtaTime(order, route);
  if (eta) {
    order.eta_time = eta;
    if (realtime) {
      realtime.eta_time = eta;
    }

    db.prepare("UPDATE orders SET eta_time = ? WHERE id = ?").run(
      eta,
      order.id
    );
    if (realtime) {
      db.prepare(
        "UPDATE order_realtime SET eta_time = ? WHERE order_id = ?"
      ).run(eta, order.id);
    }
  }

  const influencers = db
    .prepare(
      `
      SELECT id, influencer_name, buyers_count
      FROM order_influencers
      WHERE order_id = ?
      ORDER BY buyers_count DESC
    `
    )
    .all(order.id);

  res.json({
    order,
    route,
    realtime,
    influencers,
  });
});

// ========== 用户在订单页点击“确认收货” ==========
app.post("/api/orders/:orderNo/confirm", async (req, res) => {
  const orderNo = req.params.orderNo;

  const order = db
    .prepare("SELECT id FROM orders WHERE order_no = ?")
    .get(orderNo);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  await notifyMerchantNeedReview(orderNo);

  return res.json({ ok: true, success: true });
});

// ========== 商家端“发货”后，通知用户端把订单改成已发货（delivering） ==========
// 商家端会调用：POST http://localhost:3002/api/merchant/ship  body: { order_no }
app.post("/api/merchant/ship", (req, res) => {
  const { order_no } = req.body;

  if (!order_no) {
    return res.status(400).json({ message: "order_no 不能为空" });
  }

  const order = db
    .prepare("SELECT id, status, shipped_at FROM orders WHERE order_no = ?")
    .get(order_no);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const now = new Date().toISOString();

  // 把本地订单状态标记为 “delivering”（在路上/待收货）
  db.prepare(
    `
      UPDATE orders
      SET status = 'delivering',
          shipped_at = COALESCE(shipped_at, ?),
          updated_at = ?
      WHERE order_no = ?
    `
  ).run(now, now, order_no);

  console.log("[MOBILE] merchant ship -> set status=delivering:", order_no);

  return res.json({ ok: true, message: "order marked as delivering" });
});

// ================= WebSocket + 简易消息队列 =================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const simulators = new Map(); // trackingNo -> { timer, orderId }

// 以下 WebSocket / MQ / 模拟器 部分保持不变（你的原来逻辑全部保留）
// ……（为了不刷屏，这一段我没做任何改动，保持和你发的一模一样）……

// 这里开始直到文件结尾，所有逻辑和你原来的一致，我只保留了接口改动前后的结构
// ========== 下面整块都没动 ==========

// 模拟器步长
const SIM_TICK_MS = 2000;
const SIM_STEPS_PER_SEGMENT = 5;

const logisticsQueue = [];

const EXCEPTION_TRACKING_SET = new Set(["434894534579619"]);

function getLogisticsStatus(orderId, realtime) {
  const orderRow = db
    .prepare("SELECT exception_reason FROM orders WHERE id = ?")
    .get(orderId);
  if (orderRow && orderRow.exception_reason) {
    return {
      logisticsStatus: "异常",
      exceptionReason: orderRow.exception_reason,
    };
  }
  if (realtime && realtime.status) {
    return {
      logisticsStatus: realtime.status,
      exceptionReason: null,
    };
  }

  const lastRoute = db
    .prepare(
      "SELECT status FROM order_route_points WHERE order_id = ? ORDER BY seq DESC LIMIT 1"
    )
    .get(orderId);

  return {
    logisticsStatus: (lastRoute && lastRoute.status) || "运输中",
    exceptionReason: null,
  };
}

function checkAndUpdateExceptionByMq(orderId, seq, mqStatus) {
  if (typeof seq !== "number") {
    return { match: true, expectedStatus: null };
  }

  const row = db
    .prepare(
      "SELECT status FROM order_route_points WHERE order_id = ? AND seq = ?"
    )
    .get(orderId, seq);

  if (!row || !row.status) {
    return { match: true, expectedStatus: null };
  }

  const expectedStatus = row.status;
  const match = expectedStatus === mqStatus;

  if (match) {
    db.prepare("UPDATE orders SET exception_reason = NULL WHERE id = ?").run(
      orderId
    );
  } else {
    const reason = `实时状态与预设不一致（预设：${expectedStatus}，MQ：${mqStatus}）`;
    db.prepare("UPDATE orders SET exception_reason = ? WHERE id = ?").run(
      reason,
      orderId
    );
    console.log("[MQ EXCEPTION]", { orderId, seq, expectedStatus, mqStatus });
  }

  return { match, expectedStatus };
}

function publishLogisticsEvent(event) {
  logisticsQueue.push(event);
}

function startLogisticsConsumer() {
  setInterval(() => {
    const evt = logisticsQueue.shift();
    if (!evt) return;

    try {
      if (evt.type === "LOCATION_UPDATE") {
        handleLocationUpdate(evt);
      }
    } catch (e) {
      console.error("handle logistics event error:", e);
    }
  }, 1000);
}

function handleLocationUpdate(evt) {
  const { orderId, trackingNo, lng, lat, status, time, seq } = evt;
  const mqStatus = status || "运输中";

  db.prepare(
    `
    INSERT INTO order_realtime (order_id, lng, lat, status, eta_time, updated_at)
    VALUES (
      ?, ?, ?, ?,
      (SELECT eta_time FROM orders WHERE id = ?),
      ?
    )
    ON CONFLICT(order_id) DO UPDATE SET
      lng = excluded.lng,
      lat = excluded.lat,
      status = excluded.status,
      updated_at = excluded.updated_at
  `
  ).run(orderId, lng, lat, mqStatus, orderId, time || new Date().toISOString());

  if (mqStatus === "待取件" && typeof seq === "number") {
    const point = db
      .prepare(
        "SELECT id, pickup_code, pickup_station, city FROM order_route_points WHERE order_id = ? AND seq = ?"
      )
      .get(orderId, seq);

    if (point) {
      if (!point.pickup_code) {
        const code = generatePickupCode(orderId, seq);
        const station =
          point.pickup_station ||
          (point.city ? `${point.city}××驿站` : "自提点");
        db.prepare(
          "UPDATE order_route_points SET pickup_code = ?, pickup_station = ? WHERE id = ?"
        ).run(code, station, point.id);
        console.log("[MQ PICKUP CODE GENERATED]", {
          orderId,
          seq,
          code,
          station,
        });
      }
    }
  }

  const realtime = db
    .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
    .get(orderId);

  const check = checkAndUpdateExceptionByMq(orderId, seq, mqStatus);

  const logistics = getLogisticsStatus(orderId, realtime);
  const pickupInfo = getPickupInfoFromDb(orderId);

  const payload = JSON.stringify({
    type: "realtime",
    trackingNo,
    realtime,
    logisticsStatus: logistics.logisticsStatus,
    exceptionReason: logistics.exceptionReason,
    mqStatus,
    expectedStatus: check.expectedStatus,
    statusMatch: check.match,
    pickupInfo,
  });

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.trackingNo === trackingNo
    ) {
      client.send(payload);
    }
  });
}

startLogisticsConsumer();

function startSimulator(trackingNo) {
  if (simulators.has(trackingNo)) return;

  const order = db
    .prepare("SELECT id FROM orders WHERE tracking_no = ?")
    .get(trackingNo);
  if (!order) {
    console.warn("No order for trackingNo", trackingNo);
    return;
  }

  const orderId = order.id;
  const routePoints = db
    .prepare(
      "SELECT seq, lng, lat, status, time FROM order_route_points WHERE order_id = ? ORDER BY seq ASC"
    )
    .all(orderId);

  if (!routePoints || routePoints.length < 2) {
    console.warn("Not enough route points for order", orderId);
    return;
  }

  let currentSeqIndex = 0;
  const currentRealtime = db
    .prepare("SELECT lng, lat FROM order_realtime WHERE order_id = ?")
    .get(orderId);

  if (currentRealtime) {
    const { lng: curLng, lat: curLat } = currentRealtime;
    let bestIdx = 0;
    let bestDist = Infinity;

    routePoints.forEach((p, i) => {
      const dx = p.lng - curLng;
      const dy = p.lat - curLat;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    });

    currentSeqIndex = bestIdx;
  }

  if (currentSeqIndex >= routePoints.length - 1) {
    console.log(
      "Order already at last hub (ensure final pickup event):",
      trackingNo
    );
    const last = routePoints[routePoints.length - 1];
    publishLogisticsEvent({
      type: "LOCATION_UPDATE",
      orderId,
      trackingNo,
      lng: last.lng,
      lat: last.lat,
      status: last.status || "待取件",
      seq: last.seq,
      time: last.time || new Date().toISOString(),
    });
    return;
  }

  const waypoints = [];

  function getInterpolatedStatus(fromStatus, toStatus, t) {
    const f = fromStatus || "运输中";
    const to = toStatus || f;
    if (f === to) return f;

    if (f === "已揽收" && to === "运输中") {
      return t < 0.1 ? f : to;
    }

    if (f === "运输中" && to === "派送中") {
      return t < 0.9 ? f : to;
    }

    if (f === "派送中" && to === "待取件") {
      return t < 0.8 ? f : to;
    }

    return t < 0.5 ? f : to;
  }

  for (let i = currentSeqIndex; i < routePoints.length - 1; i++) {
    const from = routePoints[i];
    const to = routePoints[i + 1];

    const dx = to.lng - from.lng;
    const dy = to.lat - from.lat;

    const fromStatus = from.status || "运输中";
    const toStatus = to.status || fromStatus;

    for (let step = 1; step < SIM_STEPS_PER_SEGMENT; step++) {
      const t = step / SIM_STEPS_PER_SEGMENT;

      const segStatus = getInterpolatedStatus(fromStatus, toStatus, t);

      waypoints.push({
        lng: from.lng + dx * t,
        lat: from.lat + dy * t,
        status: segStatus,
        seq: null,
        time: null,
      });
    }

    const defaultStatus = to.status || "运输中";

    if (EXCEPTION_TRACKING_SET.has(trackingNo) && to.seq === 1) {
      const dwellCount = 5;

      waypoints.push({
        lng: to.lng,
        lat: to.lat,
        status: "派送中",
        seq: to.seq,
        time: to.time || null,
      });

      for (let k = 0; k < dwellCount; k++) {
        waypoints.push({
          lng: to.lng,
          lat: to.lat,
          status: "派送中",
          seq: null,
          time: null,
        });
      }

      waypoints.push({
        lng: to.lng,
        lat: to.lat,
        status: defaultStatus,
        seq: to.seq,
        time: null,
      });
    } else {
      waypoints.push({
        lng: to.lng,
        lat: to.lat,
        status: defaultStatus,
        seq: to.seq,
        time: to.time || null,
      });
    }
  }

  if (!waypoints.length) {
    console.warn("No waypoints generated for order", orderId);
    return;
  }

  let idx = -1;

  const timer = setInterval(() => {
    idx += 1;
    if (idx >= waypoints.length) {
      clearInterval(timer);
      simulators.delete(trackingNo);
      return;
    }

    const wp = waypoints[idx];

    publishLogisticsEvent({
      type: "LOCATION_UPDATE",
      orderId,
      trackingNo,
      lng: wp.lng,
      lat: wp.lat,
      status: wp.status,
      seq: wp.seq,
      time: wp.time || new Date().toISOString(),
    });
  }, SIM_TICK_MS);

  simulators.set(trackingNo, { timer, orderId });
}

function stopSimulator(trackingNo) {
  const sim = simulators.get(trackingNo);
  if (!sim) return;
  clearInterval(sim.timer);
  simulators.delete(trackingNo);
}

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      console.error("Invalid ws message", e);
      return;
    }

    if (data.type === "subscribe" && data.trackingNo) {
      const trackingNo = data.trackingNo;
      ws.trackingNo = trackingNo;

      const order = db
        .prepare("SELECT id FROM orders WHERE tracking_no = ?")
        .get(trackingNo);
      if (order) {
        const realtime = db
          .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
          .get(order.id);
        const pickupInfo = getPickupInfoFromDb(order.id);
        if (realtime) {
          const logistics = getLogisticsStatus(order.id, realtime);
          ws.send(
            JSON.stringify({
              type: "realtime",
              trackingNo,
              realtime,
              logisticsStatus: logistics.logisticsStatus,
              exceptionReason: logistics.exceptionReason,
              mqStatus: realtime.status || null,
              expectedStatus: null,
              statusMatch: !logistics.exceptionReason,
              pickupInfo,
            })
          );
        }
      }

      startSimulator(trackingNo);
    }
  });

  ws.on("close", () => {
    const trackingNo = ws.trackingNo;
    if (!trackingNo) return;

    const hasOtherClients = Array.from(wss.clients).some(
      (client) =>
        client !== ws &&
        client.readyState === WebSocket.OPEN &&
        client.trackingNo === trackingNo
    );

    if (!hasOtherClients) {
      stopSimulator(trackingNo);
    }

    console.log("WebSocket closed");
  });
});

// ====================调试：重置小车到起点==============
app.post("/api/debug/resetRealtime/:trackingNo", (req, res) => {
  const trackingNo = req.params.trackingNo;

  const order = db
    .prepare("SELECT id, eta_time FROM orders WHERE tracking_no = ?")
    .get(trackingNo);

  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  const orderId = order.id;

  const firstPoint = db
    .prepare(
      "SELECT seq, lng, lat, status FROM order_route_points WHERE order_id = ? ORDER BY seq ASC LIMIT 1"
    )
    .get(orderId);

  if (!firstPoint) {
    res.status(400).json({ message: "No route points for this order" });
    return;
  }

  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO order_realtime (order_id, lng, lat, status, eta_time, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      lng = excluded.lng,
      lat = excluded.lat,
      status = excluded.status,
      eta_time = excluded.eta_time,
      updated_at = excluded.updated_at
  `
  ).run(
    orderId,
    firstPoint.lng,
    firstPoint.lat,
    firstPoint.status || "已揽收",
    order.eta_time,
    now
  );

  db.prepare("UPDATE orders SET exception_reason = NULL WHERE id = ?").run(
    orderId
  );
  db.prepare(
    "UPDATE order_route_points SET pickup_code = NULL, pickup_station = NULL WHERE order_id = ?"
  ).run(orderId);

  const realtime = db
    .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
    .get(orderId);

  const logistics = getLogisticsStatus(orderId, realtime);

  const payload = JSON.stringify({
    type: "realtime",
    trackingNo,
    realtime,
    logisticsStatus: logistics.logisticsStatus,
    exceptionReason: logistics.exceptionReason,
    mqStatus: realtime.status || null,
    expectedStatus: null,
    statusMatch: !logistics.exceptionReason,
    pickupInfo: null,
  });

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.trackingNo === trackingNo
    ) {
      client.send(payload);
    }
  });

  stopSimulator(trackingNo);
  startSimulator(trackingNo);

  res.json({ message: "realtime reset", trackingNo });
});

// ================= 启动服务 =================

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Mobile logistics server running at http://localhost:${PORT}`);
});
