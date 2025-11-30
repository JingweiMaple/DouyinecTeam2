import { lazy } from 'react';
import { DashboardIcon } from 'tdesign-icons-react';
import { IRouter } from '../index';

const dashboard: IRouter[] = [
  {
    path: '/visualization',
    meta: {
      title: '物流数据可视化面板',
      Icon: DashboardIcon,
    },
    children: [
      {
        path: 'Overview',
        Component: lazy(() => import('pages/Visualization/Overview')),
        meta: {
          title: '数据可视化总览',
        },
      },
      {
        path: 'Heatmap',
        Component: lazy(() => import('pages/Visualization/Heatmap')),
        meta: {
          title: '区域订单密度热力图',
        },
      },
      {
        path: 'Timeliness',
        Component: lazy(() => import('pages/Visualization/Timeliness')),
        meta: {
          title: '配送时效分析',
        },
      },
      {
        path: 'Abnormal',
        Component: lazy(() => import('pages/Visualization/Abnormal')),
        meta: {
          title: '异常订单监控',
        },
      },
    ],
  },
];

export default dashboard;
