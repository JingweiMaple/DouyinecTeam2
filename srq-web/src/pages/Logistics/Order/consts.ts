// src/pages/Logistics/Order/consts.ts

// 订单列表数据结构
export type OrderItem = {
  id: string;
  orderName: string; // 电商订单名称
  trackingNo: string; // 快递单号
  status: 'finished' | 'delivering' | 'pending' | 'cancelled';
  amount: number; // 订单金额
  createdAt: string; // 下单时间
};

// 模拟“我的所有订单”数据，后期可以换成后端接口
export const orderListMock: OrderItem[] = [
  {
    id: '1',
    orderName: '上海办公用品采购项目',
    trackingNo: 'SF202411230001',
    status: 'finished',
    amount: 1700000,
    createdAt: '2024-11-23 10:22:00',
  },
  {
    id: '2',
    orderName: '广州店铺日用品补货',
    trackingNo: 'YT202411220002',
    status: 'delivering',
    amount: 2670000,
    createdAt: '2024-11-22 09:15:00',
  },
  {
    id: '3',
    orderName: '杭州仓库京东自营订单',
    trackingNo: 'JD202411210003',
    status: 'pending',
    amount: 3800000,
    createdAt: '2024-11-21 14:08:00',
  },
  {
    id: '4',
    orderName: '成都小店抖音电商订单',
    trackingNo: 'ZTO202411200004',
    status: 'finished',
    amount: 3030000,
    createdAt: '2024-11-20 16:30:00',
  },
  {
    id: '5',
    orderName: '深圳旗舰店直播间订单',
    trackingNo: 'YT202411190005',
    status: 'cancelled',
    amount: 4500000,
    createdAt: '2024-11-19 20:12:00',
  },
];
