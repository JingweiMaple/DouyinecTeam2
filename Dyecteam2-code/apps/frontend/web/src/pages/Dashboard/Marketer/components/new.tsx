import React, { useState, useMemo, useRef } from 'react';
import { Table, Input, Space, Button, Tag, TableProps } from 'tdesign-react';
import { SearchIcon, RefreshIcon } from 'tdesign-icons-react';

interface OrderItem {
  id: number;
  orderId: number;
  productInfo: string;
  status: number;
  price: number;
  createTime: string;
}

const OrderTableWithButtons: React.FC = () => {
  const initialData: OrderItem[] = [
    { id: 1, orderId: 10001, productInfo: 'iPhone 14 Pro 256G 深空黑', status: 1, price: 8999, createTime: '2023-10-01' },
    { id: 2, orderId: 10002, productInfo: '小米13 Pro 12+256G 白色', status: 2, price: 5999, createTime: '2023-10-02' },
    { id: 3, orderId: 10003, productInfo: '华为MatePad Pro 11寸', status: 3, price: 4299, createTime: '2023-10-03' },
    { id: 4, orderId: 10004, productInfo: 'Apple Watch Series 8', status: 1, price: 2999, createTime: '2023-10-04' },
    { id: 5, orderId: 10005, productInfo: '三星Galaxy S23+', status: 4, price: 6999, createTime: '2023-10-05' },
    { id: 6, orderId: 10010, productInfo: 'iPhone 15 128G 粉色', status: 7, price: 5999, createTime: '2023-10-06' },
    { id: 7, orderId: 10011, productInfo: 'MacBook Air M2 13寸', status: 7, price: 9499, createTime: '2023-10-07' },
  ];

  const [data] = useState<OrderItem[]>(initialData);
  // 搜索输入的值（临时状态）
  const [tempFilters, setTempFilters] = useState({
    orderId: '',
    productInfo: '',
  });
  // 实际用于筛选的值（点击搜索按钮后设置）
  const [appliedFilters, setAppliedFilters] = useState({
    orderId: '',
    productInfo: '',
  });

  // 处理输入框变化
  const handleInputChange = (key: 'orderId' | 'productInfo', value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 点击搜索按钮
  const handleSearch = () => {
    setAppliedFilters({
      orderId: tempFilters.orderId.trim(),
      productInfo: tempFilters.productInfo.trim(),
    });
  };

  // 点击重置按钮
  const handleReset = () => {
    setTempFilters({
      orderId: '',
      productInfo: '',
    });
    setAppliedFilters({
      orderId: '',
      productInfo: '',
    });
  };

  // 按回车键触发搜索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 根据 appliedFilters 筛选数据
  const filteredData = useMemo(() => {
    const { orderId, productInfo } = appliedFilters;
    
    if (!orderId && !productInfo) {
      return data;
    }
    
    return data.filter((item) => {
      // 订单编号筛选
      let orderIdMatch = true;
      if (orderId) {
        orderIdMatch = item.orderId.toString().includes(orderId);
      }
      
      // 商品信息筛选
      let productMatch = true;
      if (productInfo) {
        productMatch = item.productInfo.toLowerCase().includes(productInfo.toLowerCase());
      }
      return orderIdMatch && productMatch;
    });
  }, [data, appliedFilters]);

  // 状态映射
  const statusMap = {
    1: { label: '待付款', theme: 'warning' },
    2: { label: '待发货', theme: 'primary' },
    3: { label: '已发货', theme: 'success' },
    4: { label: '已完成', theme: 'default' },
    7: { label: '已评价', theme: 'success' },
  };

  const columns:TableProps['columns']= [
    {
      title: '订单编号',
      colKey: 'orderId',
      width: 120,
      align: 'center',
      cell: ({ row }) => (
        <span >
          {row.orderId}
        </span>
      ),
    },
    {
      title: '商品信息',
      colKey: 'productInfo',
      minWidth: 200,
      ellipsis: {
        props: {
          placement: 'top',
          showOverflowTooltip: true,
        },
      },
    },
    {
      title: '状态',
      colKey: 'status',
      width: 100,
      cell: ({ row }) => {
        const status = statusMap[row.status as keyof typeof statusMap];
        return (
          <Tag theme={status?.theme || 'default'} variant="light">
            {status?.label || '未知'}
          </Tag>
        );
      },
    },
    {
      title: '金额',
      colKey: 'price',
      width: 100,
      align: 'right',
      cell: ({ row }) => (
        <span>¥{row.price.toLocaleString()}</span>
      ),
    },
    {
      title: '创建时间',
      colKey: 'createTime',
      width: 120,
    },
  ];

  return (
    <div className="order-table-container">
      {/* 搜索区域 */}
      <div 
        className="search-area"
        style={{
          padding: '16px',
          backgroundColor: 'var(--td-bg-color-container)',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid var(--td-border-level-1-color)',
        }}
      >
        <Space align="center" size="large">
          <div className="search-item">
            <label className="search-label">订单编号：</label>
            <Input
              placeholder="请输入订单编号"
              value={tempFilters.orderId}
              onChange={(value) => handleInputChange('orderId', value)}
              clearable
              style={{ width: '180px' }}
            />
          </div>
          
          <div className="search-item">
            <label className="search-label">商品信息：</label>
            <Input
              placeholder="请输入商品名称或关键词"
              value={tempFilters.productInfo}
              onChange={(value) => handleInputChange('productInfo', value)}
              clearable
              style={{ width: '250px' }}
            />
          </div>
          
          <Space size="small">
            <Button
              theme="primary"
              icon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!tempFilters.orderId && !tempFilters.productInfo}
            >
              搜索
            </Button>
            
            <Button
              theme="default"
              variant="outline"
              icon={<RefreshIcon />}
              onClick={handleReset}
            >
              重置
            </Button>
          </Space>
          
          <div className="search-result">
            <span className="result-text">
              共 {filteredData.length} 条结果
              {appliedFilters.orderId && `，订单编号包含 "${appliedFilters.orderId}"`}
              {appliedFilters.productInfo && `，商品包含 "${appliedFilters.productInfo}"`}
            </span>
          </div>
        </Space>
      </div>

      {/* 表格 */}
      <Table
        data={filteredData}
        columns={columns}
        rowKey="id"
        size="medium"
        stripe
        hover
        verticalAlign="middle"
        empty={
          <div style={{ padding: '40px 0' }}>
            <div style={{ marginBottom: 8 }}>
              {appliedFilters.orderId || appliedFilters.productInfo 
                ? '没有找到匹配的数据'
                : '暂无数据'
              }
            </div>
            {(appliedFilters.orderId || appliedFilters.productInfo) && (
              <Button
                theme="default"
                variant="text"
                onClick={handleReset}
                size="small"
              >
                清除筛选条件
              </Button>
            )}
          </div>
        }
        pagination={{
          defaultCurrent: 1,
          defaultPageSize: 10,
          total: filteredData.length,
          showJumper: true,

          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    
    </div>
  );
};

export default OrderTableWithButtons;