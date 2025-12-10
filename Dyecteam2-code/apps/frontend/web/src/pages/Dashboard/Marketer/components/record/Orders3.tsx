import React, { useState } from 'react';
import style from './Orders.module.less';
import CommonStyle from 'styles/common.module.less';
import { MessagePlugin, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox } from 'tdesign-react';
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
const total = 18;
for (let i = 0; i < total; i++) {
  data.push({
    index: i + 1,
    ordernumber: 1000000 + i,
    price: [13, 128, 500, 1800, 4500,][i % 5],
    commodity: ['牙签', '台灯', '手表', '手机', '电脑'][i % 5],
    recipient: ['贾明', '张三', '王芳'][i % 3],
    createtime: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01'][i % 5],
    packtime: ['2021-11-02', '2021-12-02', '2022-01-02', '2022-02-02', '2022-03-02'][i % 5],
    transtime: ['2021-11-03', '2021-12-03', '2022-01-03', '2022-02-03', '2022-03-03'][i % 5],
    arrivetime: ['2021-11-04', '2021-12-04', '2022-01-04', '2022-02-04', '2022-03-04'][i % 5],
    accepttime: ['2021-11-05', '2021-12-05', '2022-01-05', '2022-02-05', '2022-03-05'][i % 5],
    applicant: ['贾明（kyrieJia）', '张三（threeZhang)', '王芳（fangWang)'][i % 3],
    status: i % 5,
    channel: ['电子签署', '纸质签署', '纸质签署'][i % 3],
    desc: ['单元格文本超出省略设置', '这是普通文本的超出省略'][i % 2],
    link: '点击查看审批详情',
    something: '仅标题省略',
    // 透传 Tooltip Props 到浮层组件
    ellipsisProps: ['w.cezkdudy@lhll.au', 'r.nmgw@peurezgn.sl', 'p.cumx@rampblpa.ru'][i % 3],
    // 完全自定义超出省略的 Tips 内容
    ellipsisContent: ['宣传物料制作费用', 'algolia 服务报销', '相关周边制作费', '激励奖品快递费'][i % 4],
    propsAndContent1: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01'][i % 4],
    propsAndContent2: [2, 3, 1, 4][i % 4],
  });
}

const statusNameListMap = {
  0: { label: '已签收', theme: 'success', icon: <CheckCircleFilledIcon /> },
  1: { label: '待签收', theme: 'success', icon: <CloseCircleFilledIcon /> },
  2: { label: '运输中', theme: 'warning', icon: <ErrorCircleFilledIcon /> },
  3: { label: '待发货', theme: 'warning', icon: <CloseCircleFilledIcon /> },
  4: { label: '待打包', theme: 'warning', icon: <ErrorCircleFilledIcon /> },
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
  },
  {
    colKey: 'status',
    title: '物流状态',
    width: 120,
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
    title: '创建时间',
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
  const [hideSortTips, setHideSortTips] = useState(false);
  const [datan, setData] = useState([...data]);
  const [sort, setSort] = useState<TableSort>({
    // 按照 status 字段进行排序
    sortBy: 'price',
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
      const datan = data
        .concat()
        .sort((a, b) => (sort.descending ? b[sort.sortBy] - a[sort.sortBy] : a[sort.sortBy] - b[sort.sortBy]));
      setData([...datan]);
      clearTimeout(timer);
    }, 100);
  };
  const onSortChange = (sort: SortInfo) => {
    setSort(sort);
    request(sort);
  };

  const table = (<Table
    rowKey="index"
    data={data}
    columns={columns}
    cellEmptyContent={'-'}
    resizable
    lazyLoad
    hover
    maxHeight={400}
    sort={sort}
    showSortColumnBgColor={true}
    onSortChange={onSortChange}
    pagination={{
      total,
      defaultCurrent: 1,
      defaultPageSize: 10,
      showJumper: true,
    }}
  />
  );
  return (
    <div className={classnames(CommonStyle.pageWithPadding, CommonStyle.pageWithColor)}>
      <Card title='订单详情' bordered={false}>
        <Row justify='space-between' className={style.toolBar}>
          <Col>
            <Row gutter={8} align='middle'>
              <Col>
                <Button>全部</Button>
              </Col>
              <Col>
                <Button theme='default'>待打包</Button>
              </Col>
              <Col>
                <Button theme='default'>待发货</Button>
              </Col>
              <Col>
                <Button theme='default'>运输中</Button>
              </Col>
              <Col>
                <Button theme='default'>待签收</Button>
              </Col>
              <Col>
                <Button theme='default'>已签收</Button>
              </Col>
              {/* <Col>
              <div>已选 {selectedRowKeys?.length || 0} 项</div>
            </Col> */}
            </Row>
          </Col>
          <Col>
            <Input suffixIcon={<SearchIcon />} placeholder='请输入订单号' />
          </Col>
        </Row>
        <Row>
          <Col>
            <Checkbox checked={hideSortTips} onChange={setHideSortTips}>
              隐藏排序文本提示
            </Checkbox>
          </Col>
        </Row>
        <Row justify='space-between' className={style.toolBar}>
          {table}
        </Row>
        <Row justify='space-between' className={style.toolBar}>
          <Button type="submit">模拟发货</Button>
        </Row>
      </Card>
    </div >
  );
};
export default React.memo(Orders);
