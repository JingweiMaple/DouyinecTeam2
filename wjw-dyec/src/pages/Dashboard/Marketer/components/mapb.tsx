// import ReactDOM from 'react-dom';
// import React, { useEffect, useRef, Fragment } from 'react';
// import { Map, APILoader, ScaleControl, ToolBarControl, ControlBarControl, Geolocation } from '@uiw/react-amap';
// import style from './mapb.module.less';
// import { Card, Row, Col } from 'tdesign-react';
// import AMapLoader from '@amap/amap-jsapi-loader';



// // const points = [
// //   { keyword: '北京市地震局（公交站）',city:'北京' }, //起始点坐标
// //   { keyword: '亦庄文化园（地铁站）',city:'北京' } //终点坐标
// // ]

// // //引入和创建驾车规划插件
// // AMap.plugin(["AMap.Driving"], function () {
// //   const driving = new AMap.Driving({
// //     map: map,
// //     panel: "my-panel", //参数值为你页面定义容器的 id 值<div id="my-panel"></div>
// //   });
// //   //获取起终点规划线路
// //   driving.search(points, function (status, result) {
// //     if (status === "complete") {
// //       //status：complete 表示查询成功，no_data 为查询无结果，error 代表查询错误
// //       //查询成功时，result 即为对应的驾车导航信息
// //       console.log(result);
// //     } else {
// //       console.log("获取驾车数据失败：" + result);
// //     }
// //   });
// // });
// const Demo = () => (
//   <Card className={style.toolBar}>展示
//     <Map zoom={10} style={{ height: 700 }} >
//       <ScaleControl offset={[16, 30]} position="LB" />
//       <ToolBarControl offset={[16, 10]} position="RB" />
//       <ControlBarControl offset={[16, 180]} position="RB" />
//       <Geolocation
//         maximumAge={100000}
//         borderRadius="5px"
//         position="RB"
//         offset={[16, 80]}
//         zoomToAccuracy={true}
//         showCircle={true}
//       />
//     </Map>
//     {/* <Map style={{ height: 300 }}>
//       {({ AMap, map, container }) => {
//         return;
//       }}
//     </Map> */}

//   </Card>
// );
// const Mount = () => (
//   <APILoader version="2.0.5" akey="1acd0b23703356a683d8b4c0c9daa645">
//     <Demo />
//   </APILoader>
// )
// export default Mount

// import { Card, Row, Col } from 'tdesign-react';
// import ReactDOM from 'react-dom';
// import React, { useState, useRef } from 'react';
// import { Map, APILoader, Polyline, ToolBarControl, useMap } from '@uiw/react-amap';
// import {  drawPolyline, MouseTool,MouseToolDrawType } from '@uiw/react-amap';
// const path1 = [ [121.099109,31.222311], [118.528308,31.989555], [117.319812,31.803006], [114.353503,30.67583], [115.891589,28.979429], [112.947253,28.188361], ];
// const path2 = [ [116.405289, 39.904987], [113.964458, 40.54664], [111.47836, 41.135964], [108.949297, 41.670904], [106.380111, 42.149509], [103.774185, 42.56996], [101.135432, 42.930601], [98.46826, 43.229964], [95.777529, 43.466798], [93.068486, 43.64009], [90.34669, 43.749086], [87.61792, 43.793308], ];
// const ChildComp = (props = {}) => {
//   return (
//     <div>
//       <Polyline {...props} visiable={true} strokeOpacity={1} path={path1} />
//       <Polyline {...props} visiable={true} strokeOpacity={1} path={path2} />
//     </div>
//   )
// }
// const Demo = () => {
//   const [show, setShow] = useState(true);
//   return (
//     <div style={{ width: '100%', height: '300px' }}>
//       <Map zoom={3}>
//         {(props) => {
//           return <ChildComp {...props} />;
//         }}
//       </Map>
//     </div>
//   );
// }
// const Example = () => {
//   const [active, setActive] = useState(false);
//   const [type,setType]=useState();
//   const handleDraw=(type)=>{
//     setType(type);
//     setActive(true);
//   }
//   return (
//     <Card>
//       <button onClick={() => handleDraw(MouseToolDrawType.MARKER)}>
//         绘制 Marker
//       </button>
//       <button onClick={() => drawPolyline()}>
//         绘制 Polyline
//       </button>
//       <button onClick={() => handleDraw(MouseToolDrawType.POLYGON)}>
//         绘制 Polygon
//       </button>
//        <button onClick={() => handleDraw(MouseToolDrawType.CIRCLE)}>
//         绘制圆形 Circle
//       </button>
//        <button onClick={() => handleDraw(MouseToolDrawType.RECTANGLE)}>
//         绘制矩形 Rectangle
//       </button>
//        <button onClick={() => handleDraw(MouseToolDrawType.MEASUREAREA)}>
//         绘制 MeasureArea
//       </button>
//        <button onClick={() => handleDraw(MouseToolDrawType.RULE)}>
//         绘制 Rule
//       </button>
//        <button onClick={() => handleDraw(MouseToolDrawType.RECTZOOMIN)}>
//         绘制 RectZoomIn
//       </button>
//      <button onClick={() => handleDraw(MouseToolDrawType.RECTZOOMOUT)}>
//         绘制 RectZoomOut
//       </button>
//       <div style={{ width: '100%', height: '500px' }}>
//         <Map zoom={14} center={[116.400274, 39.905812]} dragEnable={false}>
//             <MouseTool
//               active={active}
//               type={type}
//               onDraw={(e) => {
//                 setActive(true);
//                 console.log('onDraw:>>',e)
//               }}
//             />
//         </Map>
//       </div>
//     </Card>
//   );
// }
// const Mount = () => (
//   <APILoader akey="1acd0b23703356a683d8b4c0c9daa645">
//     <Demo />
//     <Example />
//   </APILoader>
// );
// export default Mount;

