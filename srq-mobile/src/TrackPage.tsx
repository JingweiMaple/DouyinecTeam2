/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// src/TrackPage.tsx
import React, { useEffect, useRef, useState } from "react";
import "./TrackPage.css";
import { loadAMap } from "./loadAMap";

const API_BASE = "http://localhost:3001";

interface TrackPageProps {
  trackingNo: string;
  onBack: () => void;
}

// 接口返回的订单结构（注意多了 eta_time）
interface Order {
  id: number;
  shop_name: string;
  channel: string;
  order_title: string;
  order_no: string;
  tracking_no: string;
  price_cents: number;
  quantity: number;
  remark: string | null;
  advantage_tags: string | null;
  status: string;
  sender_city: string | null;
  receiver_city: string | null;
  receiver_address: string | null;
  eta_time: string | null;
  express_name?: string | null;
}

interface RoutePoint {
  id: number;
  order_id: number;
  seq: number;
  lng: number;
  lat: number;
  city: string | null;
  status: string | null;
  description: string | null;
  time: string | null;
}

interface Realtime {
  order_id: number;
  lng: number;
  lat: number;
  status: string | null;
  eta_time: string | null;
  updated_at: string;
}

const TrackPage: React.FC<TrackPageProps> = ({ trackingNo, onBack }) => {
  // 地图高度折叠
  const MIN_HEIGHT = 220;
  const MAX_HEIGHT = 420;
  const THRESHOLD = 260;

  const [mapHeight, setMapHeight] = useState<number>(MAX_HEIGHT);

  // 后端数据
  const [order, setOrder] = useState<Order | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 时间轴
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showAllTimeline, setShowAllTimeline] = useState<boolean>(false);

  // 地图实例、小车
  const mapRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const clamped = Math.max(0, Math.min(scrollTop, THRESHOLD));
    const ratio = clamped / THRESHOLD;
    const nextHeight = MAX_HEIGHT - (MAX_HEIGHT - MIN_HEIGHT) * ratio;
    setMapHeight(nextHeight);
  };

  // 时间格式化：MM-DD HH:mm
  const formatTime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}-${day} ${h}:${min}`;
  };

  // 预计送达格式：MM月DD日
  const formatEtaDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}月${day}日`;
  };

  const formatPrice = (cents?: number) => {
    if (cents == null) return "";
    return (cents / 100).toFixed(2);
  };

  // 调试：重置小车
  const handleResetCar = async () => {
    try {
      await fetch(`${API_BASE}/api/debug/resetRealtime/${trackingNo}`, {
        method: "POST",
      });
      window.location.reload();
    } catch (e) {
      console.error("重置小车失败", e);
      alert("重置小车失败，请看控制台日志");
    }
  };

  // ① 请求轨迹 + 订单 + 实时
  useEffect(() => {
    if (!trackingNo) return;

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/tracking/${trackingNo}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "请求失败");
        }
        return res.json();
      })
      .then((data) => {
        setOrder(data.order);
        setRoute(data.route || []);
        setRealtime(data.realtime || null);
      })
      .catch((err) => {
        console.error("加载轨迹失败", err);
        setError("加载轨迹失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [trackingNo]);

  // ② 根据 realtime 找当前节点
  useEffect(() => {
    if (!route.length) {
      setActiveIndex(-1);
      return;
    }

    if (realtime) {
      const { lng: curLng, lat: curLat } = realtime;
      let bestIdx = 0;
      let bestDist = Infinity;

      route.forEach((p, idx) => {
        const dx = p.lng - curLng;
        const dy = p.lat - curLat;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = idx;
        }
      });

      setActiveIndex(bestIdx);
    } else {
      setActiveIndex(route.length - 1);
    }
  }, [route, realtime]);

  // ③ 时间轴数据
  const routeAsc = route;
  const safeActiveIndex =
    activeIndex >= 0 && activeIndex < routeAsc.length
      ? activeIndex
      : routeAsc.length - 1;

  const activeRoute =
    safeActiveIndex >= 0 && routeAsc.length
      ? routeAsc[safeActiveIndex]
      : routeAsc.length
      ? routeAsc[routeAsc.length - 1]
      : null;

  const pastRouteAsc =
    safeActiveIndex >= 0 && routeAsc.length
      ? routeAsc.slice(0, safeActiveIndex + 1)
      : [];

  const timelineAll = pastRouteAsc.slice().reverse();

  const timelineVisible = showAllTimeline
    ? timelineAll
    : activeRoute
    ? [activeRoute]
    : [];

  const lastRoute = routeAsc.length ? routeAsc[routeAsc.length - 1] : null;

  // ④ 画地图（只依赖 trackingNo + route + order，避免因 realtime 重建导致闪烁）
  useEffect(() => {
    if (!route.length) {
      return;
    }

    let mapInstance: any;

    loadAMap()
      .then((AMapLib) => {
        const AMapGlobal = (window as any).AMap || AMapLib;

        const path = route.map((p) => [p.lng, p.lat]) as [number, number][];

        const origin = path[0];
        const dest = path[path.length - 1];

        const senderCity =
          (route[0] && route[0].city) || order?.sender_city || "发件地";

        const receiverCity =
          (route[route.length - 1] && route[route.length - 1].city) ||
          order?.receiver_city ||
          "收件地";

        // 小车初始位置：用实时位置（如果有）否则终点
        const carStartPos: [number, number] =
          realtime && realtime.lng != null && realtime.lat != null
            ? [realtime.lng, realtime.lat]
            : dest;

        mapInstance = new AMapGlobal.Map("track-map-inner", {
          zoom: 6,
          center: dest,
          viewMode: "3D",
        });
        mapRef.current = mapInstance;

        // 发件气泡
        new AMapGlobal.Marker({
          position: origin,
          map: mapInstance,
          title: senderCity,
          content: `
            <div style="
              display: inline-flex;
              align-items: center;
              padding: 4px 10px;
              background: #ffffff;
              border-radius: 6px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.08);
              font-size: 12px;
              color: #333;
              border: none;
              transform: translate(-50%, -100%);
              white-space: nowrap;
            ">
              <span style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 4px;
                background: rgba(255,106,0,0.14);
                color: #ff6a00;
                font-size: 12px;
                font-weight: 500;
                margin-right: 6px;
              ">发</span>
              <span>${senderCity}</span>
            </div>
          `,
          offset: new AMapGlobal.Pixel(0, -10),
          zIndex: 110,
        });

        // 收件气泡
        new AMapGlobal.Marker({
          position: dest,
          map: mapInstance,
          title: receiverCity,
          content: `
            <div style="
              display: inline-flex;
              align-items: center;
              padding: 4px 10px;
              background: #ffffff;
              border-radius: 6px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.08);
              font-size: 12px;
              color: #333;
              border: none;
              transform: translate(-50%, -100%);
              white-space: nowrap;
            ">
              <span style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 4px;
                background: rgba(255,106,0,0.14);
                color: #ff6a00;
                font-size: 12px;
                font-weight: 500;
                margin-right: 6px;
              ">收</span>
              <span>${receiverCity}</span>
            </div>
          `,
          offset: new AMapGlobal.Pixel(0, -10),
          zIndex: 110,
        });

        // 轨迹折线
        const polyline = new AMapGlobal.Polyline({
          path,
          map: mapInstance,
          strokeColor: "#ff6a00",
          strokeWeight: 5,
          showDir: true,
        });

        // 小车
        const carMarker = new AMapGlobal.Marker({
          position: carStartPos,
          map: mapInstance,
          title: "快递实时位置",
          content: `
            <div style="
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26px;
              transform: translate(-50%, -50%);
            ">
              🚚
            </div>
          `,
          offset: new AMapGlobal.Pixel(0, 0),
          zIndex: 120,
        });
        carMarkerRef.current = carMarker;

        mapInstance.setFitView([polyline]);
      })
      .catch((err) => {
        console.error("AMap 初始化失败：", err);
      });

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
      }
      mapRef.current = null;
      carMarkerRef.current = null;
    };
    // 注意：这里故意不依赖 realtime，避免 WebSocket 更新时反复重建地图导致闪烁
  }, [route, trackingNo, order]);

  // ⑤ WebSocket：更新小车位置 + realtime 状态
  useEffect(() => {
    if (!trackingNo) return;
    if (typeof WebSocket === "undefined") {
      console.warn("当前环境不支持 WebSocket");
      return;
    }

    const ws = new WebSocket("ws://localhost:3001");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          trackingNo,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (
          msg.type === "realtime" &&
          msg.trackingNo === trackingNo &&
          msg.realtime
        ) {
          const realtimeData = msg.realtime as Realtime;
          setRealtime(realtimeData); // 时间轴 / 气泡用

          const { lng, lat } = realtimeData;
          if (carMarkerRef.current && lng != null && lat != null) {
            carMarkerRef.current.setPosition([lng, lat]); // 只移动小车，不重建地图
          }
        }
      } catch (e) {
        console.error("解析 ws 消息失败", e);
      }
    };

    ws.onerror = (e) => {
      console.warn("WebSocket error:", e);
    };

    return () => {
      ws.close();
    };
  }, [trackingNo]);

  const orderTags =
    order?.advantage_tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];

  const etaForBadge = realtime?.eta_time || order?.eta_time || null;

  return (
    <div className="track-page" onScroll={handleScroll}>
      {/* 顶部地图区域 */}
      <div className="track-map" style={{ height: mapHeight }}>
        <div id="track-map-inner" className="track-map-inner" />

        {/* 地图上的 toolbar */}
        <div className="track-map-toolbar">
          <span className="track-icon-back" onClick={onBack}>
            ‹
          </span>

          <div className="track-map-toolbar-right">
            <div className="track-map-pill">
              🎧 <span>客服</span>
            </div>
            <div className="track-map-pill">
              📦 <span>包裹</span>
            </div>
            <div className="track-map-pill track-map-pill-more">⋯</div>
          </div>
        </div>

        {/* 右下角橙色气泡：状态 + 位置 + ETA */}
        <div className="track-map-badge">
          <div className="track-map-badge-title">
            {activeRoute?.status || lastRoute?.status || "物流更新中"}
          </div>
          <div className="track-map-badge-sub">
            {(activeRoute?.city || lastRoute?.city || "当前位置") +
              (activeRoute?.description || lastRoute?.description
                ? " 附近"
                : "")}
          </div>
          {etaForBadge && (
            <div className="track-map-badge-eta">
              预计送达时间：{formatEtaDate(etaForBadge)}
            </div>
          )}
        </div>

        {/* 底部小驿站 */}
        <div className="track-map-station">
          <div className="track-map-station-icon" />
        </div>
      </div>

      {/* 下面主体区域 */}
      <div className="track-main">
        {/* 快递公司 + 运单号 */}
        <section className="track-express-row">
          <div className="track-express-left">
            <span className="track-express-logo">
              {order?.express_name?.[0] || "韵"}
            </span>
            <div className="track-express-text">
              <div className="track-express-name">
                {order?.express_name || "韵达快递"}
              </div>
              <div className="track-express-no">
                {order?.tracking_no || trackingNo}
              </div>
            </div>
          </div>
          <div className="track-express-actions">
            <button className="track-link-btn">复制</button>
            <button className="track-link-btn">打电话</button>
          </div>
        </section>

        {/* 时间轴 */}
        <section className="track-timeline-card">
          {timelineVisible.map((p) => {
            const isActive = p.id === activeRoute?.id;
            return (
              <div
                key={p.id}
                className={
                  "track-timeline-item" +
                  (isActive ? " track-timeline-item--active" : "")
                }
              >
                <div className="track-timeline-icon">
                  <span className="track-timeline-line" />
                  <span className="track-timeline-dot" />
                </div>
                <div className="track-timeline-content">
                  <div className="track-timeline-title">
                    <span className="track-status">{p.status || "运输中"}</span>
                    <span className="track-time">{formatTime(p.time)}</span>
                  </div>
                  <div className="track-timeline-desc">
                    {p.description || "包裹正在运输途中，物流信息将持续更新。"}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* 展开 / 收起更多物流明细 */}
        {timelineAll.length > 1 && (
          <section className="track-more-logistics">
            <div className="track-more-dot" />
            <button
              className="track-more-btn"
              onClick={() => setShowAllTimeline((v) => !v)}
            >
              {showAllTimeline ? "收起更多物流明细" : "查看更多物流明细"}{" "}
              <span>{showAllTimeline ? "▴" : "▾"}</span>
            </button>
          </section>
        )}

        {/* 调试按钮 */}
        <section className="track-dev-tools">
          <button className="track-dev-btn" onClick={handleResetCar}>
            重置小车位置（调试）
          </button>
        </section>

        {/* 收货地址 */}
        <section className="track-address-card">
          <div className="track-address-header">
            <span className="track-address-icon">📍</span>
            <span className="track-address-title">
              送至 {order?.receiver_city || "收货地址"}
            </span>
          </div>
          <div className="track-address-sub">
            宋瑞琪 86-182****5336
            <span className="track-address-tag">号码保护中</span>
          </div>
        </section>

        {/* 订单信息卡片 */}
        <section className="track-order-card">
          <div className="track-order-shop-row">
            <div>
              <span className="track-order-shop-tag">
                {order?.channel === "tmall" ? "天猫" : "淘宝"}
              </span>
              <span className="track-order-shop-name">
                {order?.shop_name || "店铺名称"}
              </span>
            </div>
            <div className="track-order-status">
              {order?.status === "to_pickup"
                ? "待取件"
                : order?.status === "delivering"
                ? "派送中"
                : order?.status === "pending"
                ? "待付款"
                : "交易成功"}
            </div>
          </div>

          <div className="track-order-product">
            <div className="track-order-thumb" />
            <div className="track-order-info">
              <div className="track-order-title">
                {order?.order_title || "商品标题"}
              </div>
              <div className="track-order-sub">
                {order?.remark ||
                  "商品备注信息将在此处显示，例如规格、容量等。"}
              </div>
              {orderTags.length > 0 && (
                <div className="track-order-tags">
                  {orderTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="track-order-price">
              ￥{formatPrice(order?.price_cents)}
              <div className="track-order-count">×{order?.quantity ?? 1}</div>
            </div>
          </div>
        </section>

        {loading && (
          <div style={{ padding: 16, textAlign: "center" }}>加载中…</div>
        )}
        {error && (
          <div style={{ padding: 16, textAlign: "center", color: "red" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackPage;
