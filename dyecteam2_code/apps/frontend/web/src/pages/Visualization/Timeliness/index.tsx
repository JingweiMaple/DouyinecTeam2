// src/pages/Visualization/Timeliness/index.tsx
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Card, Select, Table, Tag, MessagePlugin } from 'tdesign-react';
import Style from './index.module.less';
import {
  TIME_RANGE_OPTIONS,
  REGION_OPTIONS,
  ORDER_TYPE_OPTIONS,
  mockRegionStats,
  mockDailyStats7d,
  SYSTEM_EXPECT_HOURS,
  SYSTEM_ON_TIME_THRESHOLD,
  type RegionTimeliness,
  type DailyTimeliness,
} from './consts';

// ⭐ 从服务层请求后端接口
import { fetchTimelinessAnalysis } from '../../../services/logistics';

const { Option } = Select;

const TimelinessPage: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');

  // ====================== 1. 接后端：基础数据状态 ======================

  const [regionData, setRegionData] = useState<RegionTimeliness[]>(mockRegionStats);
  const [dailyData, setDailyData] = useState<DailyTimeliness[]>(mockDailyStats7d);
  const [loading, setLoading] = useState<boolean>(false);

  // 组件挂载时，请求 /api/dashboard/timeliness
  useEffect(() => {
    const query = async () => {
      setLoading(true);
      try {
        // 拦截器已经返回 { code, message, data }
        const res = await fetchTimelinessAnalysis();
        const { code, message, data } = res as {
          code?: number;
          message?: string;
          data?: {
            trend7d?: Array<{ date: string; avgHours: number; onTimeRate: number }>;
            regionStats?: Array<{
              region: string;
              avgHours: number;
              onTimeRate: number; // 0~1
              orderCount: number;
            }>;
          };
        };

        if (code !== 0 || !data) {
          MessagePlugin.error(message || '获取配送时效数据失败，当前展示为示例数据');
          return;
        }

        const { trend7d, regionStats } = data;

        if (regionStats && regionStats.length) {
          const mappedRegions: RegionTimeliness[] = regionStats.map((item) => ({
            region: item.region,
            area: item.region as RegionTimeliness['area'],
            avgHours: item.avgHours,
            onTimeRate: item.onTimeRate, // 0~1
            orderCount: item.orderCount,
          }));
          setRegionData(mappedRegions);
        }

        if (trend7d && trend7d.length) {
          const mappedDaily: DailyTimeliness[] = trend7d.map((d) => ({
            date: d.date,
            avgHours: d.avgHours,
            onTimeRate: d.onTimeRate,
          }));
          setDailyData(mappedDaily);
        }
      } catch (e) {
        console.error(e);
        MessagePlugin.error('获取配送时效数据失败，当前展示为示例数据');
      } finally {
        setLoading(false);
      }
    };

    query();
  }, []);

  // ====================== 2. 原有统计逻辑：只是数据源改成 regionData ======================

  const filteredRegions: RegionTimeliness[] = useMemo(
    () =>
      regionData.filter((r) => {
        if (selectedRegion === 'all') return true;
        if (selectedRegion === 'east') return r.area === '华东';
        if (selectedRegion === 'north') return r.area === '华北';
        if (selectedRegion === 'south') return r.area === '华南';
        return true;
      }),
    [regionData, selectedRegion],
  );

  const { avgHoursOverall, onTimeRateOverall, overtimeOrders } = useMemo(() => {
    if (!filteredRegions.length) {
      return {
        avgHoursOverall: 0,
        onTimeRateOverall: 0,
        overtimeOrders: 0,
      };
    }

    let totalOrders = 0;
    let weightedHours = 0;
    let onTimeOrders = 0;

    filteredRegions.forEach((region) => {
      totalOrders += region.orderCount;
      weightedHours += region.avgHours * region.orderCount;
      onTimeOrders += region.onTimeRate * region.orderCount;
    });

    const avgHours = totalOrders ? weightedHours / totalOrders : 0;
    const onTimeRate = totalOrders ? onTimeOrders / totalOrders : 0; // 0~1

    const overtime = Math.round(totalOrders * (1 - onTimeRate));

    return {
      avgHoursOverall: avgHours,
      onTimeRateOverall: onTimeRate,
      overtimeOrders: overtime,
    };
  }, [filteredRegions]);

  const maxAvgHours = useMemo(
    () => (filteredRegions.length ? Math.max(...filteredRegions.map((r) => r.avgHours)) : 0),
    [filteredRegions],
  );

  const regionRank = useMemo(() => [...filteredRegions].sort((a, b) => a.avgHours - b.avgHours), [filteredRegions]);

  const isOnTimeOk = onTimeRateOverall >= SYSTEM_ON_TIME_THRESHOLD;

  const columns = [
    { colKey: 'region', title: '城市', align: 'left' as const },
    {
      colKey: 'avgHours',
      title: '平均配送时长（小时）',
      align: 'right' as const,
      cell: ({ row: { avgHours } }: { row: RegionTimeliness }) => avgHours.toFixed(1),
    },
    {
      colKey: 'onTimeRate',
      title: '准时率',
      align: 'right' as const,
      cell: ({ row }: { row: RegionTimeliness }) => {
        const rate = row.onTimeRate;
        const text = `${(rate * 100).toFixed(1)}%`;
        const theme = rate >= SYSTEM_ON_TIME_THRESHOLD ? 'success' : 'danger';
        return (
          <Tag theme={theme} variant='light-outline' size='small'>
            {text}
          </Tag>
        );
      },
    },
    {
      colKey: 'bar',
      title: '时效对比（条形图）',
      align: 'left' as const,
      cell: ({ row }: { row: RegionTimeliness }) => {
        const { avgHours } = row;
        const percent = maxAvgHours ? avgHours / maxAvgHours : 0;
        return (
          <div className={Style.barCell}>
            <div className={Style.barTrack}>
              <div className={Style.barFill} style={{ width: `${(percent * 100).toFixed(1)}%` }} />
            </div>
            <span className={Style.barLabel}>{avgHours.toFixed(1)}h</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className={Style.page}>
      {/* 筛选条 */}
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
      </div>

      {/* 上方三张概览卡片 */}
      <div className={Style.summaryRow}>
        <Card className={Style.summaryItem} bordered={false} title='平均配送时长'>
          <div className={Style.summaryValue}>{avgHoursOverall.toFixed(1)} 小时</div>
          <div className={Style.summarySub}>系统期望：≤ {SYSTEM_EXPECT_HOURS} 小时</div>
        </Card>

        <Card className={Style.summaryItem} bordered={false} title='整体准时率'>
          <div className={Style.summaryValue}>
            {(onTimeRateOverall * 100).toFixed(1)}%
            <Tag style={{ marginLeft: 8 }} theme={isOnTimeOk ? 'success' : 'danger'} variant='light-outline'>
              {isOnTimeOk ? '整体符合系统要求' : '低于系统要求'}
            </Tag>
          </div>
          <div className={Style.summarySub}>达标阈值：≥ {(SYSTEM_ON_TIME_THRESHOLD * 100).toFixed(0)}%</div>
        </Card>

        <Card className={Style.summaryItem} bordered={false} title='超时订单数量'>
          <div className={Style.summaryValue}>{overtimeOrders} 单</div>
          <div className={Style.summarySub}>基于当前筛选条件估算</div>
        </Card>
      </div>

      {/* 下方：左时效趋势 + 右城市排行榜 */}
      <div className={Style.contentRow}>
        <div className={Style.leftPanel}>
          <Card title='近7天配送时效趋势' bordered={false}>
            <Table
              rowKey='date'
              size='small'
              hover
              columns={[
                { colKey: 'date', title: '日期', align: 'left' as const },
                {
                  colKey: 'avgHours',
                  title: '平均配送时长（小时）',
                  align: 'right' as const,
                  cell: ({ row }: { row: DailyTimeliness }) => `${row.avgHours.toFixed(1)} 小时`,
                },
                {
                  colKey: 'onTimeRate',
                  title: '准时率',
                  align: 'right' as const,
                  cell: ({ row }: { row: DailyTimeliness }) => {
                    const rate = row.onTimeRate;
                    const text = `${(rate * 100).toFixed(1)}%`;
                    const theme = rate >= SYSTEM_ON_TIME_THRESHOLD ? 'success' : 'danger';
                    return (
                      <Tag theme={theme} variant='light-outline' size='small'>
                        {text}
                      </Tag>
                    );
                  },
                },
              ]}
              data={dailyData}
              loading={loading}
            />
          </Card>
        </div>

        <div className={Style.rightPanel}>
          <Card title='城市配送时效排行' bordered={false}>
            <Table rowKey='region' size='small' hover columns={columns} data={regionRank} loading={loading} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default memo(TimelinessPage);
