// src/pages/Visualization/Overview/index.tsx

// ⭐【修改】增加 useEffect、useState，用于请求后端数据
import React, { memo, useEffect, useState } from 'react';
// ⭐【修改】增加 MessagePlugin，用于错误提示
import { Card, Tag, Button, MessagePlugin } from 'tdesign-react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import Style from './index.module.less';

// ⭐【修改】这里不再从 consts 里拿 overviewCards、orderTrend7d，只保留模块配置
// 原来：import { overviewCards, orderTrend7d, moduleSnapshots } from './consts';
import { moduleSnapshots } from './consts';

// ⭐【新增】引入后端的可视化总览接口（注意确保 services 里指向 /api/dashboard/overview）
import { fetchDashboardOverview } from '../../../services/logistics';

// ★ 保留：模块 key 类型
type ModuleKey = 'heatmap' | 'timeliness' | 'abnormal';

// ⭐【新增】根据 /api/dashboard/overview 的返回结构定义类型
interface Summary {
  todayOrderCount: number;
  todayOrderCompare: number;
  todayAbnormalCount: number;
  todayAbnormalRate: number;
  avgDeliveryHours: number;
  slaDeliveryHours: number;
  onTimeRate: number;
  onTimeTarget: number;
}

interface TrendItem {
  date: string;
  orderCount: number;
  abnormalCount: number;
}

interface StatusSnapshot {
  normalCount: number;
  abnormalCount: number;
  abnormalRate: number;
  normalRate: number;
  description: string;
}

interface RegionSummary {
  topRegions: string[];
  topRegionsRate: number;
  desc: string;
}

interface EfficiencySummary {
  avgDeliveryHours7d: number;
  onTimeRate7d: number;
  riskDesc: string;
}

interface ExceptionSummary {
  todayAbnormalCount: number;
  todaySevereCount: number;
  desc: string;
}

interface DashboardOverview {
  summary: Summary;
  trend7d: TrendItem[];
  statusSnapshot: StatusSnapshot;
  regionSummary: RegionSummary;
  efficiencySummary: EfficiencySummary;
  exceptionSummary: ExceptionSummary;
}

