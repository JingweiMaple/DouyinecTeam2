/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react";
import "./OrderListPage.css";

const API_BASE = "http://localhost:3001";

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
}

interface OrderListPageProps {
  onViewTrack: (trackingNo: string) => void;
}

const FALLBACK_IMG =
  "https://images.pexels.com/photos/1341877/pexels-photo-1341877.jpeg?auto=compress&cs=tinysrgb&w=200";

const OrderListPage: React.FC<OrderListPageProps> = ({ onViewTrack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 顶部筛选
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  // 图片加载失败时，自动切到兜底图片
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_IMG) {
      target.src = FALLBACK_IMG;
    }
  };

  // ===== 1. 从后端（数据库）拉订单列表 =====
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/orders`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "请求失败");
        }
        return res.json();
      })
      .then((data: Order[]) => {
        setOrders(data || []);
      })
      .catch((err) => {
        console.error("加载订单失败", err);
        setError("加载订单失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 这里统一显示「交易成功」，不管真实 status
  const renderStatusText = (status: string) => {
    return "交易成功";
  };

  const formatPrice = (cents?: number) => {
    if (cents == null) return "";
    return (cents / 100).toFixed(2);
  };

  // ===== 2. 根据筛选 + 搜索过滤（在内存中过滤 orders） =====
  const filteredOrders = useMemo(() => {
    let list = orders.slice();

    if (activeStatus !== "all") {
      if (activeStatus === "paying") {
        list = list.filter((o) => o.status === "pending");
      } else if (activeStatus === "shipping") {
        list = list.filter((o) => o.status === "delivering");
      } else if (activeStatus === "receiving") {
        list = list.filter(
          (o) => o.status === "to_pickup" || o.status === "shipped"
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

  // ===== 3. 渲染 UI =====
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
                onClick={() => setActiveStatus(tab.key)}
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
                  src={order.image_url || FALLBACK_IMG}
                  alt={order.order_title}
                  onError={handleImgError}
                />

                <div className="order-card-info">
                  <div className="order-card-title">{order.order_title}</div>

                  {/* 商品规格/备注：优先 item_spec，没有再用 remark */}
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
                  <button className="order-card-btn order-card-btn-primary">
                    再买一单
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
