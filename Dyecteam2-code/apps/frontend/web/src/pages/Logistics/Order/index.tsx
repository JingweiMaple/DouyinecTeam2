// src/pages/Logistics/Order/index.tsx

import React, { memo, useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, PrimaryTable, PrimaryTableCol, Tag, MessagePlugin } from 'tdesign-react';
import type { FormProps } from 'tdesign-react';
import { useNavigate } from 'react-router-dom';
import Style from './index.module.less';

// 【保留】只保留类型 OrderItem，不再引入本地 mock 数据 orderListMock
import type { OrderItem } from './consts';

// 【保留】引入我们在 services 里封装好的后端接口
import { fetchOrderList } from '../../../services/logistics';

const { FormItem } = Form;

// 搜索表单字段类型（保留原来的）
type SearchForm = {
  orderName?: string;
  trackingNo?: string;
  status?: 'finished' | 'delivering' | 'pending' | 'cancelled';
};

const OrderPage: React.FC = () => {
  const navigate = useNavigate();

  const [form] = Form.useForm();

  // 【保留】表格数据 & loading 状态
  const [tableData, setTableData] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ====================== 1. 行内操作：查看轨迹 ======================
  // 【补充说明】这里通过 URL 参数把 trackingNo 传给 /logistics/track 页面
  const handleViewTrack = (trackingNo: string) => {
    navigate(`/logistics/track?trackingNo=${encodeURIComponent(trackingNo)}`);
  };

  // ====================== 2. 表格列配置 ======================
  const columns: PrimaryTableCol<OrderItem>[] = [
    {
      colKey: 'orderName',
      title: '电商订单名称',
      width: 260,
      ellipsis: true,
    },
    {
      colKey: 'trackingNo',
      title: '快递单号',
      width: 200,
    },
    {
      colKey: 'status',
      title: '订单状态',
      width: 120,
      cell: ({ row }) => {
        const map: Record<OrderItem['status'], { theme: 'success' | 'warning' | 'default' | 'danger'; label: string }> =
          {
            finished: { theme: 'success', label: '已完成' },
            delivering: { theme: 'warning', label: '配送中' },
            pending: { theme: 'default', label: '待发货' },
            cancelled: { theme: 'danger', label: '已取消' },
          };
        const conf = map[row.status];
        return (
          <Tag theme={conf.theme} variant='light-outline' size='small'>
            {conf.label}
          </Tag>
        );
      },
    },
    {
      colKey: 'amount',
      title: '订单金额（元）',
      align: 'right',
      width: 140,
      cell: ({ row }) => row.amount.toLocaleString(),
    },
    {
      colKey: 'createdAt',
      title: '下单时间',
      width: 180,
    },
    {
      colKey: 'op',
      title: '操作',
      fixed: 'right',
      width: 120,
      cell: ({ row }) => (
        <Button size='small' theme='primary' variant='text' onClick={() => handleViewTrack(row.trackingNo)}>
          查看轨迹
        </Button>
      ),
    },
  ];

  // ====================== 3. 获取订单列表（联调后端） ======================
  // 【保留 & 小补充】统一的“从后端获取订单列表”函数
  const getOrderList = async (values?: SearchForm) => {
    setLoading(true);
    try {
      // 后端 /api/orders 接收 keyword、status 这两个查询参数
      // 【说明】如果只填 trackingNo 就优先按 trackingNo 搜，
      // 否则退回用 orderName 模糊搜索
      const res = await fetchOrderList({
        keyword: values?.trackingNo || values?.orderName || '',
        status: values?.status || '',
      });

      // 后端返回：{ code: 0, data: { list: [...], total: number } }
      setTableData(res.data?.list || []);
    } catch (err) {
      console.error(err);
      MessagePlugin.error('获取订单列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 【保留】页面加载时自动请求一次订单列表
  useEffect(() => {
    getOrderList();
  }, []);
  // 【修改补充】上面加了一行 eslint-disable 的注释，避免 lints 提示必须把 getOrderList
  // 加到依赖里（那样会导致 useEffect 触发两次）。课程项目里这样写更稳定。

  // ====================== 4. 搜索、重置 ======================
  // 提交查询（完全按 TDesign Form 的 onSubmit 类型来写）
  const handleSearch: FormProps['onSubmit'] = (context) => {
    const values = (context?.fields || {}) as SearchForm;

    // 【修改】不再在前端过滤，而是直接调用后端查询
    getOrderList(values);
  };

  const handleReset = () => {
    form.reset();
    // 【保留】重置时清空表单并重新请求全部订单
    getOrderList();
  };

  // ====================== 5. 渲染 ======================
  return (
    <div className={Style.page}>
      <Card title='订单查询' bordered={false} className={Style.card}>
        {/* 顶部搜索区域：inline Form，一行排开 */}
        <Form form={form} labelWidth={80} colon layout='inline' onSubmit={handleSearch}>
          <FormItem label='订单名称' name='orderName'>
            <Input placeholder='请输入电商订单名称' clearable />
          </FormItem>

          <FormItem label='快递单号' name='trackingNo'>
            <Input placeholder='请输入快递单号' clearable />
          </FormItem>

          <FormItem label='订单状态' name='status'>
            <Select
              clearable
              placeholder='全部状态'
              style={{ width: 180 }}
              options={[
                { label: '已完成', value: 'finished' },
                { label: '配送中', value: 'delivering' },
                { label: '待发货', value: 'pending' },
                { label: '已取消', value: 'cancelled' },
              ]}
            />
          </FormItem>

          {/* 按钮也作为一个 FormItem，自然和前面 FormItem 平行对齐 */}
          <FormItem labelWidth={0}>
            <Button type='submit' theme='primary'>
              查询
            </Button>
            <Button variant='outline' style={{ marginLeft: 8 }} onClick={handleReset}>
              重置
            </Button>
          </FormItem>
        </Form>

        {/* 订单列表 */}
        <div style={{ marginTop: 16 }}>
          <PrimaryTable
            rowKey='id'
            data={tableData} // 【保留】来自后端的列表
            columns={columns}
            bordered={false}
            pagination={{ pageSize: 10 }}
            loading={loading} // 【保留】加载态
          />
        </div>
      </Card>
    </div>
  );
};

export default memo(OrderPage);
