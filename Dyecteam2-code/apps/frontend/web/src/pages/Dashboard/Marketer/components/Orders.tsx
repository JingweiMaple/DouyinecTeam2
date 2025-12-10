import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessagePlugin, Tabs, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox, Dialog, Form, Textarea, Select, Tooltip } from 'tdesign-react';
import { FileCopyIcon, ErrorCircleFilledIcon, CheckCircleFilledIcon, CloseCircleFilledIcon, SearchIcon, RefreshIcon } from 'tdesign-icons-react';
import FormItem from 'tdesign-react/es/form/FormItem';
import classnames from 'classnames';
import type { TableProps } from 'tdesign-react';
import style from './Orders.module.less';
import BasicUsage from './dialog';

// thanks to https://www.zhangxinxu.com/wordpress/2021/10/js-copy-paste-clipboard/
import { LogisticsAPI, orderService, UpdateStatusRequest, } from '../../../../services/newapi';
import { useNavigate } from 'react-router-dom';
const api = new LogisticsAPI('http://localhost:3001/api'); // 根据你的实际地址调整
// 2. 使用 getAllOrders() 获取数据
async function loadData() {
  try {
    console.log('开始从数据库获取订单数据...');
    // 直接调用 getAllOrders()
    const databaseOrders = await api.getAllOrders();
    console.log(`获取到 ${databaseOrders.length} 条订单数据`);
    // 3. 转换为你的表格格式
    const initialdata = databaseOrders.map((order, index) => {
      // 提取日期部分（去掉时间）
      return {
        index: index + 1,  // 序号从1开始
        ordernumber: order.order_no,      // 订单编号
        status: order.order_status,       // 物流状态 (0-8)
        perprice: order.unit_price,     //商品单价
        quantity: order.quantity,   // 商品数量
        price: order.total_price,         // 价格
        commodity: order.order_name,      // 商品
        recipient: order.receiver_name,   // 收件人
        createtime: order.created_at,      // 创建日期
        address: order.receiver_address,                 //收件人详细地址
        coord: order.receiver_coords,                  //经纬度 [经度,纬度]
      };
    });
    console.log('数据转换完成，前5条数据:');
    console.log(initialdata.slice(0, 5));
    return initialdata;
  } catch (error) {
    console.error('加载数据失败:', error);
    // 如果API失败，返回你的原有模拟数据
    return getFallbackData();
  }
}
// 4. 备用数据函数（API失败时使用）
function getFallbackData() {
  console.warn('API调用失败，使用备用数据');
  const fallbackData = [];
  const total = 48;
  for (let i = 0; i < total; i++) {
    fallbackData.push({
      index: i + 1,
      ordernumber: (1000000 + i).toString(),
      status: i % 9,
      price: [13, 128, 500, 1800, 4500][i % 5],
      commodity: ['牙签', '台灯', '手表', '手机', '电脑'][i % 5],
      recipient: ['贾明', '张三', '王芳'][i % 3],
      createtime: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01'][i % 4],
    });
  }
  return fallbackData;
}
// 5. 在组件中使用
const ndata = await loadData();
const data = ndata;
// ... 使用 ndata 渲染表格




//   const [orderNo, setOrderNo] = useState('');
//   const [orderStatus, setOrderStatus] = useState('4'); // 默认状态为4
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
//   const [batchMode, setBatchMode] = useState(false);
//   const [batchOrderNos, setBatchOrderNos] = useState('');
//  const handleSingleUpdate = async () => {
//     if (!orderNo.trim()) {
//       setMessage({ type: 'error', text: '请输入订单编号' });
//       return;
//     }
//     setLoading(true);
//     setMessage(null);
//     try {
//       const response = await fetch('http://localhost:3001/api/orders/update-status', {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           order_no: orderNo.trim(),
//           order_status: parseInt(orderStatus)
//         })
//       });
//      const result = await response.json();
//       if (result.success) {
//         setMessage({ 
//           type: 'success', 
//           text: `订单 ${orderNo} 状态已成功更新为 ${orderStatus}` 
//         });
//         // 清空表单
//         setOrderNo('');
//       }
//     } catch (error) {
//       setMessage({ 
//         type: 'error', 
//         text: `请求失败: ${error instanceof Error ? error.message : '未知错误'}` 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.style.position = 'fixed';
    textarea.style.clip = 'rect(0 0 0 0)';
    textarea.style.top = '10px';
    textarea.value = text;
    textarea.select();
    document.execCommand('copy', true);
    document.body.removeChild(textarea);
  }
  MessagePlugin.success('文本复制成功');
}

