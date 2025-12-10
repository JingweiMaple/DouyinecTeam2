// src/App.tsx
import React, { useCallback, useState } from "react";
import "./App.css";
import OrderListPage from "./OrderListPage";
import TrackPage from "./TrackPage";

type PickupVisibilityInfo = {
  visible: boolean;
  code: string | null;
};

// value 允许为 undefined，方便做“没这单记录”的判断
type PickupVisibilityMap = Record<string, PickupVisibilityInfo | undefined>;

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<"orders" | "track">("orders");
  const [activeTrackingNo, setActiveTrackingNo] = useState<string>("");

  // 由 TrackPage 决定：每个运单号当前是否显示取件码、取件码是多少
  const [pickupVisibility, setPickupVisibility] = useState<PickupVisibilityMap>(
    {}
  );

  // 列表页点击“查看物流”
  const handleViewTrack = (trackingNo: string) => {
    setActiveTrackingNo(trackingNo);
    setCurrentPage("track");
  };

  // 轨迹页左上角返回
  const handleBack = () => {
    setCurrentPage("orders");
  };

  /**
   * 轨迹页回调：同步这单的取件卡片显示状态
   * - 用 useCallback 固定回调引用，避免作为依赖时每次 render 都变化
   * - setState 里先比较新旧值，相同就直接返回 prev，防止无意义更新造成死循环
   */
  const handlePickupVisibilityChange = useCallback(
    (trackingNo: string, visible: boolean, code?: string | null) => {
      setPickupVisibility((prev) => {
        const prevInfo = prev[trackingNo];
        const prevVisible = !!prevInfo?.visible;
        const prevCode = prevInfo?.code ?? null;

        const nextVisible = !!visible;
        const nextCode = nextVisible ? code ?? null : null;

        // 如果这单的显示状态 & 取件码都没变化，就不要创建新对象，避免反复 render
        if (prevVisible === nextVisible && prevCode === nextCode) {
          return prev;
        }

        return {
          ...prev,
          [trackingNo]: {
            visible: nextVisible,
            code: nextCode,
          },
        };
      });
    },
    []
  );

  if (currentPage === "track") {
    return (
      <TrackPage
        trackingNo={activeTrackingNo}
        onBack={handleBack}
        onPickupVisibilityChange={handlePickupVisibilityChange}
      />
    );
  }

  return (
    <OrderListPage
      onViewTrack={handleViewTrack}
      pickupVisibility={pickupVisibility}
    />
  );
};

export default App;
