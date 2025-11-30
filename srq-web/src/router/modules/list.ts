import { lazy } from 'react';
import { ViewModuleIcon } from 'tdesign-icons-react';
import { IRouter } from '../index';

const result: IRouter[] = [
  {
    path: '/list',
    meta: {
      title: '订单管理',
      Icon: ViewModuleIcon,
    },
    children: [
      {
        path: 'select',
        Component: lazy(() => import('pages/List/Select')),
        meta: { title: '订单管理' },
      },
      {
        path: 'tree',
        Component: lazy(() => import('pages/List/Tree')),
        meta: { title: '配送管理' },
      },
    ],
  },
];

export default result;