const total = data.length
const { TabPanel } = Tabs;
const statusNameListMap = {
  0: { label: '等待买家付款', theme: 'primary', icon: <CheckCircleFilledIcon /> },
  1: { label: '等待发货', theme: 'primary', icon: <CloseCircleFilledIcon /> },
  2: { label: '发货即将超时', theme: 'warning', icon: <ErrorCircleFilledIcon /> },
  3: { label: '已过发货时间', theme: 'danger', icon: <CloseCircleFilledIcon /> },
  4: { label: '已发货', theme: 'primary', icon: <ErrorCircleFilledIcon /> },
  5: { label: '退款中', theme: 'warning', icon: <CheckCircleFilledIcon /> },
  6: { label: '需要评价', theme: 'success', icon: <CloseCircleFilledIcon /> },
  7: { label: '成功的订单', theme: 'success', icon: <ErrorCircleFilledIcon /> },
  8: { label: '关闭的订单', theme: 'default', icon: <CloseCircleFilledIcon /> },
};

const columns: TableProps['columns'] = [
  {
    colKey: 'row-select',
    fixed: 'left',
    type: 'multiple',
    checkProps: ({ row }) => {
      return {
        disabled: row.status !== 3 && row.status !== 2 && row.status !== 1, // 只有状态为3的可以选中
      };
    },
    width: 50,
  },
  {
    colKey: 'ordernumber',
    title: '订单编号',
    ellipsis: true,
    width: 120,
    cell: ({ row }) => (
      <Popup
        content={
          <div>
            <div>订单金额：{row.price}</div>
            <div>商品详情：{row.commodity}</div>
            <div>物流信息：{statusNameListMap[row.status].label}</div>
          </div>
        }
        trigger="click"
        placement="right">
        {row.ordernumber}
        <FileCopyIcon
          style={{ cursor: 'pointer', marginLeft: '4px' }}
          onClick={() => copyToClipboard(row.ordernumber)}
        />
      </Popup>
    ),
  },
  {
    colKey: 'status',
    title: '订单状态',
    width: 100,
    // filter: {
    //   type: 'multiple',
    //   resetValue: [],
    //   list: [
    //     { label: 'All', checkAll: true },
    //     { label: '已签收', value: 0 },
    //     { label: '待签收', value: 1 },
    //     { label: '运输中', value: 2 },
    //     { label: '待发货', value: 3 },
    //     { label: '待打包', value: 4 },
    //   ],
    //   // 是否显示重置取消按钮，一般情况不需要显示
    //   showConfirmAndReset: true,
    // },
    cell: ({ row }) => (
      <Tag
        shape="round"
        theme={statusNameListMap[row.status].theme}
        variant="light-outline"
      >
        {statusNameListMap[row.status].label}
      </Tag>
    ),
  },
  {
    colKey: 'commodity',
    title: '商品信息',
    ellipsis: true,
    width: 120,
  },
    {
    colKey: 'perprice',
    title: '单价（元）',
    ellipsis: true,
    width: 80,
    sorter: true,
    sortType: 'all',
  },
      {
    colKey: 'quantity',
    title: '数量',
    ellipsis: true,
    width: 60,
  },
  
  {
    colKey: 'price',
    title: '总价格（元）',
    ellipsis: true,
    width: 80,
    sorter: true,
    sortType: 'all',
  },
  {
    colKey: 'recipient',
    title: '收货人',
    ellipsis: true,
    width: 100,
  },
  {
    colKey: 'createtime',
    title: '下单时间',
    ellipsis: true,
    width: 120,
    sorter: true,
    sortType: 'all',
  },
  // {
  //   colKey: 'packtime',
  //   title: '打包时间',
  //   ellipsis: true,
  //   width: 120,
  // },
  // {
  //   colKey: 'transtime',
  //   title: '发货时间',
  //   ellipsis: true,
  //   width: 120,
  // },
  // {
  //   colKey: 'arrivetime',
  //   title: '到达时间',
  //   ellipsis: true,
  //   width: 120,
  // },
  // {
  //   colKey: 'accepttime',
  //   title: '签收时间',
  //   ellipsis: true,
  //   width: 120,
  // },
  // {
  //   title: '签署方式（超长标题示例）',
  //   colKey: 'channel',
  //   width: 120,
  //   ellipsisTitle: true,
  // },
  // {
  //   title: '邮箱地址',
  //   colKey: 'ellipsisProps',
  //   // 浮层浅色背景，方向默认朝下出现
  //   ellipsis: {
  //     theme: 'light' as const,
  //     placement: 'bottom' as const,
  //   },
  // },
  // {
  //   title: '申请事项',
  //   colKey: 'ellipsisContent',
  //   // ellipsis 定义超出省略的浮层内容，cell 定义单元格内容
  //   ellipsis: ({ row }) => (
  //     <div>
  //       {row.ellipsisContent}
  //       <FileCopyIcon
  //         style={{ cursor: 'pointer', marginLeft: '4px' }}
  //         onClick={() => copyToClipboard(row.ellipsisContent)}
  //       />
  //     </div>
  //   ),
  // },
  // {
  //   title: '审核时间',
  //   colKey: 'propsAndContent1',
  //   // 支持同时设置 tooltipProps 和 浮层内容,
  //   width: 100,
  //   ellipsis: {
  //     props: {
  //       theme: 'light' as const,
  //       placement: 'bottom-right' as const,
  //     },
  //     content: ({ row }) => (
  //       <div>
  //         <p>
  //           <b>创建日期:</b> {row.propsAndContent1}
  //         </p>
  //         <p>
  //           <b>审核时长(天):</b> {row.propsAndContent2}
  //         </p>
  //       </div>
  //     ),
  //   },
  // },
  // {
  //   title: '操作',
  //   colKey: 'link',
  //   width: 100,
  //   // 超出省略的内容显示纯文本，不带任何样式和元素
  //   ellipsis: ({ row }) => row.link,
  //   // 注意这种 JSX 写法需设置 <script lang="jsx" setup>
  //   cell: ({ row }) => (
  //     <a href="/vue-next/components/table" target="_blank">
  //       {row.link}
  //     </a>
  //   ),
  // },
];



