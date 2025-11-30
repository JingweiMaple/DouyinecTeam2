/* eslint-disable @typescript-eslint/no-var-requires */ // server/db.js
// ⭐ SQLite 数据库连接 & 建表：可视化用订单明细表

const Database = require('better-sqlite3');
const path = require('path');

// 在 server 目录下生成 logistics.db 数据库文件
const dbPath = path.join(__dirname, 'logistics.db');
const db = new Database(dbPath);

// 初始化表结构：订单明细表（用于可视化各个子页面）
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自增主键，内部用
  order_no TEXT NOT NULL,                -- 订单号
  order_name TEXT,                       -- 订单名称 / 商品名
  delivery_hours REAL,                   -- 配送时长（小时）
  created_at TEXT,                       -- 订单创建时间

  recv_city TEXT,                        -- 收货城市，例如：上海市
  region TEXT,                           -- 区域：华东 / 华北 / 华南 等
  ship_city TEXT,                        -- 发货城市，例如：杭州市

  status TEXT,                           -- 订单状态：pending_pack / pending_ship / shipping / pending_sign / signed / abnormal
  remark TEXT                            -- 订单备注：normal / urgent 等
);
`);

module.exports = db;
