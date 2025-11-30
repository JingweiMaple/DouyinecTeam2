// src/pages/Logistics/Track/index.tsx

// 【修改】引入 useState、useSearchParams、MessagePlugin
import React, { memo, useEffect, useRef, useState } from 'react';
import { Steps, Card, MessagePlugin } from 'tdesign-react';
import classnames from 'classnames';
import { useSearchParams } from 'react-router-dom';
import Style from './index.module.less';
// 【新增】引入后端轨迹接口
import { fetchTrackDetail } from '../../../services/logistics';

const { StepItem } = Steps;

declare const AMap: any;

// ======================== 【新增】类型定义 ========================
// 对应后端 /api/tracking 返回的 data 结构（我们在 server/index.js 里写的那个 trackingDetailsMock）
interface TrackDetail {
  trackingNo: string;
  currentStatus: string;
  estimatedDelivery?: string;
  map: {
    origin: { lng: number; lat: number; name: string } | null;
    destination: { lng: number; lat: number; name: string } | null;
    currentLocation: { lng: number; lat: number; name: string; time: string; status: string } | null;
    path: { lng: number; lat: number }[];
  };
  timeline: { time: string; status: string; desc: string }[];
  orderInfo: {
    orderName: string;
    trackingNo: string;
    company: string;
    currentStatusText: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    senderName: string;
    senderAddress: string;
    price: number;
    orderTime: string;
  };
}

// 【新增】订单信息卡片项类型
type InfoItemType = 'status' | 'link';
interface InfoItem {
  id: number;
  name: string;
  value: string;
  type?: InfoItemType;
}