// import { Card, Row, Col } from 'tdesign-react';
// import ReactDOM from 'react-dom';
// import React, { useState } from 'react';
// import { Map, APILoader, ScaleControl } from '@uiw/react-amap';
// const Demo = () => {
//   const [show, setShow] = useState(true);
//   return (
//     <Card>
//       <button onClick={() => setShow(!show)}>
//         {show ? '关闭' : '开启'}
//       </button>
//       <div style={{ width: '100%', height: '300px' }}>
//         <Map zoom={6}>
//           <ScaleControl
//             visible={show}
//             offset={[60, 10]}
//             position="RT"
//           />
//           {show && (
//             <ScaleControl
//               visible={show}
//               offset={[20, 10]}
//               position="RB"
//             />
//           )}
//         </Map>
//       </div>
//       </Card>
//   );
// }
// const Mount = () => (
//   <APILoader akey="1acd0b23703356a683d8b4c0c9daa645">
//     <Demo />
//   </APILoader>
// );
// export default Mount;

import { MessagePlugin, Tabs, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox } from 'tdesign-react';
import React, { useState, useEffect } from 'react';
import {
  Map,
  ScaleControl,
  ToolBarControl,
  ControlBarControl,
  Geolocation,
  Marker,
  InfoWindow,
  APILoader,
  MapTypeControl
} from '@uiw/react-amap'; // 根据您使用的包调整

const MyMap = () => {
  const [center] = useState([116.397428, 39.90923]); // 默认中心点：天安门
  const [zoom] = useState(10);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  // 添加一些示例标记点
  useEffect(() => {
    const exampleMarkers = [
      {
        position: [116.397428, 39.90923],
        title: '天安门广场',
        content: '北京市东城区天安门广场'
      },
      {
        position: [116.403847, 39.915526],
        title: '故宫博物院',
        content: '北京市东城区景山前街4号'
      },
      {
        position: [116.220287, 39.905557],
        title: '颐和园',
        content: '北京市海淀区新建宫门路19号'
      }
    ];
    setMarkers(exampleMarkers);
  }, []);
  // 地图事件处理



  // 点击地图添加标记
  const handleMapClick = (e) => {
    const newMarker = {
      id: Date.now(), // 使用时间戳作为唯一ID
      position: [e.lnglat.lng, e.lnglat.lat],
      title: `标记点 ${markers.length + 1}`,
      content: `位置: ${e.lnglat.lng.toFixed(6)}, ${e.lnglat.lat.toFixed(6)}`
    };

    setMarkers([...markers, newMarker]);
    console.log('添加了新标记:', newMarker);
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <APILoader akey="1acd0b23703356a683d8b4c0c9daa645">
        <Card>
          <Map
            zoom={zoom}
            center={center}
            style={{ width: '85%', height: 700 }}
            onClick={handleMapClick}
            // 其他地图配置
            mapStyle="amap://styles/normal" // 地图样式
            viewMode="2D" // 2D或3D
            // 启用/禁用地图功能
            dragEnable={true}
            zoomEnable={true}
            doubleClickZoom={true}
          >
            {/* 地图控件 */}
            <ScaleControl offset={[16, 30]} position="LB" />
            <ToolBarControl offset={[16, 10]} position="RB" />
            <ControlBarControl offset={[16, 180]} position="RB" />
            {/* <Geolocation
            maximumAge={100000}
            borderRadius="5px"
            position="RB"
            offset={[16, 80]}
            zoomToAccuracy={true}
            showCircle={true}
            onComplete={(data) => {
              console.log('定位成功：', data);
            }}
            onError={(error) => {
              console.log('定位失败：', error);
            }}
          /> */}
            {/* 图层控件 */}
            <MapTypeControl
              visible={true}
              offset={[30, 10]}
              position="RT"
            />
            {/* 添加标记点 */}
            {markers.map((marker, index) => (
              <Marker
                key={index}
                position={marker.position}
                title={marker.title}
                onClick={() => setSelectedMarker(marker)}
              />
            ))}
            {/* 信息窗口 */}
            {selectedMarker && (
              <InfoWindow
                position={selectedMarker.position}
                visible={true}
                onClose={() => setSelectedMarker(null)}
              >
                <div style={{
                  background: 'white',
                  padding: '10px',
                  borderRadius: '5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  minWidth: '200px',
                  fontSize: '16px' // 设置基础字体大小
                }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>
                    {selectedMarker.title}
                  </h3> 
                  <p style={{ margin: '5px 0'}}>
                    <strong>位置:</strong> {selectedMarker.position.join(', ')}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>描述:</strong> {selectedMarker.content}
                  </p>
                </div>
              </InfoWindow>
            )}
          </Map>
        </Card>
      </APILoader>
    </div>
  );
};
// 在应用中使用
const Mount = () => {
  const [mounted, setMounted] = useState(true);
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: 20 }}>
        <h1>高德地图示例</h1>
        <button
          onClick={() => setMounted(!mounted)}
          style={{ marginBottom: 20 }}
        >
          {mounted ? '隐藏地图' : '显示地图'}
        </button>
        {mounted && (
          <div style={{ width: '100%', height: 700, border: '1px solid #ddd' }}>
            <MyMap />
          </div>
        )}
      </div>
    </div>
  );
};
export default Mount;
