// src/pages/Visualization/Abnormal/index.tsx

import React, { memo, useEffect, useMemo, useState } from 'react';
import { Card, Select, Table, Tag, MessagePlugin } from 'tdesign-react';
import Style from './index.module.less';
import {
  TIME_RANGE_OPTIONS,
  REGION_OPTIONS,
  ORDER_TYPE_OPTIONS,
  ABNORMAL_TYPE_OPTIONS,
  // mockAbnormalOrders,
  MOCK_TOTAL_ORDERS,
  ABNORMAL_RATE_THRESHOLD,
  HIGH_SEVERITY_THRESHOLD,
  type AbnormalOrder,
  type AbnormalCityStat,
} from './consts';

// 引入后端接口
import { fetchAbnormalDashboard } from '../../../services/logistics';

const { Option } = Select;

// 城市 -> 区域 映射
function cityToArea(city: string): AbnormalOrder['area'] {
  if (['上海市', '杭州市', '南京市'].includes(city)) return '华东';
  if (['广州市', '深圳市'].includes(city)) return '华南';
  if (['北京市', '天津市'].includes(city)) return '华北';
  return '华东';
}

// 把后端中文的“异常类型”映射成前端枚举
function mapAbnormalType(raw: string | undefined): AbnormalOrder['abnormalType'] {
  switch (raw) {
    case '配送超时':
      return 'overtime';
    case '派送失败':
      return 'delivery_fail';
    case '物流停滞':
      return 'stuck';
    case '退件/改派':
      return 'returned';
    case '用户投诉':
      return 'complaint';
    case '高风险预警':
      return 'complaint';
    default:
      return 'overtime';
  }
}

// 把后端中文“高/中/低”映射成前端枚举
function mapSeverity(raw: string | undefined): AbnormalOrder['severity'] {
  if (raw === '高') return 'high';
  if (raw === '低') return 'low';
  return 'medium';
}

