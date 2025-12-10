import React, {
  useEffect,
  useMemo,
  useState,
  useCallback, // ⭐ 新增：为了复用 fetchOrders
} from "react";
import "./OrderListPage.css";

const API_BASE = "http://localhost:3002";

interface Order {
  id: number;
  shop_name: string;
  channel: string;
  order_title: string;
  order_no: string;
  tracking_no: string;
  price_cents: number;
  quantity: number;

  image_url?: string | null;
  item_spec?: string | null;

  remark: string | null;
  advantage_tags: string | null;
  status: string;
  created_at: string | null;

  // 后端可选返回的取件信息
  pickup_code?: string | null;
  pickup_station?: string | null;
}

interface PickupVisibilityInfo {
  visible: boolean;
  code: string | null;
}

type PickupVisibilityMap = Record<string, PickupVisibilityInfo | undefined>;

interface OrderListPageProps {
  onViewTrack: (trackingNo: string) => void;
  // 由 App / TrackPage 决定：每个运单号当前是否应该展示取件码
  pickupVisibility: PickupVisibilityMap;
}

// 所有商品图都放在 public/order-images 下
const LOCAL_IMG_BASE = "/order-images";
const FALLBACK_IMG = `${LOCAL_IMG_BASE}/default.png`;

// 只用本地图片：根据订单 id 生成图片路径
const getOrderImage = (order: Order): string => {
  return `${LOCAL_IMG_BASE}/${order.id}.png`;
};

