// server/index.js
const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// 1. 连接 / 创建 SQLite 数据库文件
const dbFile = path.join(__dirname, "logistics-mobile.db");
const db = new Database(dbFile);

// 2. 建表（如果不存在）
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,

  shop_name       TEXT NOT NULL,
  channel         TEXT NOT NULL,

  order_title     TEXT NOT NULL,
  order_no        TEXT NOT NULL,
  tracking_no     TEXT NOT NULL UNIQUE,

  price_cents     INTEGER NOT NULL,
  quantity        INTEGER NOT NULL,

  image_url       TEXT,
  item_spec       TEXT,

  remark          TEXT,
  advantage_tags  TEXT,

  status          TEXT NOT NULL,

  sender_province TEXT,
  sender_city     TEXT,
  sender_address  TEXT,
  sender_lng      REAL,
  sender_lat      REAL,

  receiver_province TEXT,
  receiver_city     TEXT,
  receiver_address  TEXT,
  receiver_lng      REAL,
  receiver_lat      REAL,

  eta_time        TEXT,

  created_at      TEXT,
  paid_at         TEXT,
  shipped_at      TEXT,
  finished_at     TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS order_route_points (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL,
  seq         INTEGER NOT NULL,
  lng         REAL NOT NULL,
  lat         REAL NOT NULL,
  city        TEXT,
  status      TEXT,
  description TEXT,
  time        TEXT,
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
`);

// 3. 如果目前 orders 表是空的，插入多条测试订单
const row = db.prepare("SELECT COUNT(*) AS c FROM orders").get();
if (row.c === 0) {
  console.log("Seeding rich demo data...");

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
      eta_time,
      created_at, paid_at, shipped_at, finished_at, updated_at
    ) VALUES (
      ?,?,?,?,?,?,
      ?,?,
      ?,?,
      ?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,?
    )
  `);

  const insertRoute = db.prepare(`
    INSERT INTO order_route_points
      (order_id, seq, lng, lat, city, status, description, time)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRealtime = db.prepare(`
    INSERT INTO order_realtime
      (order_id, lng, lat, status, eta_time, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?)
  `);

  // ========= 几条不同的真实线路模板 =========

  // 北京 → 天津 → 临沂 → 上海（华理）
  const routeBJToSH = [
    {
      lng: 116.407,
      lat: 39.904,
      city: "北京市",
      status: "已揽收",
      description: "快件已由【北京揽收点】揽收，准备发往【北京转运中心】",
      time: "2025-11-16T09:30:00",
    },
    {
      lng: 117.2,
      lat: 39.133,
      city: "天津市",
      status: "运输中",
      description: "快件已到达【天津转运中心】，准备发往【临沂转运中心】",
      time: "2025-11-16T14:20:00",
    },
    {
      lng: 118.356,
      lat: 35.106,
      city: "山东省临沂市",
      status: "运输中",
      description: "快件已到达【临沂转运中心】，正发往【上海转运中心】",
      time: "2025-11-16T20:10:00",
    },
    {
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "待取件",
      description:
        "快件已在【华东理工大学(徐汇校区)】暂放，【取件地址：梅陇路130号华东理工大学人工货架区】，请尽快前往自提点取件。",
      time: "2025-11-17T11:22:00",
    },
  ];

  // 广州 → 长沙 → 武汉 → 上海（浦东）
  const routeGZToPudong = [
    {
      lng: 113.264,
      lat: 23.129,
      city: "广东省广州市",
      status: "已揽收",
      description: "快件已由【广州白云仓】揽收，准备发往【广州转运中心】",
      time: "2025-11-14T10:30:00",
    },
    {
      lng: 112.982,
      lat: 28.194,
      city: "湖南省长沙市",
      status: "运输中",
      description: "快件已到达【长沙转运中心】，准备发往【武汉转运中心】",
      time: "2025-11-14T18:50:00",
    },
    {
      lng: 114.305,
      lat: 30.592,
      city: "湖北省武汉市",
      status: "运输中",
      description: "快件已到达【武汉转运中心】，正发往【上海转运中心】",
      time: "2025-11-15T03:15:00",
    },
    {
      lng: 121.614,
      lat: 31.214,
      city: "上海市浦东新区",
      status: "派送中",
      description: "快件已到达【浦东XX营业部】，正在派送途中，请保持电话畅通。",
      time: "2025-11-15T11:10:00",
    },
  ];

  // 深圳 → 杭州 → 上海（闵行）
  const routeSZToMinhang = [
    {
      lng: 114.057,
      lat: 22.543,
      city: "广东省深圳市",
      status: "已揽收",
      description: "快件已由【深圳龙华仓】揽收，准备发往【深圳转运中心】",
      time: "2025-11-18T09:20:00",
    },
    {
      lng: 120.155,
      lat: 30.274,
      city: "浙江省杭州市",
      status: "运输中",
      description: "快件已到达【杭州转运中心】，正发往【上海转运中心】",
      time: "2025-11-18T18:40:00",
    },
    {
      lng: 121.408,
      lat: 31.172,
      city: "上海市闵行区",
      status: "派送中",
      description: "快件已到达【闵行××驿站】，正在派送途中，预计今晚送达。",
      time: "2025-11-19T09:10:00",
    },
  ];

  // 成都 → 重庆 → 合肥 → 上海（长宁）
  const routeCDToChangning = [
    {
      lng: 104.066,
      lat: 30.572,
      city: "四川省成都市",
      status: "已揽收",
      description: "快件已由【成都青白江仓】揽收，准备发往【成都转运中心】",
      time: "2025-11-12T08:45:00",
    },
    {
      lng: 106.551,
      lat: 29.563,
      city: "重庆市",
      status: "运输中",
      description: "快件已到达【重庆转运中心】，准备发往【合肥转运中心】",
      time: "2025-11-12T16:30:00",
    },
    {
      lng: 117.227,
      lat: 31.82,
      city: "安徽省合肥市",
      status: "运输中",
      description: "快件已到达【合肥转运中心】，正发往【上海转运中心】",
      time: "2025-11-13T03:50:00",
    },
    {
      lng: 121.4,
      lat: 31.22,
      city: "上海市长宁区",
      status: "派送中",
      description: "快件已到达【长宁××营业部】，正在派送途中，请保持电话畅通。",
      time: "2025-11-13T12:10:00",
    },
  ];

  // 杭州 → 嘉兴 → 上海（徐汇）
  const routeHZToXuhui = [
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
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "待取件",
      description: "快件已到达【徐汇区××驿站】，请尽快前往自提点取件。",
      time: "2025-11-19T19:05:00",
    },
  ];

  // 上海市内：嘉定仓 → 宝山 → 徐汇（同城快递）
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
      lng: 121.432,
      lat: 31.148,
      city: "上海市徐汇区",
      status: "派送中",
      description: "快件已到达【徐汇营业部】，正在派送途中，预计今晚送达。",
      time: "2025-11-20T17:45:00",
    },
  ];

  /**
   * 根据发货时间 + 轨迹点数量计算预计送达时间（最多 3 天）
   * - 轨迹点 <= 2  → +1 天
   * - 轨迹点 == 3  → +2 天
   * - 轨迹点 >= 4  → +3 天（封顶）
   */
  function computeEtaTime(shippedAt, routePoints) {
    if (!shippedAt) return null;
    const n = routePoints?.length || 0;
    let addDays = 1;
    if (n <= 2) {
      addDays = 1;
    } else if (n === 3) {
      addDays = 2;
    } else {
      addDays = 3;
    }
    const d = new Date(shippedAt);
    d.setDate(d.getDate() + addDays);
    return d.toISOString();
  }

  /**
   * 小工具：插入一条订单 + 对应的路线 + 实时位置
   * 这里统一用 computeEtaTime 计算 eta_time
   */
  function seedOrder(config) {
    const routePoints = config.routePoints || routeBJToSH;

    // ⭐ 根据发货时间 + 轨迹点数量算 eta
    const eta_time = computeEtaTime(config.shipped_at, routePoints);

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
      eta_time,
      config.created_at,
      config.paid_at,
      config.shipped_at,
      config.finished_at,
      config.updated_at
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
        p.time
      );
    });

    if (config.realtime) {
      insertRealtime.run(
        orderId,
        config.realtime.lng,
        config.realtime.lat,
        config.realtime.status || "运输中",
        eta_time, // ⭐ 实时表也用统一的 eta
        config.realtime.updated_at
      );
    }

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

  // ========= 具体订单 =========

  // 1）奥妙洗衣液
  seedOrder({
    shop_name: "天猫 百分趣旗舰店",
    channel: "tmall",
    order_title: "奥妙除菌消毒洗衣液 花香柠檬 2L*2 瓶",
    order_no: "TB202511280001",
    tracking_no: "434894534579619",
    price_cents: 2480,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/3965545/pexels-photo-3965545.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "薰衣草香型 / 2L*2 瓶",
    remark: "深层去味，除菌率 99.9%",
    advantage_tags: "假一赔四,极速退款,7天无理由退换",
    status: "delivering",
    sender_province: "山东省",
    sender_city: "临沂市",
    sender_address: "临沂市某某仓库",
    sender_lng: 118.356,
    sender_lat: 35.106,
    receiver_province: "上海市",
    receiver_city: "徐汇区",
    receiver_address: "梅陇路130号 华东理工大学 人工货架区",
    receiver_lng: 121.432,
    receiver_lat: 31.148,
    created_at: "2025-11-16T20:15:00",
    paid_at: "2025-11-16T20:16:00",
    shipped_at: "2025-11-16T22:00:00",
    finished_at: null,
    updated_at: "2025-11-16T22:00:00",
    routePoints: routeBJToSH,
    realtime: {
      lng: 120.0,
      lat: 32.0,
      status: "运输中",
      updated_at: "2025-11-18T20:55:00",
    },
  });

  // 2）移动电源
  seedOrder({
    shop_name: "京东京造自营旗舰店",
    channel: "tmall",
    order_title: "京造 20000mAh 移动电源 PD 快充版",
    order_no: "TB202511280002",
    tracking_no: "434894534579620",
    price_cents: 12900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/4042804/pexels-photo-4042804.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "白色，20000mAh",
    remark: "支持 65W 快充",
    advantage_tags: "自营,次日达,7天无理由退换",
    status: "delivering",
    sender_province: "广东省",
    sender_city: "广州市",
    sender_address: "广州白云区电商仓",
    sender_lng: 113.264,
    sender_lat: 23.129,
    receiver_province: "上海市",
    receiver_city: "浦东新区",
    receiver_address: "张江高科技园区 某某小区 3 号楼",
    receiver_lng: 121.614,
    receiver_lat: 31.214,
    created_at: "2025-11-18T09:10:00",
    paid_at: "2025-11-18T09:12:00",
    shipped_at: "2025-11-18T10:00:00",
    finished_at: null,
    updated_at: "2025-11-18T10:00:00",
    routePoints: routeGZToPudong,
    realtime: {
      lng: 119.8,
      lat: 30.0,
      status: "运输中",
      updated_at: "2025-11-19T21:10:00",
    },
  });

  // 3）蓝牙耳机
  seedOrder({
    shop_name: "小米官方旗舰店",
    channel: "tmall",
    order_title: "小米真无线降噪蓝牙耳机 Pro",
    order_no: "TB202511280003",
    tracking_no: "434894534579621",
    price_cents: 39900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "白色，带降噪",
    remark: "支持主动降噪",
    advantage_tags: "官方正品,保价30天",
    status: "finished",
    sender_province: "广东省",
    sender_city: "东莞市",
    sender_address: "东莞小米组装工厂仓库",
    sender_lng: 113.75,
    sender_lat: 23.04,
    receiver_province: "上海市",
    receiver_city: "浦东新区",
    receiver_address: "张江高科 某某花园 5 号楼",
    receiver_lng: 121.614,
    receiver_lat: 31.214,
    created_at: "2025-11-15T19:30:00",
    paid_at: "2025-11-15T19:31:00",
    shipped_at: "2025-11-16T08:00:00",
    finished_at: "2025-11-18T12:20:00",
    updated_at: "2025-11-18T12:20:00",
    routePoints: routeGZToPudong,
    realtime: {
      lng: 121.614,
      lat: 31.214,
      status: "已签收",
      updated_at: "2025-11-18T12:20:00",
    },
  });

  // 4）毛巾（待付款）
  seedOrder({
    shop_name: "网易严选官方旗舰店",
    channel: "tmall",
    order_title: "网易严选 新疆长绒棉毛巾 四条装",
    order_no: "TB202511280004",
    tracking_no: "434894534579622",
    price_cents: 8900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/3738355/pexels-photo-3738355.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "灰白配色 / 4 条装",
    remark: "柔软亲肤",
    advantage_tags: "严选自营,极速退款",
    status: "pending",
    sender_province: "浙江省",
    sender_city: "杭州市",
    sender_address: "杭州网易严选仓",
    sender_lng: 120.155,
    sender_lat: 30.274,
    receiver_province: "上海市",
    receiver_city: "徐汇区",
    receiver_address: "宜山路 某某小区 2 号楼",
    receiver_lng: 121.432,
    receiver_lat: 31.148,
    created_at: "2025-11-20T10:15:00",
    paid_at: null,
    shipped_at: null,
    finished_at: null,
    updated_at: "2025-11-20T10:15:00",
    routePoints: routeHZToXuhui,
    realtime: null,
  });

  // 5）收纳盒（退款中）
  seedOrder({
    shop_name: "名创优品家居旗舰店",
    channel: "tmall",
    order_title: "北欧风床底收纳盒 三个装",
    order_no: "TB202511280005",
    tracking_no: "434894534579623",
    price_cents: 15900,
    quantity: 1,
    image_url:
      "https://images.pexels.com/photos/4492040/pexels-photo-4492040.jpeg?auto=compress&cs=tinysrgb&w=200",
    item_spec: "透明灰 / 带轮子",
    remark: "",
    advantage_tags: "7天无理由退换",
    status: "refunding",
    sender_province: "江苏省",
    sender_city: "苏州市",
    sender_address: "苏州名创优品仓库",
    sender_lng: 120.62,
    sender_lat: 31.3,
    receiver_province: "上海市",
    receiver_city: "长宁区",
    receiver_address: "虹桥路 某某公寓 8 号楼",
    receiver_lng: 121.4,
    receiver_lat: 31.22,
    created_at: "2025-11-17T15:10:00",
    paid_at: "2025-11-17T15:11:00",
    shipped_at: "2025-11-18T09:00:00",
    finished_at: null,
    updated_at: "2025-11-19T11:30:00",
    routePoints: routeCDToChangning,
    realtime: {
      lng: 120.9,
      lat: 31.0,
      status: "退货运输中",
      updated_at: "2025-11-19T11:30:00",
    },
  });

  // 其余订单
  const defaultImg =
    "https://images.pexels.com/photos/1341877/pexels-photo-1341877.jpeg?auto=compress&cs=tinysrgb&w=200";

  const extraOrders = [
    {
      shop_name: "华为官方旗舰店",
      order_title: "华为 Mate 系列手机保护壳",
      order_no: "TB202511280006",
      tracking_no: "434894534579624",
      price_cents: 9900,
      status: "delivering",
      routePoints: routeBJToSH,
      item_spec: "黑色 / 官方壳",
    },
    {
      shop_name: "优衣库官方旗舰店",
      order_title: "优衣库 男士圆领短袖 T 恤 2 件装",
      order_no: "TB202511280007",
      tracking_no: "434894534579625",
      price_cents: 12900,
      status: "delivering",
      routePoints: routeHZToXuhui,
      item_spec: "白色 / XL*2 件",
    },
    {
      shop_name: "天猫超市",
      order_title: "维达抽纸 24 包 整箱装",
      order_no: "TB202511280008",
      tracking_no: "434894534579626",
      price_cents: 6990,
      status: "finished",
      routePoints: routeLocalSH,
      item_spec: "3 层加厚 / 24 包",
    },
    {
      shop_name: "三只松鼠旗舰店",
      order_title: "三只松鼠 年货大礼包 1368g",
      order_no: "TB202511280009",
      tracking_no: "434894534579627",
      price_cents: 10900,
      status: "delivering",
      routePoints: routeGZToPudong,
      item_spec: "坚果礼包 / 1368g",
    },
    {
      shop_name: "安踏官方旗舰店",
      order_title: "安踏 男子跑步鞋 2025 新款",
      order_no: "TB202511280010",
      tracking_no: "434894534579628",
      price_cents: 32900,
      status: "delivering",
      routePoints: routeSZToMinhang,
      item_spec: "黑白配色 / 42 码",
    },
    {
      shop_name: "NIKE 官方旗舰店",
      order_title: "NIKE 运动短袜 三双装",
      order_no: "TB202511280011",
      tracking_no: "434894534579629",
      price_cents: 8900,
      status: "finished",
      routePoints: routeLocalSH,
      item_spec: "黑白混色 / 3 双装",
    },
    {
      shop_name: "Converse 官方旗舰店",
      order_title: "Converse 经典帆布鞋 黑色",
      order_no: "TB202511280012",
      tracking_no: "434894534579630",
      price_cents: 35900,
      status: "delivering",
      routePoints: routeCDToChangning,
      item_spec: "高帮 / 41 码",
    },
    {
      shop_name: "罗技官方旗舰店",
      order_title: "罗技 MX Master 无线鼠标",
      order_no: "TB202511280013",
      tracking_no: "434894534579631",
      price_cents: 56900,
      status: "finished",
      routePoints: routeGZToPudong,
      item_spec: "深灰色 / 蓝牙双模",
    },
    {
      shop_name: "得力办公旗舰店",
      order_title: "得力 0.5mm 中性笔 12 支装",
      order_no: "TB202511280014",
      tracking_no: "434894534579632",
      price_cents: 1900,
      status: "delivering",
      routePoints: routeLocalSH,
      item_spec: "黑色 / 12 支装",
    },
    {
      shop_name: "乐高官方旗舰店",
      order_title: "乐高 城市系列 积木套装",
      order_no: "TB202511280015",
      tracking_no: "434894534579633",
      price_cents: 69900,
      status: "pending",
      routePoints: routeBJToSH,
      item_spec: "城市系列 / 礼盒装",
    },
    {
      shop_name: "酷奇数码专营店",
      order_title: "Type-C 编织快充数据线 2 米",
      order_no: "TB202511280016",
      tracking_no: "434894534579634",
      price_cents: 2900,
      status: "delivering",
      routePoints: routeSZToMinhang,
      item_spec: "灰色 / 2 米",
    },
    {
      shop_name: "索尼音频旗舰店",
      order_title: "索尼 便携蓝牙音箱 防水款",
      order_no: "TB202511280017",
      tracking_no: "434894534579635",
      price_cents: 49900,
      status: "finished",
      routePoints: routeGZToPudong,
      item_spec: "防水 / 续航 12 小时",
    },
    {
      shop_name: "俞兆林官方旗舰店",
      order_title: "俞兆林 保暖内衣套装",
      order_no: "TB202511280018",
      tracking_no: "434894534579636",
      price_cents: 15900,
      status: "delivering",
      routePoints: routeCDToChangning,
      item_spec: "男款 / XL 码",
    },
    {
      shop_name: "全棉时代官方旗舰店",
      order_title: "全棉时代 婴儿湿巾 80 抽*6 包",
      order_no: "TB202511280019",
      tracking_no: "434894534579637",
      price_cents: 11900,
      status: "delivering",
      routePoints: routeHZToXuhui,
      item_spec: "80 抽*6 包 / 带盖",
    },
    {
      shop_name: "波司登官方旗舰店",
      order_title: "波司登 男士连帽羽绒服",
      order_no: "TB202511280020",
      tracking_no: "434894534579638",
      price_cents: 79900,
      status: "delivering",
      routePoints: routeBJToSH,
      item_spec: "黑色 / L 码",
    },
  ];

  extraOrders.forEach((cfg, idx) => {
    const baseCreatedDay = 10 + idx;
    const dayStr = String(Math.min(baseCreatedDay, 28)).padStart(2, "0");

    const isFinished = cfg.status === "finished";
    const isPending = cfg.status === "pending";
    const isToPickup = cfg.status === "to_pickup";

    seedOrder({
      shop_name: cfg.shop_name,
      channel: "tmall",
      order_title: cfg.order_title,
      order_no: cfg.order_no,
      tracking_no: cfg.tracking_no,
      price_cents: cfg.price_cents,
      quantity: 1,
      image_url: defaultImg,
      item_spec: cfg.item_spec || "",
      remark: "",
      advantage_tags: "官方正品,7天无理由退换",
      status: cfg.status,
      sender_province: "山东省",
      sender_city: "临沂市",
      sender_address: "临沂市某某仓库",
      sender_lng: 118.356,
      sender_lat: 35.106,
      receiver_province: "上海市",
      receiver_city: "徐汇区",
      receiver_address: "梅陇路130号 华东理工大学 人工货架区",
      receiver_lng: 121.432,
      receiver_lat: 31.148,
      created_at: `2025-11-${dayStr}T12:00:00`,
      paid_at: isPending ? null : `2025-11-${dayStr}T12:05:00`,
      shipped_at: isPending ? null : `2025-11-${dayStr}T18:00:00`,
      finished_at: isFinished ? `2025-11-${dayStr}T21:30:00` : null,
      updated_at: `2025-11-${dayStr}T18:00:00`,
      routePoints: cfg.routePoints,
      realtime: isPending
        ? null
        : {
            lng: 119.5 + idx * 0.05,
            lat: 31.0 + idx * 0.02,
            status: isFinished ? "已签收" : isToPickup ? "待取件" : "运输中",
            updated_at: `2025-11-${dayStr}T19:00:00`,
          },
    });
  });

  console.log("Rich demo data seeding finished.");
}

// ================= HTTP 接口 =================

// 1）订单列表
app.get("/api/orders", (req, res) => {
  const rows = db
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
        created_at
      FROM orders
      ORDER BY created_at DESC
    `
    )
    .all();

  res.json(rows);
});

