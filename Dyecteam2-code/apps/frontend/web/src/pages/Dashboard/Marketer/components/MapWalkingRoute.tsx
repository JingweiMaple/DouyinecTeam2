import React, { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
declare global {
  interface Window {
    AMap: any;
  }
}
// 样式可以直接放在组件内，也可以放在单独的 CSS 文件
const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mapContainer: {
    width: '100%',
    height: '100%',
  },
  panel: {
    position: 'absolute',
    backgroundColor: 'white',
    maxHeight: '90%',
    overflowY: 'auto',
    top: '10px',
    right: '10px',
    width: '280px',
    borderRadius: '4px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  panelHeader: {
    backgroundColor: '#009cf9',
    padding: '10px',
    color: 'white',
    fontSize: '14px',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
  },
};

const MapWalkingRoute = ({
  apiKey, // 高德地图API Key
  startPoint = [116.399028, 39.845042], // 起点坐标 [经度, 纬度]
  endPoint = [116.436281, 39.880719], // 终点坐标 [经度, 纬度]
  zoom = 13, // 地图缩放级别
  center = [116.397428, 39.90923], // 地图中心点
  showPanel = true, // 是否显示路线信息面板
  mapStyle = 'normal', // 地图样式
  }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const walkingInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    // 初始化地图
    const initMap = async () => {
      if (!apiKey) {
        setError('请提供高德地图API Key');
        setLoading(false);
        return;
      }

      try {

        // 初始化地图
        mapInstance.current = new window.AMap.Map(mapRef.current, {
          resizeEnable: true,
          center: center,
          zoom: 10,
          mapStyle: mapStyle === 'dark' ? 'amap://styles/dark' : 'normal',
        });
        // 初始化步行导航
        walkingInstance.current = new window.AMap.Driving({
          map: mapInstance.current,
          panel: showPanel ? 'driving-route-panel' : undefined,
        });
        // 规划路线
        await searchRoute(startPoint, endPoint);
        setLoading(false);
      } catch (err) {
        console.error('地图初始化失败:', err);
        setError('地图初始化失败');
        setLoading(false);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
      mapInstance.current = null;
      walkingInstance.current = null;
    };
  }, [apiKey]);

  // 搜索路线
  const searchRoute = (start, end) => {
    return new Promise((resolve) => {
      if (!walkingInstance.current) return;

      walkingInstance.current.search(start, end, (status, result) => {
        if (status === 'complete') {
          console.log('绘制步行路线完成', result);
          // 提取路线信息
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            setRouteInfo({
              distance: route.distance, // 距离，单位：米
              time: route.time, // 时间，单位：秒
              steps: route.steps, // 路线步骤
            });
          }
          resolve(result);
        } else {
          console.error('步行路线数据查询失败', result);
          setError('路线规划失败');
          resolve(null);
        }
      });
    });
  };

  // 重新规划路线
  const handleReplan = () => {
    if (walkingInstance.current) {
      searchRoute(startPoint, endPoint);
    }
  };

  // 清除路线
  const handleClear = () => {
    if (walkingInstance.current) {
      walkingInstance.current.clear();
      setRouteInfo(null);
    }
  };

  // 设置新的起点终点
  const updateRoute = (newStart, newEnd) => {
    searchRoute(newStart, newEnd);
  };

  return (
    <div >
      {/* 地图容器 */}
      <div ref={mapRef}  />
      
      {/* 路线信息面板 */}
      {showPanel && (
        <div id="walking-route-panel">
          <div>
            步行路线规划
          </div>
          {loading && (
            <div >
              加载中...
            </div>
          )}
          
          {error && (
            <div >
              {error}
            </div>
          )}
          
          {routeInfo && !loading && !error && (
            <div >
              <div >
                <strong>路线信息：</strong>
                <div>距离：{(routeInfo.distance / 1000).toFixed(2)} 公里</div>
                <div>时间：{Math.round(routeInfo.time / 60)} 分钟</div>
              </div>
              
              <div >
                <button
                  onClick={handleReplan}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#009cf9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  重新规划
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  清除路线
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 使用示例的组件
export const MapWalkingRouteExample = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MapWalkingRoute
        apiKey="1acd0b23703356a683d8b4c0c9daa645&plugin=AMap.Driving" // 替换为你的高德地图key
        startPoint={[116.399028, 39.845042]}
        endPoint={[116.436281, 39.880719]}
        zoom={13}
        showPanel={true}
      />
    </div>
  );
};

export default MapWalkingRouteExample;