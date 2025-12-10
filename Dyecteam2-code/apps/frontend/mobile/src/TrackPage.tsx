/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
// src/TrackPage.tsx
import React, { useEffect, useRef, useState } from "react"; //usestate存状态；useeffect处理副作用;useref创建可变引用
import "./TrackPage.css";
import { loadAMap } from "./loadAMap";
import progressTruckIcon from "./assets/progress-truck.png";
import mapTruckIcon from "./assets/map-truck.png";

const API_BASE = "http://localhost:3002";
//取件码状态传给父组件app
interface TrackPageProps {
  trackingNo: string;
  onBack: () => void;
  onPickupVisibilityChange?: (
    trackingNo: string,
    visible: boolean,
    code?: string | null
  ) => void;
}

// 接口返回的订单结构
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

  receiver_name: string | null;
  receiver_phone: string | null;

  eta_time: string | null;
  express_name?: string | null;

  receiver_province?: string | null;
  sender_province?: string | null;
  receiver_lng?: number | null;
  receiver_lat?: number | null;

  exception_reason?: string | null;
}
//接口返回的路径点结构
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

  pickup_code?: string | null;
  pickup_station?: string | null;
}
//接口返回的实时位置结构
interface Realtime {
  order_id: number;
  lng: number;
  lat: number;
  status: string | null;
  eta_time: string | null;
  updated_at: string;
}
//接口返回的取件信息结构
interface PickupInfo {
  seq: number;
  code: string;
  station: string | null;
}
//接口返回的达人结构
interface Influencer {
  id: number;
  influencer_name: string;
  buyers_count: number;
}

// ===== 本地商品图片（public/order-images） =====
const LOCAL_IMG_BASE = "/order-images";
const FALLBACK_IMG = `${LOCAL_IMG_BASE}/default.png`;

// 只用 public 下的本地图片：根据订单 id 生成图片路径
const getOrderImage = (order: Order): string => {
  return `${LOCAL_IMG_BASE}/${order.id}.png`;
};

// 图片加载失败时使用兜底图
const handleImgError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>
): void => {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_IMG) {
    target.src = FALLBACK_IMG;
  }
};

// Haversine 计算两点距离（米）
function calcDistanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6378137;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 把一个点 (lng,lat) 吸附到给定 polyline 上的最近点
function snapToPath(
  point: [number, number],
  path: [number, number][]
): [number, number] {
  if (!path || path.length < 2) return point;
  const [px, py] = point;

  let bestX = px;
  let bestY = py;
  let bestDist2 = Number.POSITIVE_INFINITY;

  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];

    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy;
    if (len2 === 0) continue;

    const t = ((px - x1) * vx + (py - y1) * vy) / len2;
    const tt = Math.max(0, Math.min(1, t));
    const cx = x1 + vx * tt;
    const cy = y1 + vy * tt;

    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestX = cx;
      bestY = cy;
    }
  }

  return [bestX, bestY];
}

