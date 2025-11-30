// src/pages/Visualization/Heatmap/index.tsx
import React, { memo, useEffect, useRef, useState, useMemo } from 'react';
import { Card, Select, Table, Tag, MessagePlugin } from 'tdesign-react';
import Style from './index.module.less';
import { TIME_RANGE_OPTIONS, REGION_OPTIONS, STATUS_OPTIONS, type CityStat, type OrderHeatPoint } from './consts';

declare const AMap: any;

const { Option } = Select;

/**
 * 把热力点数据设置到 AMap.HeatMap 上
 */
function updateHeatmap(heatmap: any, points: OrderHeatPoint[]) {
  if (!points.length) {
    heatmap.setDataSet({ data: [], max: 0 });
    return;
  }

  const max = Math.max(...points.map((p) => p.count));

  heatmap.setDataSet({
    data: points.map((p) => ({
      lng: p.lng,
      lat: p.lat,
      count: p.count,
    })),
    max: max || 100,
  });

  if (typeof heatmap.show === 'function') {
    heatmap.show();
  }
}

/**
 * 根据热力点汇总得到城市统计数据，并按订单量降序排列
 */
function buildCityStats(points: OrderHeatPoint[]): CityStat[] {
  const map = new Map<string, number>();

  points.forEach((p) => {
    const prev = map.get(p.city) || 0;
    map.set(p.city, prev + p.count);
  });

  const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0) || 1;

  const list: CityStat[] = Array.from(map.entries()).map(([city, orderCount]) => ({
    city,
    orderCount,
    percent: orderCount / total,
  }));

  list.sort((a, b) => b.orderCount - a.orderCount);

  return list;
}

/**
 * 根据城市统计数据，在地图上放置城市级 marker，并绑定 hover 提示
 */
function updateCityMarkers(
  map: any,
  points: OrderHeatPoint[],
  stats: CityStat[],
  infoWindow: any,
  markersRef: React.MutableRefObject<any[]>,
) {
  if (markersRef.current.length) {
    map.remove(markersRef.current);
    markersRef.current = [];
  }

  stats.forEach((cityStat) => {
    const cityPoints = points.filter((p) => p.city === cityStat.city);
    if (!cityPoints.length) return;

    const { lng, lat } = cityPoints[0];

    const marker = new AMap.Marker({
      position: [lng, lat],
      content: '<div style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0);"></div>',
    });

    marker.on('mouseover', () => {
      const html = `
        <div style="font-size:12px;">
          <div><strong>${cityStat.city}</strong></div>
          <div>订单量：${cityStat.orderCount}</div>
          <div>占比：${(cityStat.percent * 100).toFixed(1)}%</div>
        </div>
      `;
      infoWindow.setContent(html);
      infoWindow.open(map, marker.getPosition());
    });

    marker.on('mouseout', () => {
      infoWindow.close();
    });

    map.add(marker);
    markersRef.current.push(marker);
  });
}

