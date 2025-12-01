import React, { useState } from 'react';
import style from './Orders.module.less';
import { MessagePlugin, Tabs, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox } from 'tdesign-react';
import { FileCopyIcon, ErrorCircleFilledIcon, CheckCircleFilledIcon, CloseCircleFilledIcon, SearchIcon } from 'tdesign-icons-react';
import classnames from 'classnames';
import type { TableProps } from 'tdesign-react';

// thanks to https://www.zhangxinxu.com/wordpress/2021/10/js-copy-paste-clipboard/
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


const data: TableProps['data'] = [];
const total = 48;
for (let i = 0; i < total; i++) {
  data.push({
    index: i + 1,
    ordernumber: 1000000 + i,   //订单编号
    status: i % 9,              //物流状态
    price: [13, 128, 500, 1800, 4500,][i % 5],
    commodity: ['牙签', '台灯', '手表', '手机', '电脑'][i % 5],
    recipient: ['贾明', '张三', '王芳'][i % 3],
    createtime: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01'][i % 5],
    packtime: ['2021-11-02', '2021-12-02', '2022-01-02', '2022-02-02', '2022-03-02'][i % 5],
    transtime: ['2021-11-03', '2021-12-03', '2022-01-03', '2022-02-03', '2022-03-03'][i % 5],
    arrivetime: ['2021-11-04', '2021-12-04', '2022-01-04', '2022-02-04', '2022-03-04'][i % 5],
    accepttime: ['2021-11-05', '2021-12-05', '2022-01-05', '2022-02-05', '2022-03-05'][i % 5],
    // applicant: ['贾明（kyrieJia）', '张三（threeZhang)', '王芳（fangWang)'][i % 3],
    // channel: ['电子签署', '纸质签署', '纸质签署'][i % 3],
    // desc: ['单元格文本超出省略设置', '这是普通文本的超出省略'][i % 2],
    // link: '点击查看审批详情',
    // something: '仅标题省略',
    // // 透传 Tooltip Props 到浮层组件
    // ellipsisProps: ['w.cezkdudy@lhll.au', 'r.nmgw@peurezgn.sl', 'p.cumx@rampblpa.ru'][i % 3],
    // // 完全自定义超出省略的 Tips 内容
    // ellipsisContent: ['宣传物料制作费用', 'algolia 服务报销', '相关周边制作费', '激励奖品快递费'][i % 4],
    // propsAndContent1: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01'][i % 4],
    // propsAndContent2: [2, 3, 1, 4][i % 4],
  });
}
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
    // width: 50,
  },
  {
    colKey: 'ordernumber',
    title: '订单编号',
    ellipsis: true,
    width: 180,
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
      </Popup>
    ),
  },
  {
    colKey: 'status',
    title: '物流状态',
    width: 120,
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
    colKey: 'price',
    title: '商品价格（元）',
    ellipsis: true,
    width: 160,
    sorter: true,
    sortType: 'all',
  },
  {
    colKey: 'recipient',
    title: '收货人',
    ellipsis: true,
    width: 120,
  },
  {
    colKey: 'createtime',
    title: '下单时间',
    ellipsis: true,
    width: 120,
    sorter: true,
    sortType: 'all',
  },
  {
    colKey: 'packtime',
    title: '打包时间',
    ellipsis: true,
    width: 120,
  },
  {
    colKey: 'transtime',
    title: '发货时间',
    ellipsis: true,
    width: 120,
  },
  {
    colKey: 'arrivetime',
    title: '到达时间',
    ellipsis: true,
    width: 120,
  },
  {
    colKey: 'accepttime',
    title: '签收时间',
    ellipsis: true,
    width: 120,
  },
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
  const [datan, setData] = useState([...data]);
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
        setData([...data]);
        return;
      }
      const datanew = data.concat().sort((a, b) => {
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
  return (
    <Card title='订单详情' bordered={false} className={style.toolBar}>
      <Row justify='space-between' className={style.toolBar}>
        <Col>
          <Tabs placement='top' size='medium' defaultValue='all'>
            <TabPanel value='all' label='全部订单'>
              <Table rowKey="index" data={datan} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='0' label='等待买家付款'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 0)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 0).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='1' label='等待发货'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 1)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 1).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='2' label='发货即将超时'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 2)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 2).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='3' label='已过发货时间'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 3)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 3).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='4' label='已发货'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 4)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 4).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='5' label='退款中'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 5)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 5).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='6' label='需要评价'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 6)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 6).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='7' label='成功的订单'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 7)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 7).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
            <TabPanel value='8' label='关闭的订单'>
              <Table rowKey="index" data={datan.filter((item) => item.status === 8)} columns={columns} cellEmptyContent={'-'} resizable lazyLoad hover maxHeight={400}
                sort={sort} showSortColumnBgColor={true} onSortChange={onSortChange} pagination={{ total: datan.filter((item) => item.status === 8).length, defaultCurrent: 1, defaultPageSize: 10, showJumper: true, }} />
            </TabPanel>
          </Tabs>
        </Col>
      </Row>
      <Row justify='space-between' className={style.toolBar}>
        <Button type="submit">模拟发货</Button>
      </Row>
    </Card>
  );
};
export default React.memo(Orders);
