// import AMapLoader from '@amap/amap-jsapi-loader';
// import React, { Component } from 'react';
// import style from "./mapContainer.module.less";
// import { MessagePlugin, Tabs, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox } from 'tdesign-react';
// class  MapComponent extends Component{
//   constructor(){
//     super();      
//     this.map = null;
//   }
//   // 2.dom渲染成功后进行map对象的创建
//   componentDidMount(){
//     window._AMapSecurityConfig = {
//       securityJsCode: "6094dad2a7674771b5b64ae9773a64fa",
//     };
//     AMapLoader.load({
//       key:"1acd0b23703356a683d8b4c0c9daa645",                     // 申请好的Web端开发者Key，首次调用 load 时必填
//       version:"2.0",              // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
//       plugins:["AMap.Scale"],     //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
//     }).then((AMap)=>{
//       this.map = new AMap.Map("container",{ //设置地图容器id
//         viewMode:"3D",         //是否为3D地图模式
//         zoom:5,                //初始化地图级别
//         center:[105.602725,37.076636], //初始化地图中心点位置
//       });
//     }).catch(e=>{
//       console.log(e);
//     })
//   }
//   render(){
//       // 1.初始化创建地图容器,div标签作为地图容器，同时为该div指定id属性；
//       return (
//         <div id="container" className={style.container} style={{ height: '800px' }} > 
//         </div>
//     );
//   }
// }
// //导出地图组建类
// export default MapComponent;

import React, { useEffect, useRef } from 'react';
import { Button, MessagePlugin, Notification } from 'tdesign-react';
import Style from './mapcontainer.module.less';
import { ControlBarControl, ScaleControl, ToolBarControl } from '@uiw/react-amap';
// types/amap.d.ts
declare global {
  interface Window {
    AMap: any;
  }
}
interface PolygonDrawerProps {
  // mapKey: string; // 高德地图API密钥
  containerStyle?: React.CSSProperties;
}
const PolygonDrawer: React.FC<PolygonDrawerProps> = ({
  containerStyle = { width: '100%', height: '500px' }
}) => {
  const mapRef = useRef<any>(null);
  const mouseToolRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // 初始化地图
  useEffect(() => {
    const initMap = () => {
      if (!window.AMap) {
        MessagePlugin.error('高德地图 SDK 未加载');
        return;
      }
      // 创建地图实例
      mapRef.current = new window.AMap.Map(mapContainerRef.current, {
        center: [118.7969, 32.0707],
        zoom: 14,
        viewMode: '2D',
        resizeEnable: true,
      });
      // 创建鼠标工具
      mouseToolRef.current = new window.AMap.MouseTool(mapRef.current);
      // 监听绘制完成事件
      mouseToolRef.current.on('draw', handleDrawComplete);
      // 添加比例尺
      mapRef.current.addControl(new window.AMap.Scale());
      // 添加缩放
      mapRef.current.addControl(new window.AMap.ToolBar());
      // //点标记显示内容
      // const markerContent = `<div ><img src="//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png"><div>X</div></div>`;
      // const position = new window.AMap.LngLat(118.7969, 32.0707); //Marker 经纬度
      // const marker = new window.AMap.Marker({
      //   position: position,
      //   content: markerContent, //将 html 传给 content
      //   offset: new window.AMap.Pixel(-13, -30), //以 icon 的 [center bottom] 为原点
       
      // });
      //  mapRef.current.add(marker)
    };
    // 动态加载高德地图 SDK
    if (!window.AMap) {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=1acd0b23703356a683d8b4c0c9daa645&plugin=AMap.MouseTool,AMap.Scale,AMap.ToolBar,AMap.Marker,AMap.Pixel`;
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
      // 清理
      if (mouseToolRef.current) {
        mouseToolRef.current.off('draw', handleDrawComplete);
      }
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  });

  // 绘制完成回调
  const handleDrawComplete = (event: any) => {
    console.log('绘制的多边形对象:', event.obj);
    MessagePlugin.success('绘制成功');
  };

  // 开始绘制多边形
  const drawPolygon = () => {
    if (!mouseToolRef.current) {
      MessagePlugin.warning('地图工具未初始化');
      return;
    }
    // 先停止当前可能存在的绘制
    mouseToolRef.current.close();
    // 开始绘制多边形
    mouseToolRef.current.polygon({
      strokeColor: "green",
      strokeOpacity: 0.2,
      strokeWeight: 6,
      fillColor: '#1791fc',
      fillOpacity: 0.4,
      strokeStyle: "solid",
    });
  };

  // 开始绘制圆形
  const drawCircle = () => {
    if (!mouseToolRef.current) {
      MessagePlugin.warning('地图工具未初始化');
      return;
    }
    // 先停止当前可能存在的绘制
    mouseToolRef.current.close();
    // 开始绘制多边形
    mouseToolRef.current.circle({
      strokeColor: "green",
      strokeOpacity: 0.2,
      strokeWeight: 6,
      fillColor: '#1791fc',
      fillOpacity: 0.4,
      strokeStyle: "solid",
    });
  };

  // 开始绘制矩形
  const drawRectangle = () => {
    if (!mouseToolRef.current) {
      MessagePlugin.warning('地图工具未初始化');
      return;
    }
    // 先停止当前可能存在的绘制
    mouseToolRef.current.close();
    // 开始绘制多矩形
    mouseToolRef.current.rectangle({
      strokeColor: "green",
      strokeOpacity: 0.2,
      strokeWeight: 6,
      fillColor: '#1791fc',
      fillOpacity: 0.4,
      strokeStyle: "solid",
    });
  };

  // 清除所有绘制
  const clearDrawings = () => {
    if (mapRef.current) {
      mapRef.current.clearMap();
      MessagePlugin.success('已清除所有绘制');
    }
  };

  return (
    <div>
      <div className={Style.container}>
        <Button
          theme="primary"
          onClick={drawCircle}
          style={{ marginRight: 8 }}
        >
          绘制圆形
        </Button>
        <Button
          theme="primary"
          onClick={drawRectangle}
          style={{ marginRight: 8 }}
        >
          绘制矩形
        </Button>
        <Button
          theme="primary"
          onClick={drawPolygon}
          style={{ marginRight: 8 }}
        >
          绘制多边形
        </Button>
        <Button
          variant="outline"
          onClick={clearDrawings}
        >
          清除所有
        </Button>
      </div>
      <div
        ref={mapContainerRef}
        style={containerStyle}
      />
    </div>
  );
};

export default React.memo(PolygonDrawer);