// 找到点在 polyline 上最近的索引，方便进度条更新
function findNearestIndexOnPath(
  point: [number, number],
  path: [number, number][]
): number {
  if (!path || !path.length) return 0;
  const [px, py] = point;
  let bestIdx = 0;
  let bestDist2 = Number.POSITIVE_INFINITY;

  path.forEach(([x, y], idx) => {
    const dx = x - px;
    const dy = y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

// 城市名缩写
function shortCityName(name?: string | null): string {
  if (!name) return "";
  let n = name.trim();
  // 先处理特殊的“新区”
  if (n.includes("新区")) {
    return n.split("新区")[0]; // 返回“浦东”
  }
  const tailMatch = n.match(/([\u4e00-\u9fa5]{1,4})(市|区|县)$/);
  if (tailMatch) return tailMatch[1];

  const provIdx = n.indexOf("省");
  if (provIdx >= 0 && provIdx < n.length - 1) {
    n = n.slice(provIdx + 1);
    const t2 = n.match(/([\u4e00-\u9fa5]{1,4})(市|区|县)$/);
    if (t2) return t2[1];
  }

  return n;
}

const TrackPage: React.FC<TrackPageProps> = ({
  trackingNo,
  onBack,
  onPickupVisibilityChange,
}) => {
  // ========= 页面切换动画相关 =========
  const [entering, setEntering] = useState(true); // 刚进入时，从右滑入
  const [leaving, setLeaving] = useState(false); // 返回时，从右滑出

  // 进场动画：组件挂载时执行一次
  useEffect(() => {
    const timer = setTimeout(() => {
      setEntering(false);
    }, 260); // 和 CSS 动画时长保持一致
    return () => clearTimeout(timer);
  }, []);

  // 点击左上角“返回”时，先播退出动画，再真正 onBack()
  const handleBackClick = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      onBack();
    }, 220);
  };

  // 地图高度折叠：下滑时折叠，上滑时展开
  const MIN_HEIGHT = 220;
  const MAX_HEIGHT = 420;
  const THRESHOLD = 260;

  const [mapHeight, setMapHeight] = useState<number>(MAX_HEIGHT);

  // 后端数据
  const [order, setOrder] = useState<Order | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // MQ 对比结果（来自 WebSocket）
  const [wsLogisticsStatus, setWsLogisticsStatus] = useState<string | null>(
    null
  );
  const [wsExceptionReason, setWsExceptionReason] = useState<string | null>(
    null
  );
  const [mqStatus, setMqStatus] = useState<string | null>(null);
  const [expectedStatus, setExpectedStatus] = useState<string | null>(null);
  const [statusMatch, setStatusMatch] = useState<boolean | null>(null);

  // 取件码信息（来自 MQ / DB）
  const [pickupInfo, setPickupInfo] = useState<PickupInfo | null>(null);

  // 进度条：0~1
  const [progressRatio, setProgressRatio] = useState<number>(0);

  // 时间轴
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showAllTimeline, setShowAllTimeline] = useState<boolean>(false);

  // ========================地图相关========================
  // 地图实例、小车 & 小车气泡
  const mapRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);
  const carInfoMarkerRef = useRef<any>(null);

  // 路径数据：real = Driving 真实轨迹，base = 兜底路径
  const realPathRef = useRef<[number, number][]>([]);
  const basePathRef = useRef<[number, number][]>([]);

  // 线路 polyline：浅橙 = 全程，深橙 = 已走部分
  const fullPolylineRef = useRef<any>(null);
  const passedPolylineRef = useRef<any>(null);

  // 小车动画当前所在的路径索引 & 目标索引
  const currentIndexRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);

  // 距离 & 聚焦标记
  const [distanceToDest, setDistanceToDest] = useState<number | null>(null);
  const hasFocusedNearDestRef = useRef<boolean>(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const clamped = Math.max(0, Math.min(scrollTop, THRESHOLD));
    const ratio = clamped / THRESHOLD;
    const nextHeight = MAX_HEIGHT - (MAX_HEIGHT - MIN_HEIGHT) * ratio;
    setMapHeight(nextHeight);
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}-${day} ${h}:${min}`;
  };

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

  const formatDistance = (d: number | null) => {
    if (d == null) return "";
    if (d < 1000) return `${Math.round(d)} 米`;
    return `${(d / 1000).toFixed(1)} 公里`;
  };

  const maskPhone = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return phone;
    return digits.replace(/(\d{3})\d{4}(\d+)/, "$1****$2");
  };

  // 调试：重置小车位置
  const handleResetCar = async () => {
    try {
      await fetch(`${API_BASE}/api/debug/resetRealtime/${trackingNo}`, {
        method: "POST",
      });

      const pathForSnap =
        realPathRef.current.length > 1
          ? realPathRef.current
          : basePathRef.current;

      if (pathForSnap && pathForSnap.length) {
        const [sx, sy] = pathForSnap[0];

        currentIndexRef.current = 0;
        targetIndexRef.current = 0;

        if (carMarkerRef.current) {
          carMarkerRef.current.setPosition([sx, sy]);
        }
        if (passedPolylineRef.current) {
          passedPolylineRef.current.setPath([[sx, sy]]);
        }
      }

      const map = mapRef.current;
      const fullPolyline = fullPolylineRef.current;
      if (map && fullPolyline) {
        try {
          map.setFitView([fullPolyline]);
        } catch (e) {
          console.warn("setFitView error after reset:", e);
        }
      }

      setDistanceToDest(null);
      hasFocusedNearDestRef.current = false;
      if (carInfoMarkerRef.current) {
        carInfoMarkerRef.current.setMap(null);
        carInfoMarkerRef.current = null;
      }

      // 重置异常相关状态
      setWsLogisticsStatus(null);
      setWsExceptionReason(null);
      setMqStatus(null);
      setExpectedStatus(null);
      setStatusMatch(null);

      setPickupInfo(null);
      setProgressRatio(0);
    } catch (e) {
      console.error("重置小车失败", e);
      alert("重置小车失败，请看控制台日志");
    }
  };

  // 隐藏调试手势：连续三次点击快递行触发重置
  const debugTapCountRef = useRef<number>(0);
  const debugLastTapTimeRef = useRef<number>(0);

  const handleDebugTap = () => {
    const now = Date.now();
    if (now - debugLastTapTimeRef.current > 800) {
      debugTapCountRef.current = 0;
    }
    debugTapCountRef.current += 1;
    debugLastTapTimeRef.current = now;

    if (debugTapCountRef.current >= 3) {
      debugTapCountRef.current = 0;
      handleResetCar();
    }
  };

  const handleCopyPickupCode = async () => {
    if (!pickupInfo?.code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pickupInfo.code);
      } else {
        const input = document.createElement("input");
        input.value = pickupInfo.code;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
    } catch (e) {
      console.error("复制取件码失败", e);
      alert("复制失败，请手动记一下取件码");
    }
  };

  // ① 请求轨迹 + 订单 + 实时 + 达人
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
        const routeData: RoutePoint[] = data.route || [];
        setOrder(data.order);
        setRoute(routeData);
        setRealtime(data.realtime || null);
        setInfluencers(data.influencers || []);

        // 初始异常原因（如果订单本身就被标记异常）
        if (data.order?.exception_reason) {
          setWsExceptionReason(data.order.exception_reason);
        }

        const pickupNode = routeData.find(
          (p) => p.pickup_code && p.pickup_code.length > 0
        );
        if (pickupNode) {
          setPickupInfo({
            seq: pickupNode.seq,
            code: pickupNode.pickup_code as string,
            station: pickupNode.pickup_station || pickupNode.city || null,
          });
        }
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

  // ③ 时间轴衍生数据
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

  const firstRoute = routeAsc.length ? routeAsc[0] : null;
  const lastRoute = routeAsc.length ? routeAsc[routeAsc.length - 1] : null;

  // 原始异常文案（只管存文案，不决定显不显示）
  const rawExceptionReason = wsExceptionReason;

  // ④ 初始化地图 + Driving 路径（修改过的小车初始化逻辑）
  useEffect(() => {
    if (!route.length) return;

    let mapInstance: any;
    let destroyed = false;

    hasFocusedNearDestRef.current = false;

    loadAMap()
      .then((AMapLib) => {
        if (destroyed) return;
        const AMapGlobal = (window as any).AMap || AMapLib;

        const initMap = () => {
          if (destroyed) return;

          const pathFromDB = route.map(
            (p) => [p.lng, p.lat] as [number, number]
          );
          if (!pathFromDB.length) return;

          const origin = pathFromDB[0];
          const dest = pathFromDB[pathFromDB.length - 1];

          const senderCity =
            (route[0] && route[0].city) || order?.sender_city || "发件地";

          const receiverCity =
            (route[route.length - 1] && route[route.length - 1].city) ||
            order?.receiver_city ||
            "收货地";

          // 创建地图
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

          // 小车 marker，先放在起点，真正起始位置在 buildPath 中按 realtime 吸附
          const carMarker = new AMapGlobal.Marker({
            position: origin,
            map: mapInstance,
            title: "快递实时位置",
            content: `
    <div style="
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    ">
      <img
        src="${mapTruckIcon}"
        style="
          width: 26px;
          height: 26px;
          display: block;
        "
      />
    </div>
  `,
            offset: new AMapGlobal.Pixel(0, 0),
            zIndex: 120,
            className: "track-car-marker",
          });

          carMarkerRef.current = carMarker;

          // 真正构建路径 + 根据 realtime 确定小车起始位置
          const buildPath = (path: [number, number][]) => {
            if (!path || path.length < 2) return;

            basePathRef.current = path;
            realPathRef.current = path;

            if (fullPolylineRef.current) {
              mapInstance.remove(fullPolylineRef.current);
            }
            if (passedPolylineRef.current) {
              mapInstance.remove(passedPolylineRef.current);
            }

            const fullPolyline = new AMapGlobal.Polyline({
              path,
              map: mapInstance,
              strokeColor: "#ffb36a",
              strokeWeight: 5,
              showDir: true,
            });
            fullPolylineRef.current = fullPolyline;

            // === 使用最新的 realtime，把小车吸附到路径上 ===
            let initIdx = 0;
            let carPos: [number, number] = path[0];

            if (realtime && realtime.lng != null && realtime.lat != null) {
              const snapped = snapToPath([realtime.lng, realtime.lat], path);
              carPos = snapped;
              initIdx = findNearestIndexOnPath(snapped, path);
            } else {
              initIdx = 0;
              carPos = path[0];
            }

            currentIndexRef.current = initIdx;
            targetIndexRef.current = initIdx;

            if (carMarkerRef.current) {
              carMarkerRef.current.setPosition(carPos);
            }

            const passedPolyline = new AMapGlobal.Polyline({
              path: path.slice(0, initIdx + 1),
              map: mapInstance,
              strokeColor: "#ff6a00",
              strokeWeight: 6,
              showDir: false,
            });
            passedPolylineRef.current = passedPolyline;

            const lastIdx = path.length - 1;
            const [cx, cy] = path[initIdx];
            const [dx, dy] = path[lastIdx];
            const dist = calcDistanceMeters(cx, cy, dx, dy);
            setDistanceToDest(dist);

            if (lastIdx > 0) {
              const ratio = initIdx / lastIdx;
              setProgressRatio(ratio);
            } else {
              setProgressRatio(0);
            }

            mapInstance.setFitView([fullPolyline]);
          };

          const useDrivingPath = () => {
            const driving = new AMapGlobal.Driving({
              map: null,
              showTraffic: false,
            });

            driving.search(origin, dest, (status: string, result: any) => {
              if (destroyed) return;
              if (
                status === "complete" &&
                result.routes &&
                result.routes.length
              ) {
                const route0 = result.routes[0];
                const fullPath: [number, number][] = [];
                if (route0.steps && route0.steps.length) {
                  route0.steps.forEach((step: any) => {
                    if (!step.path) return;
                    step.path.forEach((p: any) => {
                      fullPath.push([p.lng, p.lat]);
                    });
                  });
                }

                if (fullPath.length > 1) {
                  buildPath(fullPath);
                } else {
                  buildPath(pathFromDB);
                }
              } else {
                console.warn("Driving search failed:", status, result);
                buildPath(pathFromDB);
              }
            });
          };

          if (AMapGlobal.Driving) {
            useDrivingPath();
          } else {
            AMapGlobal.plugin(["AMap.Driving"], useDrivingPath);
          }
        };

        if (AMapGlobal.Driving) {
          initMap();
        } else {
          AMapGlobal.plugin(["AMap.Driving"], initMap);
        }
      })
      .catch((err) => {
        console.error("AMap 初始化失败：", err);
      });

    return () => {
      destroyed = true;
      if (mapInstance) {
        mapInstance.destroy();
      }
      mapRef.current = null;
      carMarkerRef.current = null;
      carInfoMarkerRef.current = null;
      fullPolylineRef.current = null;
      passedPolylineRef.current = null;
    };
  }, [route, trackingNo]);

  // ⑤ WebSocket：收到新的 realtime，只更新目标索引
  useEffect(() => {
    if (!trackingNo) return;
    if (typeof WebSocket === "undefined") {
      console.warn("当前环境不支持 WebSocket");
      return;
    }

    const ws = new WebSocket("ws://localhost:3002");

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
          setRealtime(realtimeData);

          setWsLogisticsStatus(msg.logisticsStatus || null);
          setWsExceptionReason(msg.exceptionReason || null);
          setMqStatus(msg.mqStatus ?? null);
          setExpectedStatus(msg.expectedStatus ?? null);
          setStatusMatch(
            typeof msg.statusMatch === "boolean" ? msg.statusMatch : null
          );

          if (msg.pickupInfo && msg.pickupInfo.code) {
            setPickupInfo({
              seq: msg.pickupInfo.seq,
              code: msg.pickupInfo.code,
              station: msg.pickupInfo.station || null,
            });
          } else if (!msg.pickupInfo) {
            setPickupInfo(null);
          }

          const { lng, lat } = realtimeData;
          if (lng != null && lat != null) {
            const rawPoint: [number, number] = [lng, lat];
            const pathForSnap =
              realPathRef.current.length > 1
                ? realPathRef.current
                : basePathRef.current.length > 1
                ? basePathRef.current
                : null;

            if (!pathForSnap || pathForSnap.length < 2) {
              if (carMarkerRef.current) {
                carMarkerRef.current.setPosition(rawPoint);
              }
              return;
            }

            const snapped = snapToPath(rawPoint, pathForSnap);

            let toIdx = findNearestIndexOnPath(snapped, pathForSnap);
            const maxIdx = pathForSnap.length - 1;
            toIdx = Math.max(0, Math.min(toIdx, maxIdx));

            const curIdx = currentIndexRef.current;

            if (toIdx <= curIdx) {
              targetIndexRef.current = curIdx;
            } else {
              targetIndexRef.current = toIdx;
            }
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

  // ⑥ 前端自驱动动画
  useEffect(() => {
    let frameId: number;

    const animate = () => {
      const path =
        realPathRef.current.length > 1
          ? realPathRef.current
          : basePathRef.current;
      const carMarker = carMarkerRef.current;
      const passedPolyline = passedPolylineRef.current;

      if (!path || path.length === 0 || !carMarker || !passedPolyline) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      let cur = currentIndexRef.current;
      const target = targetIndexRef.current;
      const maxIdx = path.length - 1;

      if (cur < target) {
        const diff = target - cur;
        let step = 1;

        if (diff > 300) step = 20;
        else if (diff > 120) step = 10;
        else if (diff > 40) step = 4;
        else if (diff > 10) step = 2;

        if (hasFocusedNearDestRef.current && step > 2) {
          step = 2;
        }

        const next = Math.min(cur + step, target, maxIdx);
        currentIndexRef.current = next;
        cur = next;

        const [lng, lat] = path[cur];
        carMarker.setPosition([lng, lat]);
        passedPolyline.setPath(path.slice(0, cur + 1));

        const destPath =
          realPathRef.current.length > 1
            ? realPathRef.current
            : basePathRef.current;
        if (destPath && destPath.length) {
          const [dx, dy] = destPath[destPath.length - 1];
          const dist = calcDistanceMeters(lng, lat, dx, dy);
          setDistanceToDest(dist);

          const ratio = destPath.length > 1 ? cur / (destPath.length - 1) : 0;
          setProgressRatio(ratio);

          if (carInfoMarkerRef.current) {
            carInfoMarkerRef.current.setPosition([lng, lat]);
            carInfoMarkerRef.current.setContent(`
              <div style="
                padding: 4px 8px;
                background: rgba(0,0,0,0.7);
                color: #fff;
                border-radius: 6px;
                font-size: 11px;
                white-space: nowrap;
                transform: translate(-50%, -100%);
              ">
                距收货地 ${formatDistance(dist)}
              </div>
            `);
          }
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ⑦ 聚焦 & 黑色距收货地气泡
  const NEAR_DEST_THRESHOLD = 80000;
  const CAR_FOCUS_ZOOM = 8;

  const logisticsStatusFromRoute =
    activeRoute?.status || lastRoute?.status || "运输中";

  const logisticsStatusEffective =
    wsLogisticsStatus || realtime?.status || logisticsStatusFromRoute;

  const isExceptionActive =
    statusMatch === false ||
    (!!rawExceptionReason && !!mqStatus && !!expectedStatus);

  const exceptionReason = isExceptionActive ? rawExceptionReason : null;

  const orderStatusText = isExceptionActive
    ? "异常"
    : logisticsStatusEffective || "运输中";

  const showExceptionBanner = orderStatusText === "异常";

  useEffect(() => {
    const map = mapRef.current;
    const carMarker = carMarkerRef.current;
    const path =
      realPathRef.current.length > 1
        ? realPathRef.current
        : basePathRef.current;

    if (!map || !carMarker || !path || !path.length) return;
    if (distanceToDest == null) return;

    const isNear = distanceToDest <= NEAR_DEST_THRESHOLD;
    const isDeliveringNear =
      !exceptionReason &&
      (logisticsStatusEffective === "派送中" ||
        logisticsStatusEffective === "待取件");

    if (isNear && isDeliveringNear) {
      if (!hasFocusedNearDestRef.current) {
        hasFocusedNearDestRef.current = true;

        const lastIdx = Math.max(path.length - 1, 0);
        const [destLng, destLat] = path[lastIdx];

        map.setZoomAndCenter(CAR_FOCUS_ZOOM, [destLng, destLat]);
      }

      if (!carInfoMarkerRef.current) {
        const AMapGlobal = (window as any).AMap;
        if (!AMapGlobal) return;

        const pos = carMarker.getPosition();
        let lng: number;
        let lat: number;

        if (
          pos &&
          typeof pos.getLng === "function" &&
          typeof pos.getLat === "function"
        ) {
          lng = pos.getLng();
          lat = pos.getLat();
        } else if (
          pos &&
          typeof pos.lng === "number" &&
          typeof pos.lat === "number"
        ) {
          lng = pos.lng;
          lat = pos.lat;
        } else if (Array.isArray(pos) && pos.length >= 2) {
          lng = pos[0];
          lat = pos[1];
        } else {
          const [sx, sy] = path[0];
          lng = sx;
          lat = sy;
        }

        const marker = new AMapGlobal.Marker({
          position: [lng, lat],
          map,
          offset: new AMapGlobal.Pixel(0, -40),
          zIndex: 121,
          content: `
            <div style="
              padding: 4px 8px;
              background: rgba(0,0,0,0.7);
              color: #fff;
              border-radius: 6px;
              font-size: 11px;
              white-space: nowrap;
              transform: translate(-50%, -100%);
            ">
              距收货地 ${formatDistance(distanceToDest)}
            </div>
          `,
        });
        carInfoMarkerRef.current = marker;
      }
    }
  }, [distanceToDest, exceptionReason, logisticsStatusEffective]);

  const orderTags =
    order?.advantage_tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];

  const etaForBadge = realtime?.eta_time || order?.eta_time || null;

  const receiverName = order?.receiver_name || "收件人";
  const receiverPhoneMasked = order?.receiver_phone
    ? maskPhone(order.receiver_phone)
    : "";

  const badgeTitle = orderStatusText || "物流更新中";

  const badgeSub = exceptionReason
    ? exceptionReason
    : (activeRoute?.city || lastRoute?.city || "当前位置") +
      (activeRoute?.description || lastRoute?.description ? " 附近" : "");

  // 取件卡片：只有真正到达“待取件”阶段才展示
  const isPickupStage =
    logisticsStatusEffective === "待取件" || activeRoute?.status === "待取件";

  const showPickupCard = !!pickupInfo && isPickupStage;

  const pickupRoutePoint = pickupInfo
    ? route.find((p) => p.seq === pickupInfo.seq) || activeRoute
    : null;

  const pickupStationName =
    pickupInfo?.station ||
    pickupRoutePoint?.pickup_station ||
    pickupRoutePoint?.city ||
    "自提点";

  const pickupAddress =
    pickupRoutePoint?.description ||
    order?.receiver_address ||
    "请根据短信提示前往自提点取件";

  //  把“是否显示取件卡片 + 取件码”同步给父组件（App → OrderListPage）
  useEffect(() => {
    if (!onPickupVisibilityChange) return;
    onPickupVisibilityChange(
      trackingNo,
      showPickupCard,
      pickupInfo?.code ?? null
    );
  }, [trackingNo, showPickupCard, pickupInfo?.code, onPickupVisibilityChange]);

  // 进度卡片相关
  const originRaw = order?.sender_city || firstRoute?.city || "";
  const destRaw = order?.receiver_city || lastRoute?.city || "";

  const originShort = shortCityName(originRaw);
  const destShort = shortCityName(destRaw);

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progressRatio * 100))
  );
  const etaForProgress = etaForBadge;

  // 达人带货文案
  const validInfluencers = influencers.filter(
    (it) =>
      it &&
      typeof it.buyers_count === "number" &&
      !!it.influencer_name &&
      it.buyers_count > 0
  );

  const influencerLoop =
    validInfluencers.length > 1
      ? [...validInfluencers, ...validInfluencers]
      : validInfluencers;

  return (
    <div
      className={
        "track-page" +
        (entering ? " track-page-enter" : "") +
        (leaving ? " track-page-exit" : "")
      }
      onScroll={handleScroll}
    >
      {/* 顶部地图区域 */}
      <div className="track-map" style={{ height: mapHeight }}>
        <div id="track-map-inner" className="track-map-inner" />
        <div className="track-map-overlay" />

        {/* 地图上的 toolbar */}
        <div className="track-map-toolbar">
          <span className="track-icon-back" onClick={handleBackClick}>
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

        {/* 地图里的达人带货条 */}
        {influencerLoop.length > 0 && (
          <div className="track-influencer-bar">
            <div className="track-influencer-label">达人带货</div>
            <div className="track-influencer-marquee">
              {influencerLoop.map((it, idx) => (
                <span key={idx} className="track-influencer-item">
                  <span className="track-influencer-name">
                    @{it.influencer_name}
                  </span>
                  <span className="track-influencer-text">
                    &nbsp;推荐购买了本商品，已有 {it.buyers_count} 人通过 ta
                    下单
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 右下角气泡 */}
        <div className="track-map-badge">
          <div className="track-map-badge-title">{badgeTitle}</div>
          <div className="track-map-badge-sub">{badgeSub}</div>
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
        {/* 进度条卡片 */}
        <section className="track-progress-card">
          <div className="track-progress-header">
            <div className="track-progress-end">
              <div className="track-progress-label">发货地</div>
              <div className="track-progress-city">{originShort}</div>
            </div>

            <div className="track-progress-center">
              <div className="track-progress-mainline">
                <div className="track-progress-text">
                  已走
                  <span className="track-progress-percent-num">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              {etaForProgress && (
                <div className="track-progress-eta">
                  预计{formatEtaDate(etaForProgress)}送达
                </div>
              )}
            </div>

            <div className="track-progress-end track-progress-end-right">
              <div className="track-progress-label">收货地</div>
              <div className="track-progress-city">{destShort}</div>
            </div>
          </div>

          <div className="track-progress-bar-wrapper">
            <div className="track-progress-bar-bg">
              <div
                className="track-progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <img
                src={progressTruckIcon}
                alt="truck"
                className="track-progress-car"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* 快递公司 + 运单号 */}
        <section className="track-express-row" onClick={handleDebugTap}>
          <div className="track-express-left">
            <span className="track-express-logo">
              {order?.express_name?.[0] || "韵"}
            </span>
            <div className="track-express-text">
              <div className="track-express-name-row">
                <span className="track-express-name">
                  {order?.express_name || "韵达快递"}
                </span>
                <span className="track-express-no">
                  {order?.tracking_no || trackingNo}
                </span>
              </div>
            </div>
          </div>

          <div className="track-express-actions">
            <button className="track-link-btn">复制</button>
            <span className="track-express-divider" />
            <button className="track-link-btn">打电话</button>
          </div>
        </section>

        {/* 时间轴 */}
        <section className="track-timeline-card">
          {timelineVisible.map((p) => {
            const isActive = p.id === activeRoute?.id;
            const nodeStatus = isActive
              ? orderStatusText
              : p.status || "运输中";
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
                    <span className="track-status">{nodeStatus}</span>
                    <span className="track-time">{formatTime(p.time)}</span>
                  </div>
                  <div className="track-timeline-desc">
                    {p.description || "包裹正在运输途中，物流信息将持续更新。"}
                  </div>
                </div>
              </div>
            );
          })}

          {showExceptionBanner && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 6,
                background: "#fff7f7",
                color: "#d93026",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {mqStatus && expectedStatus ? (
                <>
                  实时状态（{mqStatus}）与预设状态（{expectedStatus}）不一致，
                  包裹已标记为异常。
                </>
              ) : (
                exceptionReason || "包裹已标记为异常，请留意后续物流更新。"
              )}
            </div>
          )}
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

        {/* 取件码卡片 */}
        {showPickupCard && pickupInfo && (
          <section className="track-pickup-card">
            <div className="track-pickup-header">
              <div className="track-pickup-title">{pickupStationName}</div>
              <div className="track-pickup-sub">{pickupAddress}</div>
            </div>

            <div className="track-pickup-code-row">
              <span className="track-pickup-label">取件码</span>
              <span className="track-pickup-code">{pickupInfo.code}</span>
              <button
                type="button"
                className="track-pickup-copy"
                onClick={handleCopyPickupCode}
              >
                复制
              </button>
            </div>

            <button type="button" className="track-pickup-help">
              找人帮取
            </button>
          </section>
        )}

        {/* 收货地址 */}
        <section className="track-address-card">
          <div className="track-address-header">
            <span className="track-address-icon">📍</span>
            <span className="track-address-title">
              送至 {order?.receiver_city || "收货地址"}
            </span>
          </div>
          <div className="track-address-sub">
            {receiverName}
            {receiverPhoneMasked && <> 86-{receiverPhoneMasked}</>}
            <span className="track-address-tag">号码保护中</span>
          </div>
          {order?.receiver_address && (
            <div className="track-address-detail">{order.receiver_address}</div>
          )}
        </section>

        {/* 订单信息卡片（带本地图片） */}
        {order && (
          <section className="track-order-card">
            <div className="track-order-shop-row">
              <div>
                <span className="track-order-shop-tag">
                  {order.channel === "tmall" ? "天猫" : "淘宝"}
                </span>
                <span className="track-order-shop-name">
                  {order.shop_name || "店铺名称"}
                </span>
              </div>

              <div className="track-order-status">{orderStatusText}</div>
            </div>

            <div className="track-order-product">
              <img
                className="track-order-thumb"
                src={getOrderImage(order)}
                alt={order.order_title}
                onError={handleImgError}
              />
              <div className="track-order-info">
                <div className="track-order-title">
                  {order.order_title || "商品标题"}
                </div>
                <div className="track-order-sub">
                  {order.remark ||
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
                ￥{formatPrice(order.price_cents)}
                <div className="track-order-count">×{order.quantity ?? 1}</div>
              </div>
            </div>
          </section>
        )}

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
