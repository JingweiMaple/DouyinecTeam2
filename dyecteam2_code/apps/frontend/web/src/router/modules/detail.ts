import { lazy } from 'react';
import { DashboardIcon, LayersIcon } from 'tdesign-icons-react';
import { IRouter } from '../index';

const detail: IRouter[] = [
  {
    path: '/detail',
    meta: {
      title: '订单管理仪表盘',
      Icon: DashboardIcon,
    },
    children: [
      // {
      //   path: 'base',
      //   Component: lazy(() => import('pages/Detail/Base')),
      //   meta: {
      //     title: '路线规划',
      //   },
      // },
      // {
      //   path: 'advanced',
      //   Component: lazy(() => import('pages/Detail/Advanced')),
      //   meta: { title: '最优路径' },
      // },
      {
        path: 'marketer',
        Component: lazy(() => import('pages/Dashboard/Marketer')),
        meta: { title: '订单详情' },
      },
      {
        path: 'distribution',
        Component: lazy(() => import('pages/Dashboard/Distribution')),
        meta: { title: '配送管理' },
      },
      // {
      //   path: 'mapwalking',
      //   Component: lazy(() => import('pages/Dashboard/Mapwalking')),
      //   meta: { title: '配送路径' },
      // },
    ],
  },
];

export default detail;