const HeatmapPage: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const heatmapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any | null>(null);
  const cityMarkersRef = useRef<any[]>([]);

  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [allPoints, setAllPoints] = useState<OrderHeatPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [heatmapReady, setHeatmapReady] = useState(false);

  // ⭐ 页面挂载时，请求后端 /api/dashboard/region-heatmap
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 目前先不带筛选条件，全部在前端过滤
        const resp = await fetch('/api/dashboard/region-heatmap');

        // ⭐【新增】简单的 HTTP 状态校验，避免 500 之类直接 json() 报错
        if (!resp.ok) {
          throw new Error(`HTTP error: ${resp.status}`);
        }

        const json = await resp.json();

        if (json.code === 0 && json.data) {
          const points = (json.data.points || []) as OrderHeatPoint[];
          setAllPoints(points);
        } else {
          MessagePlugin.error(json.message || '获取区域订单热力图数据失败');
        }
      } catch (err) {
        console.error(err);
        MessagePlugin.error('网络异常，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 根据筛选条件过滤热力点
  const filteredPoints: OrderHeatPoint[] = useMemo(
    () =>
      allPoints.filter((p) => {
        const regionOk =
          selectedRegion === 'all' ||
          (selectedRegion === 'east' && p.region === '华东') ||
          (selectedRegion === 'shanghai' && p.city === '上海市');

        const statusOk = selectedStatus === 'all' || p.status === selectedStatus;

        // 时间范围目前暂不在 DB 里做过滤，这里也先不过滤
        return regionOk && statusOk;
      }),
    [allPoints, selectedRegion, selectedStatus],
  );

  const cityStats: CityStat[] = useMemo(() => buildCityStats(filteredPoints), [filteredPoints]);

  const totalOrders = useMemo(() => cityStats.reduce((sum, item) => sum + item.orderCount, 0), [cityStats]);

  const topCity = cityStats[0]?.city ?? '';

  // ====================== 初始化地图与热力图（只执行一次） ======================
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=890f86e3886f8a00e418ad5682a1e668&plugin=AMap.HeatMap';
    script.async = true;

    script.onload = () => {
      if (!mapRef.current) return;

      const map = new AMap.Map(mapRef.current, {
        zoom: 5,
        center: [105.0, 35.0],
        viewMode: '2D',
      });
      mapInstanceRef.current = map;

      AMap.plugin(['AMap.HeatMap'], () => {
        const heatmap = new AMap.HeatMap(map, {
          radius: 45,
          opacity: [0, 0.9],
          gradient: {
            0.2: 'rgba(0, 120, 255, 1)',
            0.4: 'rgba(0, 200, 180, 1)',
            0.6: 'rgba(250, 210, 0, 1)',
            0.8: 'rgba(255, 140, 0, 1)',
            1.0: 'rgba(255, 60, 0, 1)',
          },
        });

        heatmapRef.current = heatmap;

        const infoWindow = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -20),
        });
        infoWindowRef.current = infoWindow;

        setHeatmapReady(true);
      });
    };

    document.body.appendChild(script);
  }, []);

  // ====================== 数据 / 条件变化时刷新热力层 + markers ======================
  useEffect(() => {
    if (!heatmapReady) return;

    if (heatmapRef.current) {
      updateHeatmap(heatmapRef.current, filteredPoints);
    }

    if (mapInstanceRef.current && infoWindowRef.current) {
      updateCityMarkers(mapInstanceRef.current, filteredPoints, cityStats, infoWindowRef.current, cityMarkersRef);
    }
  }, [filteredPoints, cityStats, heatmapReady]);

  // ⭐【小修改】这里类型用 any，避免 tdesign 的 TS 类型报错
  const handleRowClick = ({ row }: any) => {
    const cityPoint = allPoints.find((p) => p.city === row.city);
    if (cityPoint && mapInstanceRef.current) {
      mapInstanceRef.current.setZoomAndCenter(8, [cityPoint.lng, cityPoint.lat]);
    }
  };

  const columns: {
    colKey: string;
    title: string;
    align?: 'left' | 'right' | 'center';
    cell?: (slot: { row: CityStat }) => React.ReactNode;
  }[] = [
    { colKey: 'city', title: '城市', align: 'left' },
    { colKey: 'orderCount', title: '订单量', align: 'right' },
    {
      colKey: 'percent',
      title: '占比',
      align: 'right',
      cell: ({ row: { percent } }) => `${(percent * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className={Style.page}>
      {/* 筛选区 */}
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

        <span className={Style.filterLabel}>订单状态</span>
        <Select style={{ width: 140 }} value={selectedStatus} onChange={(value) => setSelectedStatus(value as string)}>
          {STATUS_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>

        <span className={Style.filterLabel}>区域</span>
        <Select style={{ width: 140 }} value={selectedRegion} onChange={(value) => setSelectedRegion(value as string)}>
          {REGION_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Select>
      </div>

      {/* 主体内容：左地图 + 右侧统计 */}
      <div className={Style.contentRow}>
        {/* 左侧地图热力图 */}
        <Card title='区域订单密度热力图' className={Style.mapCard} bordered={false}>
          {loading && <div style={{ paddingBottom: 8, fontSize: 12 }}>数据加载中...</div>}

          <div ref={mapRef} className={Style.mapContainer} />

          {/* 地图右下角图例 */}
          <div className={Style.legend}>
            <div className={Style.legendTitle}>订单密度</div>
            <div className={Style.legendBar}>
              <span className={Style.legendLabel}>低</span>
              <div className={Style.legendGradient} />
              <span className={Style.legendLabel}>高</span>
            </div>
          </div>
        </Card>

        {/* 右侧统计面板 */}
        <div className={Style.sidePanel}>
          <Card title='区域订单概览' bordered={false}>
            {/* ⭐【修改】这里原来用 <p> 包着，Tag 内部可能是 div，会触发 validateDOMNesting 警告 */}
            <div className={Style.summaryItem}>
              <span>当前筛选区域估算订单量：</span>
              <Tag theme='success' variant='light-outline'>
                {totalOrders}
              </Tag>
            </div>
            <div className={Style.summaryItem}>
              <span>涉及城市数：</span>
              <Tag theme='default' variant='light-outline'>
                {cityStats.length}
              </Tag>
            </div>
            <div className={Style.summaryItem}>
              <span>主要集中城市：</span>
              <span>{topCity ? `${topCity} 等` : '暂无数据'}</span>
            </div>
          </Card>

          <Card title='城市订单量排行' bordered={false}>
            <Table
              className={Style.cityRankTable}
              columns={columns}
              data={cityStats}
              size='small'
              hover
              rowKey='city'
              onRowClick={handleRowClick}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default memo(HeatmapPage);
