/* eslint-disable @typescript-eslint/no-var-requires, camelcase */
// server/newdb.js
// SQLite 数据库连接 & 建表 + 演示数据初始化（新版本带更多字段）

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'logistics.db');
const db = new Database(dbPath);

// ======================= 建表：包含所有新字段 =======================

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  order_name TEXT,                       -- 商品名称
  delivery_hours REAL,
  created_at TEXT,
  
  recv_city TEXT,
  region TEXT,
  ship_city TEXT,
  
  status TEXT,                           -- 原有状态：normal / abnormal
  order_status INTEGER CHECK(order_status BETWEEN 0 AND 8), -- 新状态：0-8
  remark TEXT,
  
  -- 商品价格相关
  unit_price REAL,                       -- 商品单价
  quantity INTEGER,                      -- 商品数量
  total_price REAL,                      -- 总价
  
  -- 收件人信息
  receiver_name TEXT,                    -- 收件人姓名
  receiver_address TEXT,                 -- 收件人详细地址
  receiver_coords TEXT,                  -- 经纬度 [经度,纬度]
  
  -- 物流信息
  logistics_no TEXT,                     -- 物流单号
  logistics_company TEXT                 -- 物流公司
);

CREATE INDEX IF NOT EXISTS idx_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_logistics_no ON orders(logistics_no);
CREATE INDEX IF NOT EXISTS idx_created_at ON orders(created_at);
`);

// ======================= 模拟数据配置 =======================

// 商品名称列表（日用商品）
const PRODUCTS = [
  '洗衣液',
  '抽纸',
  '洗发水',
  '沐浴露',
  '牙膏',
  '大米',
  '食用油',
  '牛奶',
  '鸡蛋',
  '面包',
  '方便面',
  '矿泉水',
  '咖啡',
  '茶叶',
  '毛巾',
  '拖鞋',
  '垃圾桶',
  '衣架',
  '垃圾袋',
  '保鲜膜',
];

// 物流公司
const LOGISTICS_COMPANIES = [
  '顺丰速运',
  '京东物流',
  '中通快递',
  '圆通速递',
  '申通快递',
  '韵达快递',
  'EMS',
  '德邦快递',
  '极兔速递',
  '跨越速运',
];

// 城市经纬度映射（中心坐标）
const CITY_COORDS = {
  上海市: [121.4737, 31.2304],
  杭州市: [120.1551, 30.2741],
  南京市: [118.7969, 32.0603],
  广州市: [113.2644, 23.1291],
  深圳市: [114.0579, 22.5431],
  北京市: [116.4074, 39.9042],
  天津市: [117.1902, 39.1256],
  成都市: [104.066, 30.5723],
  重庆市: [106.5516, 29.563],
  武汉市: [114.3054, 30.5931],
  郑州市: [113.6254, 34.7466],
  西安市: [108.9398, 34.3413],
};

// 城市区域映射
const CITY_REGION = {
  上海市: '华东',
  杭州市: '华东',
  南京市: '华东',
  广州市: '华南',
  深圳市: '华南',
  北京市: '华北',
  天津市: '华北',
  成都市: '西南',
  重庆市: '西南',
  武汉市: '华中',
  郑州市: '华中',
  西安市: '华中',
};

// 常见姓氏和名字
const SURNAMES = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
const GIVEN_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '磊', '军', '洋', '强', '杰', '娟', '艳', '勇', '超'];

// 地址前缀
const ADDRESS_PARTS = {
  上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区'],
  杭州市: ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区'],
  南京市: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区'],
  广州市: ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '黄埔区'],
  深圳市: ['福田区', '罗湖区', '南山区', '盐田区', '宝安区', '龙岗区'],
  北京市: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区'],
  天津市: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区'],
  成都市: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区'],
  重庆市: ['渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区'],
  武汉市: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区'],
  郑州市: ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区'],
  西安市: ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区'],
};

// 街道后缀
const STREET_SUFFIX = ['路', '街', '大道', '巷', '弄'];
const COMMUNITY_SUFFIX = ['小区', '花园', '苑', '大厦', '公寓'];

// ======================= 工具函数 =======================

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomCoords(baseCoords) {
  // 在基础坐标附近随机偏移（约±0.05度，约5公里）
  const [lon, lat] = baseCoords;
  const offsetLon = (Math.random() - 0.5) * 0.1;
  const offsetLat = (Math.random() - 0.5) * 0.1;
  return [lon + offsetLon, lat + offsetLat];
}

// 生成收件人姓名
function generateReceiverName() {
  const surname = getRandomElement(SURNAMES);
  const givenName = getRandomElement(GIVEN_NAMES);
  // 30%概率使用双名
  if (Math.random() < 0.3) {
    return surname + givenName + getRandomElement(GIVEN_NAMES);
  }
  return surname + givenName;
}

// 生成详细地址
function generateAddress(city) {
  const district = getRandomElement(ADDRESS_PARTS[city] || [city + '区']);
  const streetNum = getRandomInt(1, 300);
  const streetName = getRandomElement(['中山', '人民', '解放', '建设', '和平', '新华']);
  const streetSuffix = getRandomElement(STREET_SUFFIX);
  const community = getRandomElement(['温馨', '幸福', '阳光', '和谐', '美丽']) + getRandomElement(COMMUNITY_SUFFIX);
  const building = getRandomInt(1, 30);
  const unit = getRandomInt(1, 5);
  const room = getRandomInt(101, 2001);

  return `${district}${streetName}${streetSuffix}${streetNum}号${community}${building}幢${unit}单元${room}室`;
}

// 生成物流单号
function generateLogisticsNo(company, date) {
  const prefixMap = {
    顺丰速运: 'SF',
    京东物流: 'JD',
    中通快递: 'ZT',
    圆通速递: 'YT',
    申通快递: 'ST',
    韵达快递: 'YD',
    EMS: 'EMS',
    德邦快递: 'DB',
    极兔速递: 'JT',
    跨越速运: 'KY',
  };

  const prefix = prefixMap[company] || 'WL';
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const randomNum = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `${prefix}${dateStr}${randomNum}`;
}

// 生成订单状态（0-8），并确保状态3是abnormal
function generateOrderStatus() {
  const status = getRandomInt(0, 8);
  return status;
}

// 商品单价范围（根据商品类型）
const PRODUCT_PRICE_RANGE = {
  洗衣液: [25, 80],
  抽纸: [10, 30],
  洗发水: [30, 120],
  沐浴露: [20, 70],
  牙膏: [8, 40],
  大米: [40, 150],
  食用油: [50, 200],
  牛奶: [30, 80],
  鸡蛋: [15, 60],
  面包: [5, 25],
  方便面: [3, 15],
  矿泉水: [10, 40],
  咖啡: [30, 150],
  茶叶: [50, 500],
  毛巾: [5, 30],
  拖鞋: [10, 50],
  垃圾桶: [15, 100],
  衣架: [5, 40],
  垃圾袋: [5, 30],
  保鲜膜: [8, 35],
};

// ======================= 初始化数据 =======================

const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM orders').get();

if (cnt === 0) {
  console.log('[db] orders 表为空，初始化示例数据...');

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
      order_status,
      remark,
      unit_price,
      quantity,
      total_price,
      receiver_name,
      receiver_address,
      receiver_coords,
      logistics_no,
      logistics_company
    ) VALUES (
      @order_no,
      @order_name,
      @delivery_hours,
      @created_at,
      @recv_city,
      @region,
      @ship_city,
      @status,
      @order_status,
      @remark,
      @unit_price,
      @quantity,
      @total_price,
      @receiver_name,
      @receiver_address,
      @receiver_coords,
      @logistics_no,
      @logistics_company
    );
  `);

  const seedOrders = [];
  let seq = 1;
  const DAYS = 14;
  const now = new Date();

  // 城市对配置（收发货城市）
  const cityPairs = [
    { recv_city: '上海市', ship_city: '杭州市', weight: 4 },
    { recv_city: '上海市', ship_city: '南京市', weight: 3 },
    { recv_city: '南京市', ship_city: '上海市', weight: 2 },
    { recv_city: '广州市', ship_city: '深圳市', weight: 3 },
    { recv_city: '深圳市', ship_city: '广州市', weight: 3 },
    { recv_city: '北京市', ship_city: '天津市', weight: 2 },
    { recv_city: '天津市', ship_city: '北京市', weight: 2 },
    { recv_city: '成都市', ship_city: '重庆市', weight: 2 },
    { recv_city: '重庆市', ship_city: '成都市', weight: 2 },
    { recv_city: '武汉市', ship_city: '郑州市', weight: 2 },
    { recv_city: '郑州市', ship_city: '西安市', weight: 2 },
    { recv_city: '西安市', ship_city: '郑州市', weight: 1 },
  ];

  for (let dayOffset = 0; dayOffset < DAYS; dayOffset += 1) {
    for (const pair of cityPairs) {
      const count = pair.weight;

      for (let i = 0; i < count; i += 1) {
        // 生成下单时间
        const d = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
        const hour = 8 + Math.floor(Math.random() * 12);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        d.setHours(hour, minute, second, 0);
        const created_at = formatDateTime(d);

        // 配送时长
        let delivery_hours = getRandomFloat(18, 36, 1);
        let isAbnormal = false;

        // 约12%概率生成超时订单
        if (Math.random() < 0.12) {
          delivery_hours = getRandomFloat(48, 72, 1);
          isAbnormal = true;
        }

        // 超时订单里有一部分标记urgent
        const isUrgent = isAbnormal && Math.random() < 0.4;

        // 订单号
        const order_no = `V${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(seq).padStart(
          4,
          '0',
        )}`;

        // 商品信息
        const product = getRandomElement(PRODUCTS);
        const [minPrice, maxPrice] = PRODUCT_PRICE_RANGE[product] || [10, 100];
        const unit_price = getRandomFloat(minPrice, maxPrice);
        const quantity = getRandomInt(1, 5);
        const total_price = parseFloat((unit_price * quantity).toFixed(2));

        // 订单状态
        const order_status = generateOrderStatus();

        // 关联逻辑：如果order_status为3，则标记为abnormal
        let finalStatus = isAbnormal ? 'abnormal' : 'normal';
        if (order_status === 3) {
          finalStatus = 'abnormal';
        }

        // 收件人信息
        const receiver_name = generateReceiverName();
        const receiver_address = generateAddress(pair.recv_city);

        // 经纬度（在城市坐标基础上随机偏移）
        const baseCoords = CITY_COORDS[pair.recv_city];
        const coords = getRandomCoords(baseCoords);
        const receiver_coords = `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`;

        // 物流信息
        const logistics_company = getRandomElement(LOGISTICS_COMPANIES);
        const logistics_no = generateLogisticsNo(logistics_company, d);

        seedOrders.push({
          order_no,
          order_name: product,
          delivery_hours,
          created_at,
          recv_city: pair.recv_city,
          region: CITY_REGION[pair.recv_city],
          ship_city: pair.ship_city,
          status: finalStatus,
          order_status,
          remark: isUrgent ? 'urgent' : 'normal',
          unit_price,
          quantity,
          total_price,
          receiver_name,
          receiver_address,
          receiver_coords,
          logistics_no,
          logistics_company,
        });

        seq += 1;
      }
    }
  }

  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => insertStmt.run(row));
  });

  insertMany(seedOrders);

  // 验证数据
  const stats = db
    .prepare(
      `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN order_status = 3 THEN 1 ELSE 0 END) as status_3_count,
      SUM(CASE WHEN status = 'abnormal' THEN 1 ELSE 0 END) as abnormal_count,
      AVG(total_price) as avg_price,
      COUNT(DISTINCT logistics_company) as company_count
    FROM orders
  `,
    )
    .get();

  console.log(`[db] 初始化完成，共插入 ${seedOrders.length} 条订单记录`);
  console.log(`[db] 数据统计:`);
  console.log(`  - 订单总数: ${stats.total}`);
  console.log(`  - 状态3(abnormal)订单数: ${stats.status_3_count}`);
  console.log(`  - 异常状态订单数: ${stats.abnormal_count}`);
  console.log(`  - 平均订单金额: ¥${stats.avg_price.toFixed(2)}`);
  console.log(`  - 使用的物流公司数: ${stats.company_count}`);

  // 展示一些示例数据
  console.log(`\n[db] 示例数据（前3条）:`);
  const sampleData = db
    .prepare('SELECT order_no, order_name, receiver_name, total_price, order_status FROM orders LIMIT 3')
    .all();
  sampleData.forEach((row, i) => {
    console.log(
      `  ${i + 1}. ${row.order_no} - ${row.order_name} - ${row.receiver_name} - ¥${row.total_price} - 状态${
        row.order_status
      }`,
    );
  });
}
// ============= 额外插入用户端的 7 条真实订单（如已存在则忽略） =============
try {
  // 1）用户端的 7 条订单：order_no / tracking_no / 商品名
  //    这里全部跟你 mobile 端后端保持一致
  const EXTRA_USER_ORDERS = [
    {
      // 1. 奥妙洗衣液
      order_no: 'TB202511210001',
      order_name: '奥妙除菌消毒洗衣液 花香柠檬 2L*2 瓶',
      logistics_no: '434894534579619',
      sender_city: '北京市',
      recv_city: '上海市',
      receiver_name: '宋瑞琪',
    },
    {
      // 2. 女士长款羽绒服
      order_no: 'TB202511190002',
      order_name: '女士长款连帽羽绒服 90绒 保暖外套',
      logistics_no: '434894534579620',
      sender_city: '沈阳市',
      recv_city: '上海市',
      receiver_name: '张同学',
    },
    {
      // 3. 男士运动跑鞋
      order_no: 'TB202511180003',
      order_name: '男士缓震跑步鞋 网面透气运动鞋',
      logistics_no: '434894534579621',
      sender_city: '广州市',
      recv_city: '上海市',
      receiver_name: '李同学',
    },
    {
      // 4. XPhone 手机
      order_no: 'TB202511170004',
      order_name: 'XPhone 14 Pro 256G 5G手机',
      logistics_no: '434894534579622',
      sender_city: '深圳市',
      recv_city: '上海市',
      receiver_name: '王老师',
    },
    {
      // 5. 零食大礼包
      order_no: 'TB202511160005',
      order_name: '坚果零食大礼包 2.5kg 家庭装',
      logistics_no: '434894534579623',
      sender_city: '成都市',
      recv_city: '上海市',
      receiver_name: '赵同学',
    },
    {
      // 6. 蓝牙降噪耳机
      order_no: 'TB202511150006',
      order_name: '蓝牙降噪耳机 入耳式',
      logistics_no: '434894534579624',
      sender_city: '杭州市',
      recv_city: '上海市',
      receiver_name: '钱同学',
    },
    {
      // 7. 鲜花速递
      order_no: 'TB202511140007',
      order_name: '鲜花速递 玫瑰花束 19 朵',
      logistics_no: '434894534579625',
      sender_city: '上海市',
      recv_city: '上海市',
      receiver_name: '陈小姐',
    },
  ];

  // 2）插入语句：用 INSERT OR IGNORE，防止重复插入
  const insertExtraStmt = db.prepare(`
    INSERT OR IGNORE INTO orders (
      order_no,
      order_name,
      delivery_hours,
      created_at,
      recv_city,
      region,
      ship_city,
      status,
      order_status,
      remark,
      unit_price,
      quantity,
      total_price,
      receiver_name,
      receiver_address,
      receiver_coords,
      logistics_no,
      logistics_company
    ) VALUES (
      @order_no,
      @order_name,
      @delivery_hours,
      @created_at,
      @recv_city,
      @region,
      @ship_city,
      @status,
      @order_status,
      @remark,
      @unit_price,
      @quantity,
      @total_price,
      @receiver_name,
      @receiver_address,
      @receiver_coords,
      @logistics_no,
      @logistics_company
    )
  `);

  // 3）给这 7 条订单补齐其它字段（时间/金额/地区等）
  //    时间用你 mobile 端的 created_at，转成空格形式
  const rowsToInsert = [
    {
      // 1. 奥妙洗衣液
      order_no: 'TB202511210001',
      order_name: '奥妙除菌消毒洗衣液 花香柠檬 2L*2 瓶',
      logistics_no: '434894534579619',
      created_at: '2025-11-21 10:15:00',
      recv_city: '上海市',
      ship_city: '北京市',
      receiver_name: '宋瑞琪',
      unit_price: 24.8, // 2480 分
      quantity: 1,
    },
    {
      // 2. 女士长款羽绒服
      order_no: 'TB202511190002',
      order_name: '女士长款连帽羽绒服 90绒 保暖外套',
      logistics_no: '434894534579620',
      created_at: '2025-11-19 09:12:00',
      recv_city: '上海市',
      ship_city: '沈阳市',
      receiver_name: '张同学',
      unit_price: 659.0, // 65900 分
      quantity: 1,
    },
    {
      // 3. 男士运动跑鞋
      order_no: 'TB202511180003',
      order_name: '男士缓震跑步鞋 网面透气运动鞋',
      logistics_no: '434894534579621',
      created_at: '2025-11-18 08:20:00',
      recv_city: '上海市',
      ship_city: '广州市',
      receiver_name: '李同学',
      unit_price: 329.0, // 32900 分
      quantity: 1,
    },
    {
      // 4. XPhone 手机
      order_no: 'TB202511170004',
      order_name: 'XPhone 14 Pro 256G 5G手机',
      logistics_no: '434894534579622',
      created_at: '2025-11-17 09:00:00',
      recv_city: '上海市',
      ship_city: '深圳市',
      receiver_name: '王老师',
      unit_price: 6999.0, // 699900 分
      quantity: 1,
    },
    {
      // 5. 零食大礼包
      order_no: 'TB202511160005',
      order_name: '坚果零食大礼包 2.5kg 家庭装',
      logistics_no: '434894534579623',
      created_at: '2025-11-16 08:10:00',
      recv_city: '上海市',
      ship_city: '成都市',
      receiver_name: '赵同学',
      unit_price: 159.0, // 15900 分
      quantity: 1,
    },
    {
      // 6. 蓝牙降噪耳机
      order_no: 'TB202511150006',
      order_name: '蓝牙降噪耳机 入耳式',
      logistics_no: '434894534579624',
      created_at: '2025-11-15 09:20:00',
      recv_city: '上海市',
      ship_city: '杭州市',
      receiver_name: '钱同学',
      unit_price: 299.0, // 29900 分
      quantity: 1,
    },
    {
      // 7. 鲜花速递
      order_no: 'TB202511140007',
      order_name: '鲜花速递 玫瑰花束 19 朵',
      logistics_no: '434894534579625',
      created_at: '2025-11-14 09:05:00',
      recv_city: '上海市',
      ship_city: '上海市',
      receiver_name: '陈小姐',
      unit_price: 199.0, // 19900 分
      quantity: 1,
    },
  ].map((base, idx) => {
    const total = base.unit_price * base.quantity;
    return {
      order_no: base.order_no,
      order_name: base.order_name,
      logistics_no: base.logistics_no,
      created_at: base.created_at,
      recv_city: base.recv_city,
      ship_city: base.ship_city,
      receiver_name: base.receiver_name,

      // 其余字段给一个合理的默认值
      delivery_hours: 24 + idx * 2, // 每单略有不同，20~36 小时
      region: base.recv_city === '上海市' ? '华东' : '其他',
      status: 'normal',
      order_status: 2, // 2 = 已发货（后面会被你“确认收货”接口改成 6）
      remark: 'user_demo',

      unit_price: base.unit_price,
      quantity: base.quantity,
      total_price: total,

      receiver_address: '联调测试地址',
      receiver_coords: '[121.4737,31.2304]', // 上海市的一个大致坐标

      logistics_company: '韵达快递',
    };
  });

  const insertExtras = db.transaction((rows) => {
    let inserted = 0;
    rows.forEach((row) => {
      const result = insertExtraStmt.run(row);
      inserted += result.changes;
    });
    return inserted;
  });

  const insertedCount = insertExtras(rowsToInsert);
  console.log(`[db] 已额外保证 ${rowsToInsert.length} 条用户端 7 单存在，实际新插入 ${insertedCount} 条`);
} catch (e) {
  console.error('[db] 插入用户端 7 条联调订单失败（不影响其他功能）：', e);
}

module.exports = db;
