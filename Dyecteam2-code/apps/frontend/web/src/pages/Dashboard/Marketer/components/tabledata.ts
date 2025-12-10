
import { useEffect, useState } from 'react';
import type { TableProps} from 'tdesign-react';


// const initialdata: TableProps['data'] = [];
// const total = 48;
// for (let i = 0; i < total; i++) {
//   initialdata.push({
//     index: i + 1,
//     ordernumber: 1000000 + i,   //订单编号
//     status: i % 9,              //物流状态
//     price: [13, 128, 500, 1800, 4500,][i % 5],
//     commodity: ['牙签', '台灯', '手表', '手机', '电脑'][i % 5],
//     recipient: ['贾明', '张三', '王芳'][i % 3],
//     createtime: ['2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01'][i % 4],
//     packtime: ['2021-11-02', '2021-12-02', '2022-01-02', '2022-02-02'][i % 4],
//     transtime: ['2021-11-03', '2021-12-03', '2022-01-03', '2022-02-03'][i % 4],
//     arrivetime: ['2021-11-04', '2021-12-04', '2022-01-04', '2022-02-04'][i % 4],
//     accepttime: ['2021-11-05', '2021-12-05', '2022-01-05', '2022-02-05'][i % 4],
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
//   });
// };
// types/api.ts

// 1. 首先确保你有一个 LogisticsAPI 实例
import {LogisticsAPI} from '../../../../services/newapi';
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
        price: order.total_price,         // 价格
        commodity: order.order_name,      // 商品
        recipient: order.receiver_name,   // 收件人
        createtime: order.created_at              // 创建日期
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
// 假设你有一个 React 组件
// 定义数据类型接口
interface OrderRow {
  index: number;
  ordernumber: string;
  status: number;
  price: number;
  commodity: string;
  recipient: string;
  createtime: string;
}

// 在 useState 中指定类型

  const [initialdata, setInitialdata] = useState<OrderRow[]>([]); // 明确指定类型
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    const ndata = await loadData();
    setInitialdata(ndata);
    setLoading(false);
  };
  
  // ... 使用 initialdata 渲染表格

export const data = initialdata;
