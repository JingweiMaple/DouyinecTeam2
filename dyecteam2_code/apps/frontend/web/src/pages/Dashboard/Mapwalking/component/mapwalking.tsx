// import React from "react";
// import { useLocation } from "react-router-dom";

// const  Mapwalk=() =>{
// const location = useLocation();
//   const { state } = location;

//     return (
//         <div>
//             map{state?.userId}{state?.userName}
//         </div>
//     );
// }
// export default React.memo(Mapwalk);
import React, { useEffect, useRef, useState } from 'react';
import { MessagePlugin } from 'tdesign-react';
import Style from './mapwalking.module.less';


declare global {
  interface Window {
    AMap: any;
  }
}

interface RoutePlanningProps {
  // 目的地经纬度 [经度, 纬度] - 必填
  endLngLat: [number, number];
  // 起点经纬度 [经度, 纬度] - 可选，默认北京东直门
  startLngLat?: [number, number];
  // 地图容器样式
  containerStyle?: React.CSSProperties;
}

const RoutePlanning: React.FC<RoutePlanningProps> = ({
  endLngLat,
  startLngLat = [116.379028, 39.865042], // 默认起点：北京东直门
  containerStyle = { width: '100%', height: '500px' }
}) => {
  const mapRef = useRef<any>(null);
  const drivingRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 初始化地图
  useEffect(() => {
    const initMap = () => {
      if (!window.AMap) {
        MessagePlugin.error('高德地图 SDK 未加载');
        return;
      }
      
      try {
        // 创建地图实例
        mapRef.current = new window.AMap.Map(mapContainerRef.current, {
          resizeEnable: true,
          center: [116.397428, 39.90923], // 地图中心点（北京天安门）
          zoom: 13,
          viewMode: '2D'
        });
        
        // 创建路线导航类
        drivingRef.current = new window.AMap.Driving({
          map: mapRef.current,
          policy: 0, // 速度优先策略
          hideMarkers: false,
          autoFitView: true
        });
        
        MessagePlugin.success('地图初始化完成');
      } catch (error) {
        MessagePlugin.error('地图初始化失败');
      }
    };

    // 动态加载高德地图 SDK 和 Driving 插件
    if (!window.AMap) {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=1acd0b23703356a683d8b4c0c9daa645&plugin=AMap.Driving`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        MessagePlugin.error('高德地图 SDK 加载失败');
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      // 清理资源
      if (drivingRef.current) {
        drivingRef.current.clear();
      }
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  }, []); // 空依赖数组，只执行一次

  // 当目的地变化时执行路径规划
  useEffect(() => {
    if (!drivingRef.current || !endLngLat) {
      return;
    }
    
    // 清除之前的路线
    drivingRef.current.clear();
    
    // 根据起终点经纬度规划驾车导航路线
    drivingRef.current.search(
      new window.AMap.LngLat(startLngLat[0], startLngLat[1]),
      new window.AMap.LngLat(endLngLat[0], endLngLat[1]),
      (status: string, result: any) => {
        if (status === 'complete') {
          MessagePlugin.success('路径规划完成');
          
          // 获取路线中心点并调整地图视野
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            if (route.bounds) {
              mapRef.current.setBounds(route.bounds);
            }
          }
        } else {
          MessagePlugin.error(`路径规划失败: ${result}`);
        }
      }
    );
  }, [endLngLat, startLngLat]);

  return (
    <div className={Style.container}>
      <div
        ref={mapContainerRef}
        style={containerStyle}
        className={Style.map}
      />
    </div>
  );
};

export default React.memo(RoutePlanning);