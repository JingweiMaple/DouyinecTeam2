import React, { useEffect, useRef, useState } from 'react';
import { Card} from 'tdesign-react';
import style from './map.module.less';
// 百度地图GL类型声明（可选，TypeScript用）
declare global {
  interface Window {
    BMapGL: any;
  }
}

const BaiduMapGL: React.FC = () => {
  // 地图容器DOM引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // 地图实例引用
  const mapRef = useRef<any>(null);
  // 加载状态
  const [loading, setLoading] = useState(true);

  // 动态加载百度地图GL脚本
  const loadBaiduMapScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 避免重复加载
      if (window.BMapGL) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      // 替换为你的百度地图AK
      script.src = '//api.map.baidu.com/api?type=webgl&v=1.0&ak=4l5x9VT1whGoQtjah8iduyhR8ykiFAwI';
      script.onload = () => resolve();
      script.onerror = (err) => reject(new Error('百度地图脚本加载失败'));
      document.body.appendChild(script);
    });
  };

  // 初始化地图
  const initMap = async () => {
    try {
      // 加载地图脚本
      await loadBaiduMapScript();

      if (!mapContainerRef.current) return;

      // 1. 创建地图实例（GL版命名空间BMapGL）
      const map = new window.BMapGL.Map(mapContainerRef.current);

      // 2. 设置中心点坐标和地图级别（南京为例）
      const point = new window.BMapGL.Point(118.791, 32.062);
      map.centerAndZoom(point, 12);

      // 3. 开启鼠标滚轮缩放
      map.enableScrollWheelZoom();

      // 4. 可选：添加地图控件（缩放、比例尺等）
      map.addControl(new window.BMapGL.ZoomControl()); // 缩放控件
      map.addControl(new window.BMapGL.ScaleControl()); // 比例尺控件
      map.addControl(new window.BMapGL.MapTypeControl()); // 地图类型切换控件

      // 保存地图实例到ref（后续可用于修改地图状态）
      mapRef.current = map;
      setLoading(false);
    } catch (error) {
      console.error('地图初始化失败：', error);
      setLoading(false);
    }
  };

  // 组件挂载时初始化地图，卸载时销毁地图
  useEffect(() => {
    initMap();

    // 清理函数：组件卸载时销毁地图实例
    return () => {
      if (mapRef.current) {
        mapRef.current.dispose(); // 销毁地图，释放资源
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <Card title="百度GL地图展示"  className={style.toolBar}>

      {/* 地图容器：必须指定宽高，且在DOM挂载后才能初始化地图 */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 地图提示信息（复刻原页面的info框） */}
        <div
          style={{
            zIndex: 999,
            width: 'auto',
            minWidth: '22rem',
            padding: '0.75rem 1.25rem',
            marginLeft: '1.25rem',
            position: 'absolute',
            top: '1rem',
            backgroundColor: '#fff',
            borderRadius: '0.25rem',
            fontSize: '14px',
            color: '#666',
            boxShadow: '0 2px 6px 0 rgba(27, 142, 236, 0.5)',
          }}
        >
          最新版GL地图命名空间为BMapGL, 可按住鼠标右键控制地图旋转、修改倾斜角度。
        </div>
      </div>
    </Card>
  );
};

export default BaiduMapGL;
