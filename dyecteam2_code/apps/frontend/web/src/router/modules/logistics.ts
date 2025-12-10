import { lazy } from 'react';
import { StreetRoad1Icon } from 'tdesign-icons-react';

const LOGISTICS_ROUTES: any[] = [
  {
    path: '/logistics',
    meta: {
      title: '物流查询', // 左侧顶级菜单名称
      Icon: StreetRoad1Icon,
    },
    children: [
      {
        path: 'order',
        meta: {
          title: '订单查询', // 子菜单名称
        },
        Component: lazy(() => import('pages/Logistics/Order/index')),
      },
      {
        path: 'track',
        meta: {
          title: '包裹轨迹查询', // 子菜单名称
        },
        Component: lazy(() => import('pages/Logistics/Track')),
      },
    ],
  },
];

export default LOGISTICS_ROUTES;