// 2）轨迹 + 订单详情
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

  const realtime = db
    .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
    .get(order.id);

  res.json({
    order,
    route,
    realtime,
  });
});

// ================= WebSocket：实时位置推送 =================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const simulators = new Map(); // trackingNo -> { timer, orderId }

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
      "SELECT lng, lat FROM order_route_points WHERE order_id = ? ORDER BY seq ASC"
    )
    .all(orderId);

  if (!routePoints || routePoints.length < 2) {
    console.warn("Not enough route points for order", orderId);
    return;
  }

  const path = routePoints.map((p) => [p.lng, p.lat]);

  const animationPath = [];
  const stepsPerSegment = 30;

  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];

    for (let k = 0; k < stepsPerSegment; k++) {
      const t = k / stepsPerSegment;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      animationPath.push([x, y]);
    }
  }
  animationPath.push(path[path.length - 1]);

  let startIdx = 0;
  const currentRealtime = db
    .prepare("SELECT lng, lat FROM order_realtime WHERE order_id = ?")
    .get(orderId);

  if (currentRealtime) {
    const { lng: curLng, lat: curLat } = currentRealtime;

    let bestIdx = 0;
    let bestDist = Infinity;

    animationPath.forEach(([x, y], i) => {
      const dx = x - curLng;
      const dy = y - curLat;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    });

    startIdx = bestIdx;
  }

  if (startIdx >= animationPath.length - 1) {
    console.log(
      "Order already at destination, no simulator needed:",
      trackingNo
    );
    return;
  }

  let idx = startIdx;

  const timer = setInterval(() => {
    if (idx >= animationPath.length - 1) {
      clearInterval(timer);
      simulators.delete(trackingNo);
      return;
    }

    idx += 1;
    const [lng, lat] = animationPath[idx];

    db.prepare(
      "UPDATE order_realtime SET lng = ?, lat = ?, updated_at = ? WHERE order_id = ?"
    ).run(lng, lat, new Date().toISOString(), orderId);

    const realtime = db
      .prepare("SELECT * FROM order_realtime WHERE order_id = ?")
      .get(orderId);

    const payload = JSON.stringify({
      type: "realtime",
      trackingNo,
      realtime,
    });

    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.trackingNo === trackingNo
      ) {
        client.send(payload);
      }
    });
  }, 1000);

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
        if (realtime) {
          ws.send(
            JSON.stringify({
              type: "realtime",
              trackingNo,
              realtime,
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

// 调试接口：重置某个运单的小车到起点
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
      "SELECT lng, lat FROM order_route_points WHERE order_id = ? ORDER BY seq ASC LIMIT 1"
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
      eta_time = excluded.eta_time,
      updated_at = excluded.updated_at
  `
  ).run(orderId, firstPoint.lng, firstPoint.lat, "运输中", order.eta_time, now);

  stopSimulator(trackingNo);

  res.json({ message: "realtime reset", trackingNo });
});

// 3）启动服务
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mobile logistics server running at http://localhost:${PORT}`);
});