const OrderListPage: React.FC<OrderListPageProps> = ({
  onViewTrack,
  pickupVisibility,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 顶部筛选
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  // 记录本次会话中，哪些订单已经点击过“确认收货”（key = order_no）
  const [confirmedMap, setConfirmedMap] = useState<Record<string, boolean>>({});

  // 图片加载失败时，自动切到兜底图片
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_IMG) {
      target.onerror = null;
      target.src = FALLBACK_IMG;
    }
  };

  // 点击“确认收货”
  const handleConfirmReceive = async (order: Order) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/orders/${order.order_no}/confirm`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "确认收货失败");
      }

      // 本地标记这个订单已经确认收货，用来切换按钮文案
      setConfirmedMap((prev) => ({
        ...prev,
        [order.order_no]: true,
      }));
    } catch (e) {
      console.error(e);
      alert("确认收货失败，请稍后重试");
    }
  };

  // ⭐ 抽成一个函数：后面切换 tab 时也可以调用，重新拉最新订单
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/orders`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
      }
      const data: Order[] = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error("加载订单失败", err);
      setError("加载订单失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载时请求一次
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 这里统一显示「交易成功」
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderStatusText = (_status: string) => "交易成功";

  const formatPrice = (cents?: number) =>
    cents == null ? "" : (cents / 100).toFixed(2);

  // 2. 根据筛选 + 搜索过滤
  const filteredOrders = useMemo(() => {
    let list = orders.slice();

    if (activeStatus !== "all") {
      if (activeStatus === "paying") {
        list = list.filter((o) => o.status === "pending_pay"); // 如果以后要做待付款再说
      } else if (activeStatus === "shipping") {
        // 「待发货」tab：只看 pending
        list = list.filter((o) => o.status === "pending");
      } else if (activeStatus === "receiving") {
        // 「待收货」tab：在路上的(delivering) + 已到站待取件(to_pickup)
        list = list.filter(
          (o) => o.status === "delivering" || o.status === "to_pickup"
        );
      } else if (activeStatus === "refund") {
        list = list.filter((o) => o.status === "refunding");
      }
    }

    if (keyword.trim()) {
      const kw = keyword.trim();
      list = list.filter((o) => {
        const matchTitle = o.order_title.includes(kw);
        const matchOrderNo = o.order_no === kw;
        return matchTitle || matchOrderNo;
      });
    }

    return list;
  }, [orders, activeStatus, keyword]);

  // 3. 渲染 UI
  return (
    <div className="order-page">
      {/* 顶部搜索 + 状态筛选（吸顶） */}
      <header className="order-header">
        <div className="order-header-inner">
          <div className="order-header-top">
            <button className="order-back-btn">
              <span className="order-back-icon" />
            </button>

            <div className="order-search-wrapper">
              <span className="order-search-icon" />
              <input
                className="order-search-input"
                placeholder="搜索订单"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <button className="order-more-btn">
              <span className="order-more-dot" />
              <span className="order-more-dot" />
              <span className="order-more-dot" />
            </button>
          </div>

          {/* 状态 tab */}
          <div className="order-status-row">
            {[
              { key: "all", label: "全部" },
              { key: "paying", label: "待付款" },
              { key: "shipping", label: "待发货" },
              { key: "receiving", label: "待收货" },
              { key: "refund", label: "退款/售后" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={
                  "order-status-tab" +
                  (activeStatus === tab.key ? " order-status-tab--active" : "")
                }
                onClick={() => {
                  // ⭐ 切换 tab 的同时重新拉一遍订单，拿最新状态
                  setActiveStatus(tab.key);
                  fetchOrders();
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 订单列表主体 */}
      <main className="order-list-main">
        {loading && <div className="order-list-placeholder">订单加载中…</div>}
        {error && (
          <div className="order-list-placeholder order-list-error">{error}</div>
        )}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="order-list-placeholder">暂无相关订单</div>
        )}

        {filteredOrders.map((order) => {
          const statusText = renderStatusText(order.status);
          const tags =
            order.advantage_tags
              ?.split(",")
              .map((t) => t.trim())
              .filter(Boolean) ?? [];

          const totalPrice = (order.price_cents || 0) * (order.quantity || 1);

          // 本次会话中，这个订单是否已经点过“确认收货”
          const isFinished = !!confirmedMap[order.order_no];

          const pickupInfo = pickupVisibility[order.tracking_no];
          const showPickupBanner = !!pickupInfo?.visible;
          const pickupCodeToShow = pickupInfo?.code ?? null;

          return (
            <section key={order.id} className="order-card">
              {/* 顶部：店铺 + 订单状态 */}
              <div className="order-card-header">
                <div className="order-card-shop">
                  <span className="order-card-shop-tag">
                    {order.channel === "tmall" ? "天猫" : "淘宝"}
                  </span>
                  <span className="order-card-shop-name">
                    {order.shop_name}
                  </span>
                </div>
                <div className="order-card-status">{statusText}</div>
              </div>

              {/* 商品信息 */}
              <div className="order-card-body">
                <img
                  className="order-card-thumb"
                  src={getOrderImage(order)}
                  alt={order.order_title}
                  onError={handleImgError}
                />

                <div className="order-card-info">
                  <div className="order-card-title">{order.order_title}</div>

                  {(order.item_spec || order.remark) && (
                    <div className="order-card-sub">
                      {order.item_spec || order.remark}
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="order-card-tags">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="order-card-price">
                  <div>￥{formatPrice(order.price_cents)}</div>
                  <div className="order-card-count">×{order.quantity}</div>
                </div>
              </div>

              {/* 待取件 + 取件码横条：完全听轨迹页的判断 */}
              {showPickupBanner && pickupCodeToShow && (
                <div className="order-pickup-banner">
                  <div className="order-pickup-left">
                    <span className="order-pickup-icon" />
                    <div className="order-pickup-text">
                      <div className="order-pickup-status">待取件</div>
                      <div className="order-pickup-code">
                        取件码 <span>{pickupCodeToShow}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="order-pickup-btn"
                    onClick={() => onViewTrack(order.tracking_no)}
                  >
                    立即取件 &gt;
                  </button>
                </div>
              )}

              {/* 实付金额 */}
              <div className="order-card-amount-row">
                <span className="order-card-amount-label">实付</span>
                <span className="order-card-amount-value">
                  ￥{formatPrice(totalPrice)}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="order-card-footer">
                <div className="order-card-actions">
                  <button
                    className="order-card-btn order-card-btn-ghost"
                    onClick={() => onViewTrack(order.tracking_no)}
                  >
                    查看物流
                  </button>
                  <button className="order-card-btn order-card-btn-ghost">
                    评价
                  </button>
                  <button className="order-card-btn order-card-btn-ghost">
                    加入购物车
                  </button>
                  <button
                    className="order-card-btn order-card-btn-primary"
                    onClick={() => {
                      if (!isFinished) {
                        // 还没确认收货 → 调接口 + 通知商家端（通过 3002 后端）
                        handleConfirmReceive(order);
                      } else {
                        // 已经确认收货 → 这里才是“再买一单”的行为（你以后真要实现再写）
                        console.log("再买一单", order.order_no);
                      }
                    }}
                  >
                    {isFinished ? "再买一单" : "确认收货"}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default OrderListPage;