const Orders = (): React.ReactElement => {

  const [orderNo, setOrderNo] = useState('');
  const [orderStatus, setOrderStatus] = useState(4); // 默认状态为4（已送达）
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  // 单个订单更新
  const handleSingleUpdate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const request: UpdateStatusRequest = {
        order_no: orderNo,
        order_status: orderStatus
      };

      const result = await orderService.updateOrderStatus(request);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ ${result.message}`
        });
        // 清空输入
        setOrderNo('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({
        type: 'error',
        text: `❌ 请求失败: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };

  // 搜索输入的值（临时状态）
  const [tempFilters, setTempFilters] = useState({
    ordernumberFilter: '',
    commodityFilter: '',
    recipientFilter: '',
  });
  // 实际用于筛选的值（点击搜索按钮后设置）
  const [appliedFilters, setAppliedFilters] = useState({
    ordernumberFilter: '',
    commodityFilter: '',
    recipientFilter: '',
  });
  // 处理输入框变化
  const handleInputChange = (key: 'ordernumberFilter' | 'commodityFilter' | 'recipientFilter', value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  // 点击搜索按钮
  const handleSearch = () => {
    setAppliedFilters({
      ordernumberFilter: tempFilters.ordernumberFilter.trim(),
      commodityFilter: tempFilters.commodityFilter.trim(),
      recipientFilter: tempFilters.recipientFilter.trim(),
    });
    setData(filteredData)
  };
  const handlereset = () => {
    setTempFilters({
      ordernumberFilter: '',
      commodityFilter: '',
      recipientFilter: '',
    });
    setAppliedFilters({
      ordernumberFilter: '',
      commodityFilter: '',
      recipientFilter: '',
    });
    setData(filteredData)
  };
  // 根据 appliedFilters 筛选数据
  const filteredData = useMemo(() => {
    const { ordernumberFilter, commodityFilter, recipientFilter } = appliedFilters;
    if (!ordernumberFilter && !commodityFilter && !recipientFilter) {
      return data;
    }
    return data.filter((item) => {
      // 订单编号筛选
      let orderIdMatch = true;
      if (ordernumberFilter) {
        orderIdMatch = item.ordernumber.toString().includes(ordernumberFilter);
      }
      // 商品信息筛选
      let productMatch = true;
      if (commodityFilter) {
        productMatch = item.commodity.toLowerCase().includes(commodityFilter.toLowerCase());
      }
      // 收件人筛选
      let recipientFilterMatch = true;
      if (recipientFilter) {
        recipientFilterMatch = item.recipient.toLowerCase().includes(recipientFilter.toLowerCase());
      }
      return orderIdMatch && productMatch && recipientFilterMatch;
    });
  }, [data, appliedFilters]);


  //排序功能部分
  const [datan, setData] = useState(filteredData);
  const [sort, setSort] = useState<TableSort>({
    // 按照 status 字段进行排序
    sortBy: 'status',
    // 是否按照降序进行排序
    descending: true,
  });
  const request = (sort: SortInfo) => {
    // 模拟异步请求，进行数据排序
    const timer = setTimeout(() => {
      if (!sort || !sort.sortBy) {
        setData([...filteredData]);
        return;
      }
      const datanew = filteredData.concat().sort((a, b) => {
        const aValue = a[sort.sortBy];
        const bValue = b[sort.sortBy];
        // 处理 null 或 undefined 值
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sort.descending ? 1 : -1;
        if (bValue == null) return sort.descending ? -1 : 1;
        // 数字排序
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sort.descending ? bValue - aValue : aValue - bValue;
        }
        // 字符串排序
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sort.descending
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        }
      });
      setData([...datanew]);
      clearTimeout(timer);
    }, 100);
  };
  const onSortChange = (sort: SortInfo) => {
    setSort(sort);
    request(sort);
  };


  //立即发货功能部分
  // 选中的行数据（id数组）
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  // 对话框显示状态
  const [dialogVisible, setDialogVisible] = useState(false);
  // 选中的订单编号
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  // 处理选择变化
  const handleSelectChange = (keys: (string | number)[]) => {
    setSelectedRowKeys(keys);
  };
  // 显示选中的订单
  const handleShowSelectedOrders = () => {
    if (selectedRowKeys.length === 0) {
      MessagePlugin.warning('请先选择订单');
      return;
    }
    // 根据选中的id获取订单编号
    const orders = data
      .filter(item => selectedRowKeys.includes(item.index) && [1, 2, 3].includes(item.status))
      .map(item => item.ordernumber);
    setSelectedOrders(orders);
    setOrderNo(orders.join());
    setDialogVisible(true);
  };



  // const navigate = useNavigate();

  // const handlewalkjump = () => {
  //   // 跳转到/about页面
  //   navigate('../../detail/mapwalking',{
  //     state: {
  //     userId: 123,
  //     userName: '张三',
  //     data: { /* 任意对象 */ }
  //   }
  // }
  //   );
  // };

  return (
    <Card title='订单详情' bordered={false} className={style.toolBar}>
      <Row>
        <Col >
          <FormItem label='订单编号：' name='ordernumber'>
            <Input placeholder='请输入订单编号' value={tempFilters.ordernumberFilter}
              onChange={(value) => handleInputChange('ordernumberFilter', value)} />
          </FormItem>
        </Col>
        <Col >
          <FormItem label='商品信息：' name='commodity'>
            <Input placeholder='请输入商品信息' value={tempFilters.commodityFilter}
              onChange={(value) => handleInputChange('commodityFilter', value)} />
          </FormItem>
        </Col>
        <Col >
          <FormItem label='收件人：' name='recipient'>
            <Input placeholder='请输入收件人' value={tempFilters.recipientFilter}
              onChange={(value) => handleInputChange('recipientFilter', value)} />
          </FormItem>
        </Col>
        <Col >
          <Tooltip content="双击查询" theme="light" placement="bottom" showArrow={false}>
            <Button theme='primary' type='submit' style={{ margin: '0px 20px' }} icon={<SearchIcon />} onClick={handleSearch} disabled={!tempFilters.ordernumberFilter && !tempFilters.commodityFilter && !tempFilters.recipientFilter}>
              查询
            </Button>
          </Tooltip>
        </Col>
        <Col >
          <Tooltip content="双击重置" theme="light" placement="bottom" showArrow={false}>
            <Button type='reset' variant='base' theme='default' icon={<RefreshIcon />} onClick={handlereset}>
              重置
            </Button>
          </Tooltip>
        </Col>
      </Row>
      <Row justify='space-between' className={style.toolBar}>
        <Col>
          <Tabs placement='top' size='medium' defaultValue='all'>
            <TabPanel value='all' label='全部订单'>
              <Table rowKey="index" data={datan} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} selectedRowKeys={selectedRowKeys}
                onSelectChange={handleSelectChange} onSortChange={onSortChange} pagination={{ total: datan.length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='0' label='等待买家付款'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 0)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 0).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='1' label='等待发货'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 1)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} selectedRowKeys={selectedRowKeys}
                onSelectChange={handleSelectChange} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 1).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='2' label='发货即将超时'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 2)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} selectedRowKeys={selectedRowKeys}
                onSelectChange={handleSelectChange} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 2).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='3' label='已过发货时间'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 3)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} selectedRowKeys={selectedRowKeys}
                onSelectChange={handleSelectChange} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 3).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='4' label='已发货'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 4)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 4).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='5' label='退款中'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 5)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 5).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='6' label='需要评价'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 6)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 6).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='7' label='成功的订单'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 7)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 7).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='8' label='关闭的订单'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 8)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={550}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 8).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
          </Tabs>
        </Col>
      </Row>
      <Row justify='space-between' className={style.toolBar}>
        <Button
          theme="primary"
          onClick={() => { handleShowSelectedOrders() }}
          disabled={selectedRowKeys.length === 0}
        >
          立即发货 (已选中{selectedRowKeys.length}条订单)
        </Button>
        {/* <BasicUsage/> */}
      </Row>
      {/* 显示选中订单的对话框 */}
      <Dialog
        width={800}
        header="立即发货"
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        footer={
          <Button theme="primary" onClick={() => { handleSingleUpdate(); setDialogVisible(false); }}>
            立即发货
          </Button>
        }
      >
        {/* {selectedOrders.length > 0 ? (
          <div> */}
        <p>已选中 {selectedRowKeys.length} 个订单中 {selectedOrders.length} 个订单可以发货：</p>
        {/* <ul style={{
              maxHeight: '200px',
              overflowY: 'auto',
              paddingLeft: '20px',
              marginTop: '10px'
            }}>                {selectedOrders.map((ordernumber, index) => (
              <li key={index} style={{ margin: '5px 0' }}>
                {ordernumber}
              </li>
            ))}
            </ul>
          </div>
        ) : (
          <p>没有选中任何订单</p>
        )} */}
        <Form
          labelAlign="right"
          layout="vertical"
          requiredMark
          requiredMarkPosition="left"
          resetType="empty"
          showErrorMessage
        >
          <FormItem label="订单编号">
            <Textarea disabled placeholder={selectedOrders.join()} />
          </FormItem>
          <FormItem
            label="快递单号"
            name="transportnum"
          >
            <Input placeholder="请输入内容" />
          </FormItem>
          <FormItem
            label="物流公司"
            name="transportcompany"
            rules={[{ required: true, message: '客户姓名不能为空' }]}
          >
            <Select
              options={[
                { label: '申通', value: '1' },
                { label: '中通', value: '2' },
                { label: '圆通', value: '3' },
                { label: '韵达', value: '4' },
                { label: '顺丰', value: '5' },
                { label: '中国邮政', value: '6' },
              ]}
            ></Select>
          </FormItem>
        </Form>
      </Dialog>
      {/* <Button theme="primary" onClick={handlewalkjump}>跳转到About页面</Button> */}
    </Card>
  );
};
export default React.memo(Orders);