const OverviewPage: React.FC = () => {
  const navigate = useNavigate();

  // ⭐【新增】总览数据 & 加载状态
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // ⭐【新增】页面挂载时请求 /api/dashboard/overview（后端已从数据库统计）
  useEffect(() => {
    const query = async () => {
      setLoading(true);
      try {
        // 和订单列表、轨迹一样：res 就是 { code, data, message }
        const res: any = await fetchDashboardOverview();

        if (res.code === 0) {
          setOverview(res.data);
        } else {
          MessagePlugin.error(res.message || '获取可视化总览数据失败');
        }
      } catch (e) {
        console.error(e);
        MessagePlugin.error('网络异常，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    query();
  }, []);

  // ⭐【新增】简单的 loading 兜底
  if (loading || !overview) {
    return <div className={Style.page}>数据加载中...</div>;
  }

  // ===================== 从 overview 解构出各块数据 =====================
  const { summary, trend7d, regionSummary, efficiencySummary, exceptionSummary } = overview;

  // ⭐【修改】顶部四个卡片改为用 summary（后端统计）组装
  const overviewCards = [
    {
      id: 1,
      title: '今日订单总量',
      value: `${summary.todayOrderCount.toLocaleString()} 单`,
      desc: `较昨日 ${summary.todayOrderCompare >= 0 ? '+' : ''}${summary.todayOrderCompare}%`,
    },
    {
      id: 2,
      title: '今日异常订单数',
      value: `${summary.todayAbnormalCount} 单`,
      desc: `异常占比约 ${summary.todayAbnormalRate}%`,
    },
    {
      id: 3,
      title: '平均配送时长',
      value: `${summary.avgDeliveryHours} 小时`,
      desc: `系统期望 ≤ ${summary.slaDeliveryHours} 小时`,
    },
    {
      id: 4,
      title: '整体准时率',
      value: `${summary.onTimeRate}%`,
      desc: `达标阈值 ≥ ${summary.onTimeTarget}%`,
    },
  ];

  // ===================== 近7天订单趋势折线图 =====================
  const lineOption = {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: 40,
      right: 24,
      top: 40,
      bottom: 40,
    },
    xAxis: {
      type: 'category' as const,
      data: trend7d.map((d) => d.date),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#dcdcdc' } },
    },
    yAxis: {
      type: 'value' as const,
      name: '订单量',
      axisLine: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
    },
    series: [
      {
        name: '订单量',
        type: 'line' as const,
        smooth: true,
        areaStyle: {
          opacity: 0.15,
        },
        data: trend7d.map((d) => d.orderCount),
      },
    ],
  };

  // ⭐【修改】异常占比平均值：用趋势中的 异常数/总数 计算，并避免除 0
  const abnormalRateAvg =
    trend7d.length > 0
      ? trend7d.reduce((sum, d) => {
          if (!d.orderCount) return sum;
          return sum + d.abnormalCount / d.orderCount;
        }, 0) / trend7d.length
      : 0;

  // ===================== 环形图：正常 vs 异常 =====================
  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c} 单（{d}%）',
    },
    legend: {
      bottom: -5,
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            name: '正常订单',
            value: 1 - abnormalRateAvg,
          },
          {
            name: '异常订单',
            value: abnormalRateAvg,
          },
        ],
      },
    ],
  };

  // ★ 保留：模块跳转逻辑
  const handleEnterModule = (key: ModuleKey) => {
    if (key === 'heatmap') {
      navigate('/visualization/Heatmap');
    } else if (key === 'timeliness') {
      navigate('/visualization/Timeliness');
    } else if (key === 'abnormal') {
      navigate('/visualization/Abnormal');
    }
  };

  // ⭐【新增】根据准时率给一个业务状态标签（前端仅展示逻辑）
  const isOnTarget = summary.onTimeRate >= summary.onTimeTarget;
  const statusText = isOnTarget ? '业务运行稳定' : '存在一定时效风险';
  const statusTheme: 'success' | 'warning' = isOnTarget ? 'success' : 'warning';

  return (
    <div className={Style.page}>
      {/* 顶部：四个核心指标卡片（数据来自 overviewCards） */}
      <div className={Style.summaryRow}>
        {overviewCards.map((card) => (
          <Card key={card.id} className={Style.summaryItem} bordered={false}>
            <div className={Style.summaryTitle}>{card.title}</div>
            <div className={Style.summaryValue}>{card.value}</div>
            <div className={Style.summaryDesc}>{card.desc}</div>
          </Card>
        ))}
      </div>

      {/* 中间：近7天订单趋势 + 当前指标快照 */}
      <div className={Style.middleRow}>
        <div className={Style.trendPanel}>
          <Card title='近7天订单趋势' bordered={false}>
            <ReactECharts option={lineOption} style={{ height: 260 }} />
          </Card>
        </div>

        <div className={Style.snapshotPanel}>
          <Card title='当前指标快照' bordered={false}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                height: 260,
              }}
            >
              {/* 上半部分：环形图 + 标签 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <ReactECharts option={pieOption} style={{ height: 180 }} />
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div>
                    近7天平均异常占比：
                    <Tag theme='warning' variant='light-outline' size='small'>
                      {(abnormalRateAvg * 100).toFixed(2)}%
                    </Tag>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    订单整体状况：
                    <Tag theme={statusTheme} variant='light-outline' size='small'>
                      {statusText}
                    </Tag>
                  </div>
                </div>
              </div>

              {/* 下半部分：文字快照（改用接口返回的摘要） */}
              <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
                <div>
                  高密度区域：{regionSummary.topRegions.join(' / ')} 等区域订单占比约 {regionSummary.topRegionsRate}
                  %。
                </div>
                <div>
                  配送时效：近7天平均配送时长约 {efficiencySummary.avgDeliveryHours7d} 小时，整体准时率约{' '}
                  {efficiencySummary.onTimeRate7d}
                  %。
                </div>
                <div>
                  异常监控：当前异常订单 {exceptionSummary.todayAbnormalCount} 单，其中高危异常{' '}
                  {exceptionSummary.todaySevereCount} 单。
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 底部：三个模块入口卡片（保持原有逻辑，只是 onClick 里调用 handleEnterModule） */}
      <div className={Style.moduleRow}>
        {moduleSnapshots.map((m) => (
          <Card key={m.key} className={Style.moduleCard} bordered={false}>
            <div>
              <div className={Style.moduleTitle}>{m.title}</div>
              <div className={Style.moduleDesc}>{m.desc}</div>
              <div className={Style.modulePrimary}>{m.primaryMetric}</div>
              <div className={Style.moduleSecondary}>{m.secondary}</div>
            </div>
            <div className={Style.moduleFooter}>
              <Button
                theme='primary'
                variant='outline'
                size='small'
                // ★ 修改：点击时把 key 传入 handleEnterModule
                onClick={() => handleEnterModule(m.key as ModuleKey)}
              >
                进入模块
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default memo(OverviewPage);