const Track: React.FC = () => {
  // 【新增】从 URL 拿 trackingNo，例如 /logistics/track?trackingNo=SF2024...
  const [searchParams] = useSearchParams();
  const trackingNo = searchParams.get('trackingNo');

  // 【新增】保存接口返回的轨迹详情 + loading
  const [detail, setDetail] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // 地图容器 ref（保留）
  const mapRef = useRef<HTMLDivElement | null>(null);

  // ==================== 1. 调后端获取轨迹详情（替代原本写死的 consts） ====================
  useEffect(() => {
    if (!trackingNo) return;

    const query = async () => {
      setLoading(true);
      try {
        // ⭐ 1. 直接当成 body 用，不再多 .data 一层
        const res: any = await fetchTrackDetail(trackingNo);

        // ⭐ 2. 这里的结构就是 { code, data, message }
        if (res.code === 0) {
          setDetail(res.data);
        } else {
          MessagePlugin.error(res.message || '轨迹查询失败');
        }
      } catch (e) {
        console.error(e);
        MessagePlugin.error('网络异常，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    query();
  }, [trackingNo]);

  // ==================== 2. 初始化地图（使用接口返回的坐标） ====================
  useEffect(() => {
    // 还没拿到 detail 或还没有 DOM 容器时不用初始化
    if (!detail || !mapRef.current) return;

    const { map: mapData } = detail;

    // 路径：优先用后端给的 path，如果为空就用起点/终点凑一条线
    const rawPath: { lng: number; lat: number }[] = mapData.path.length
      ? mapData.path
      : ([mapData.origin, mapData.destination].filter(Boolean) as {
          lng: number;
          lat: number;
        }[]);

    if (!rawPath.length) return;

    const initMap = () => {
      if (!mapRef.current) return;

      const centerPoint = mapData.currentLocation || mapData.destination || mapData.origin || rawPath[0];

      // 创建地图
      const map = new AMap.Map(mapRef.current, {
        zoom: 6,
        center: [centerPoint.lng, centerPoint.lat],
      });

      // 把路径转换为 AMap LngLat
      const path = rawPath.map((p) => new AMap.LngLat(p.lng, p.lat));

      // 轨迹线
      const polyline = new AMap.Polyline({
        path,
        strokeColor: '#ff7e00',
        strokeWeight: 4,
        showDir: true,
      });
      map.add(polyline);

      // 起点：发
      if (mapData.origin) {
        const startMarker = new AMap.Marker({
          position: new AMap.LngLat(mapData.origin.lng, mapData.origin.lat),
          label: {
            content: '发',
            direction: 'top',
          },
        });
        map.add(startMarker);
      }

      // 终点：收
      if (mapData.destination) {
        const endMarker = new AMap.Marker({
          position: new AMap.LngLat(mapData.destination.lng, mapData.destination.lat),
          label: {
            content: '收',
            direction: 'top',
          },
        });
        map.add(endMarker);
      }

      // 实时位置：小车
      if (mapData.currentLocation) {
        const truckMarker = new AMap.Marker({
          position: new AMap.LngLat(mapData.currentLocation.lng, mapData.currentLocation.lat),
          title: '包裹当前位置',
          content: '<div class="truck-marker">🚚</div>',
          offset: new AMap.Pixel(-10, -20),
        });
        map.add(truckMarker);
        map.setFitView([polyline, truckMarker]);
      } else {
        map.setFitView([polyline]);
      }
    };

    // 如果 AMap 已经存在，直接初始化；否则先加载脚本
    if (typeof AMap !== 'undefined') {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=890f86e3886f8a00e418ad5682a1e668';
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    }
  }, [detail]);

  // ==================== 3. 简单的参数 / loading 兜底 ====================
  if (!trackingNo) {
    return <div className={Style.mapCard}>缺少快递单号参数</div>;
  }

  if (loading || !detail) {
    return <div className={Style.mapCard}>加载中...</div>;
  }

  // ==================== 4. 根据接口数据生成“订单信息” & 当前步骤 ====================
  const infoList: InfoItem[] = [
    {
      id: 1,
      name: '快递单号',
      value: detail.orderInfo.trackingNo,
    },
    {
      id: 2,
      name: '当前状态',
      value: detail.orderInfo.currentStatusText,
      type: 'status',
    },
    {
      id: 3,
      name: '收货地址',
      value: detail.orderInfo.receiverAddress,
    },
    {
      id: 4,
      name: '收货人',
      value: `${detail.orderInfo.receiverName}（${detail.orderInfo.receiverPhone}）`,
    },
    {
      id: 5,
      name: '发货方',
      value: `${detail.orderInfo.senderName}｜${detail.orderInfo.senderAddress}`,
    },
    {
      id: 6,
      name: '下单时间',
      value: detail.orderInfo.orderTime,
    },
    {
      id: 7,
      name: '商品金额',
      value: `¥${detail.orderInfo.price.toLocaleString()}`,
    },
    {
      id: 8,
      name: '承运公司',
      value: detail.orderInfo.company,
    },
  ];

  // 当前步骤，用 currentStatus 在 timeline 中找一下
  const currentStepIndex = detail.timeline.findIndex((t) => t.status === detail.currentStatus) || 0;

  // ==================== 5. 渲染 ====================
  return (
    <div>
      <Card title='地图实时追踪' className={Style.mapCard} bordered={false}>
        {/* 地图区域：占位 div 上挂 ref（保留） */}
        <div ref={mapRef} className={Style.mapContainer} />
        {/* 底部两行：当前位置 + 预计送达时间（改用接口数据） */}
        <div className={Style.mapFooter}>
          <div>
            <span className={Style.mapFooterLabel}>包裹当前位置：</span>
            <span>{detail.map.currentLocation?.name || '暂无位置信息'}</span>
          </div>
          <div className={Style.mapFooterEta}>
            <span className={Style.mapFooterLabel}>预计送达时间：</span>
            <span>{detail.estimatedDelivery || '预计时间待更新'}</span>
          </div>
        </div>
      </Card>

      <Card title='时间轴' className={Style.logBox} bordered={false}>
        <div>
          <Steps layout='vertical' theme='dot' current={currentStepIndex}>
            {/* 用接口返回的 timeline 替换原来的 dataStep */}
            {detail.timeline.map((item, index) => (
              <StepItem key={index} title={item.status} content={`${item.time} ${item.desc}`} />
            ))}
          </Steps>
        </div>
      </Card>

      <Card title='订单信息' bordered={false}>
        <div className={classnames(Style.infoBox)}>
          {/* 用 infoList 替换原来的 dataInfo */}
          {infoList.map((item) => (
            <div key={item.id} className={classnames(Style.infoBoxItem)}>
              <h1>{item.name}</h1>
              <span
                className={classnames({
                  [Style.inProgress]: item.type === 'status',
                  [Style.pdf]: item.type === 'link',
                })}
              >
                {item.type === 'status' && <i />}
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default memo(Track);
