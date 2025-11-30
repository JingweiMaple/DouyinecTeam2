/* eslint-disable @typescript-eslint/no-var-requires */
// server/seed.js
// ⭐ 往 orders 表里造几条用于可视化的测试订单

const db = require('./db');

// 清空旧数据
db.exec('DELETE FROM orders;');

const insertStmt = db.prepare(`
  INSERT INTO orders (
    order_no,
    order_name,
    delivery_hours,
    created_at,
    recv_city,
    region,
    ship_city,
    status,
    remark
  )
  VALUES (
    @order_no,
    @order_name,
    @delivery_hours,
    @created_at,
    @recv_city,
    @region,
    @ship_city,
    @status,
    @remark
  )
`);

function toISO(d) {
  return d.toISOString().slice(0, 19); // 2025-11-27T12:30:00
}

const now = new Date();

const mockOrders = [
  {
    order_no: 'DY20251123001',
    order_name: '抖音电商-护肤套装',
    delivery_hours: 26.5,
    created_at: toISO(new Date(now.getTime() - 3 * 24 * 3600 * 1000)),
    recv_city: '上海市',
    region: '华东',
    ship_city: '杭州市',
    status: 'shipping', // 运输中
    remark: 'urgent', // 加急订单
  },
  {
    order_no: 'DY20251123002',
    order_name: '抖音电商-蓝牙耳机',
    delivery_hours: 20.1,
    created_at: toISO(new Date(now.getTime() - 2 * 24 * 3600 * 1000)),
    recv_city: '上海市',
    region: '华东',
    ship_city: '广州市',
    status: 'pending_sign', // 待签收
    remark: 'normal', // 普通订单
  },
  {
    order_no: 'DY20251123003',
    order_name: '抖音电商-保温杯',
    delivery_hours: 8.3,
    created_at: toISO(new Date(now.getTime() - 1 * 24 * 3600 * 1000)),
    recv_city: '杭州市',
    region: '华东',
    ship_city: '上海市',
    status: 'abnormal', // 异常订单
    remark: 'normal',
  },
];

mockOrders.forEach((o) => insertStmt.run(o));

console.log(`✅ 已插入 ${mockOrders.length} 条订单到 SQLite 数据库`);
