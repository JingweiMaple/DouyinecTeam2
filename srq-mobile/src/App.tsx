// src/App.tsx
import React, { useState } from "react";
import "./App.css";
import OrderListPage from "./OrderListPage";
import TrackPage from "./TrackPage";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<"orders" | "track">("orders");
  const [activeTrackingNo, setActiveTrackingNo] = useState<string>("");

  // 列表页点击“查看物流”
  const handleViewTrack = (trackingNo: string) => {
    setActiveTrackingNo(trackingNo);
    setCurrentPage("track");
  };

  // 轨迹页左上角返回
  const handleBack = () => {
    setCurrentPage("orders");
  };

  if (currentPage === "track") {
    return <TrackPage trackingNo={activeTrackingNo} onBack={handleBack} />;
  }

  return <OrderListPage onViewTrack={handleViewTrack} />;
};

export default App;