const AbnormalPage: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [selectedAbnormalType, setSelectedAbnormalType] = useState<string>('all');

  const [orderList, setOrderList] = useState<AbnormalOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // ===================== 1. 首次加载：请求后端数据 =====================
  useEffect(() => {
    const query = async () => {
      setLoading(true);
      try {
        // 后端返回 { code, message, data: { summary, realtimeList, cityStats } }
        const res = await fetchAbnormalDashboard();
        const { code, data, message } = res as any;

        if (code !== 0 || !data) {
          throw new Error(message || '接口返回异常');
        }

        const realtimeList = (data.realtimeList || []) as any[];

        const mapped: AbnormalOrder[] = realtimeList.map((item, index) => {
          const city = item.city || '未知城市';
          const abnormalType = mapAbnormalType(item.abnormalType);
          const severity = mapSeverity(item.severity);
          const delayHours = Number(item.durationHours ?? item.delayHours ?? 0) || 0;

          return {
            id: item.orderNo || item.id || `A${index + 1}`,
            city,
            area: cityToArea(city),
            abnormalType,
            severity,
            delayHours,
            status: item.currentStatus || item.status || '',
            triggerTime: item.triggerTime || '',
          };
        });

        setOrderList(mapped);
      } catch (e) {
        console.error(e);
        MessagePlugin.error('异常订单监控数据获取失败，当前展示可能为空');
        // 需要兜底可用本地 mock：
        // setOrderList(mockAbnormalOrders);
      } finally {
        setLoading(false);
      }
    };

    query();
  }, []);

  // ===================== 2. 根据筛选条件过滤异常订单 =====================

  const filteredOrders: AbnormalOrder[] = useMemo(
    () =>
      orderList.filter((order) => {
        const regionOk =
          selectedRegion === 'all' ||
          (selectedRegion === 'east' && order.area === '华东') ||
          (selectedRegion === 'north' && order.area === '华北') ||
          (selectedRegion === 'south' && order.area === '华南');

        const typeOk = selectedAbnormalType === 'all' || order.abnormalType === selectedAbnormalType;

        const orderTypeOk = true;
        const timeOk = true;

        return regionOk && typeOk && orderTypeOk && timeOk;
      }),
    [orderList, selectedRegion, selectedAbnormalType, selectedOrderType, selectedTimeRange],
  );

  // ===================== 3. 顶部三张卡片的总体统计 =====================

  const { abnormalCount, abnormalRate, highSeverityCount } = useMemo(() => {
    const count = filteredOrders.length;
    const highCount = filteredOrders.filter((o) => o.severity === 'high').length;

    const rate = MOCK_TOTAL_ORDERS > 0 ? count / MOCK_TOTAL_ORDERS : 0;

    return {
      abnormalCount: count,
      abnormalRate: rate,
      highSeverityCount: highCount,
    };
  }, [filteredOrders]);

  const isRateHigh = abnormalRate >= ABNORMAL_RATE_THRESHOLD;
  const isHighSeverityTooMany = highSeverityCount >= HIGH_SEVERITY_THRESHOLD;

  // ===================== 4. 城市维度统计（右侧表格） =====================

  const cityStats: AbnormalCityStat[] = useMemo(() => {
    const map = new Map<string, AbnormalCityStat>();

    filteredOrders.forEach((order) => {
      const prev = map.get(order.city);
      if (prev) {
        prev.abnormalCount += 1;
        if (order.severity === 'high') {
          prev.highSeverityCount += 1;
        }
      } else {
        map.set(order.city, {
          city: order.city,
          area: order.area,
          abnormalCount: 1,
          highSeverityCount: order.severity === 'high' ? 1 : 0,
          percent: 0,
        });
      }
    });

    const list = Array.from(map.values());
    const total = list.reduce((sum, item) => sum + item.abnormalCount, 0) || 1;

    list.forEach((item) => {
      item.percent = item.abnormalCount / total;
    });

    list.sort((a, b) => b.abnormalCount - a.abnormalCount);

    return list;
  }, [filteredOrders]);

  const maxCityAbnormal = useMemo(
    () => (cityStats.length ? Math.max(...cityStats.map((c) => c.abnormalCount)) : 0),
    [cityStats],
  );

  // ===================== 5. 表格列配置 =====================

  const abnormalColumns = [
    {
      colKey: 'id',
      title: '订单号',
      align: 'left' as const,
      cell: ({ row }: { row: AbnormalOrder }) => (
        <span
          className={Style.orderIdLink}
          onClick={() => {
            console.log('TODO: 跳转到包裹轨迹查询，订单号：', row.id);
          }}
        >
          {row.id}
        </span>
      ),
    },
    {
      colKey: 'city',
      title: '城市',
      align: 'left' as const,
    },
    {
      colKey: 'abnormalType',
      title: '异常类型',
      align: 'center' as const,
      cell: ({ row }: { row: AbnormalOrder }) => {
        let label = '';
        switch (row.abnormalType) {
          case 'overtime':
            label = '配送超时';
            break;
          case 'delivery_fail':
            label = '派送失败';
            break;
          case 'stuck':
            label = '物流停滞';
            break;
          case 'returned':
            label = '退件/改派';
            break;
          case 'complaint':
            label = '用户投诉 / 高风险预警';
            break;
          default:
            label = row.abnormalType;
        }
        return (
          <div className={Style.typeCell}>
            <Tag theme='warning' variant='light-outline' size='small'>
              {label}
            </Tag>
          </div>
        );
      },
    },
    {
      colKey: 'severity',
      title: '严重等级',
      align: 'center' as const,
      cell: ({ row }: { row: AbnormalOrder }) => {
        let theme: 'success' | 'warning' | 'danger' = 'success';
        let text = '';
        if (row.severity === 'high') {
          theme = 'danger';
          text = '高';
        } else if (row.severity === 'medium') {
          theme = 'warning';
          text = '中';
        } else {
          theme = 'success';
          text = '低';
        }
        return (
          <div className={Style.typeCell}>
            <Tag theme={theme} variant='light-outline' size='small'>
              {text}
            </Tag>
          </div>
        );
      },
    },
    {
      colKey: 'delayHours',
      title: '异常时长',
      align: 'right' as const,
      cell: ({ row }: { row: AbnormalOrder }) => `${row.delayHours.toFixed(1)} 小时`,
    },
    {
      colKey: 'status',
      title: '当前状态',
      align: 'left' as const,
    },
    {
      colKey: 'triggerTime',
      title: '触发时间',
      align: 'right' as const,
    },
  ];

  const cityColumns = [
    {
      colKey: 'city',
      title: '城市',
      align: 'left' as const,
    },
    {
      colKey: 'abnormalCount',
      title: '异常订单数',
      align: 'right' as const,
    },
    {
      colKey: 'highSeverityCount',
      title: '高危异常数',
      align: 'right' as const,
    },
    {
      colKey: 'percent',
      title: '占比',
      align: 'right' as const,
      cell: ({ row }: { row: AbnormalCityStat }) => `${(row.percent * 100).toFixed(1)}%`,
    },
    {
      colKey: 'bar',
      title: '异常占比（条形图）',
      align: 'left' as const,
      cell: ({ row }: { row: AbnormalCityStat }) => {
        const { abnormalCount } = row;
        const percent = maxCityAbnormal > 0 ? abnormalCount / maxCityAbnormal : 0;
        return (
          <div className={Style.barCell}>
            <div className={Style.barTrack}>
              <div className={Style.barFill} style={{ width: `${(percent * 100).toFixed(1)}%` }} />
            </div>
            <span className={Style.barLabel}>{abnormalCount}单</span>
          </div>
        );
      },
    },
  ];

  // ===================== 6. 渲染 =====================

  return (
    <div className={Style.page}>
      <div className={Style.filterBar}>
        <span className={Style.filterLabel}>时间范围</span>
        <Select
          style={{ width: 140 }}
          value={selectedTimeRange}
          onChange={(value) => setSelectedTimeRange(value as string)}
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>

        <span className={Style.filterLabel}>区域</span>
        <Select style={{ width: 140 }} value={selectedRegion} onChange={(value) => setSelectedRegion(value as string)}>
          {REGION_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>

        <span className={Style.filterLabel}>订单类型</span>
        <Select
          style={{ width: 140 }}
          value={selectedOrderType}
          onChange={(value) => setSelectedOrderType(value as string)}
        >
          {ORDER_TYPE_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>

        <span className={Style.filterLabel}>异常类型</span>
        <Select
          style={{ width: 140 }}
          value={selectedAbnormalType}
          onChange={(value) => setSelectedAbnormalType(value as string)}
        >
          {ABNORMAL_TYPE_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>
      </div>

      <div className={Style.summaryRow}>
        <Card className={Style.summaryItem} bordered={false} title='当前异常订单数'>
          <div className={Style.summaryValue}>{abnormalCount} 单</div>
          <div className={Style.summarySub}>基于当前筛选条件统计</div>
        </Card>

        <Card className={Style.summaryItem} bordered={false} title='异常订单占比'>
          <div className={Style.summaryValue}>
            {(abnormalRate * 100).toFixed(2)}%
            <Tag style={{ marginLeft: 8 }} theme={isRateHigh ? 'danger' : 'success'} variant='light-outline'>
              {isRateHigh ? '高于系统警戒线' : '处于正常范围'}
            </Tag>
          </div>
          <div className={Style.summarySub}>警戒线：≥ {(ABNORMAL_RATE_THRESHOLD * 100).toFixed(1)}%</div>
        </Card>

        <Card className={Style.summaryItem} bordered={false} title='高危异常订单数'>
          <div className={Style.summaryValue}>
            {highSeverityCount} 单
            <Tag style={{ marginLeft: 8 }} theme={isHighSeverityTooMany ? 'danger' : 'warning'} variant='light-outline'>
              {isHighSeverityTooMany ? '需要立即关注' : '可控范围内'}
            </Tag>
          </div>
          <div className={Style.summarySub}>高危定义：严重等级为“高”的异常订单</div>
        </Card>
      </div>

      <div className={Style.contentRow}>
        <div className={Style.leftPanel}>
          <Card title='实时异常订单列表' bordered={false}>
            <Table
              className={Style.abnormalTable}
              rowKey='id'
              size='small'
              hover
              columns={abnormalColumns}
              data={filteredOrders}
              loading={loading}
            />
          </Card>
        </div>

        <div className={Style.rightPanel}>
          <Card title='异常订单城市排行' bordered={false}>
            <Table rowKey='city' size='small' hover columns={cityColumns} data={cityStats} loading={loading} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default memo(AbnormalPage);
