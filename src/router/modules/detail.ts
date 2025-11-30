import { lazy } from 'react';
import { LayersIcon } from 'tdesign-icons-react';
import { IRouter } from '../index';

const result: IRouter[] = [
  {
    path: '/detail',
    meta: {
      title: '智能路线规划',
      Icon: LayersIcon,
    },
    children: [
      {
        path: 'base',
        Component: lazy(() => import('pages/Detail/Base')),
        meta: {
          title: '路线规划',
        },
      },
      {
        path: 'advanced',
        Component: lazy(() => import('pages/Detail/Advanced')),
        meta: { title: '最优路径' },
      },
    ],
  },
];

export default result;
