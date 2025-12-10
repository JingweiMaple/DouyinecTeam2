// import React from 'react';
// import { Map, MouseTool } from '@uiw/react-amap';

// const MapDraw = () => {
//   const [tool, setTool] = React.useState(null);
//   const [message, setMessage] = React.useState('点击按钮开始绘制');

//   const toolEvents = {
//     onCreated: (t) => setTool(t),
//     onDraw: (obj) => {
//       if (obj.CLASS_NAME === 'AMap.Marker') {
//         setMessage('绘制了一个标记点');
//       } else if (obj.CLASS_NAME === 'AMap.Polygon') {
//         setMessage('绘制了一个多边形');
//       }
//     }
//   };

//   const mapPlugins = ['ToolBar']; // 注意：在 @uiw/react-amap 中，插件可能是以字符串数组形式传入

//   return (
//     <div style={{ width: '100%', height: '100vh' }}>
//       <Map 
//         ak="你的高德地图API Key" 
//         center={[116.397428, 39.90923]} 
//         zoom={10}
//         plugins={mapPlugins}
//         style={{ width: '100%', height: '80%' }}
//       >
//         <MouseTool events={toolEvents} />
//       </Map>
      
//       <div style={{ padding: '20px' }}>
//         <button onClick={() => tool && tool.marker()}>绘制标记</button>
//         <button onClick={() => tool && tool.polygon()}>绘制多边形</button>
//         <p>{message}</p>
//       </div>
//     </div>
//   );
// };

// export default MapDraw;

// import { Map, MouseTool } from '@uiw/react-amap';
// import ReactDOM from 'react-dom';
// import React, { useState, useRef } from 'react';


// const layerStyle = {
//   padding: '10px',
//   background: '#fff',
//   border: '1px solid #ddd',
//   borderRadius: '4px',
//   position: 'absolute',
//   top: '10px',
//   left: '10px'
// };

// class MapDraw extends React.Component {
//   constructor(props) {
//     super(props);
//     const self = this;
//     this.state = {
//       what: '点击下方按钮开始绘制'
//     };
//     this.toolEvents = {
//       created: (tool) => {
//         console.log(tool);
//         self.tool = tool;
//       },
//       draw: ({ obj }) => {
//         self.drawWhat(obj);
//       }
//     };
//     this.mapPlugins = ['ToolBar'];
//     this.mapCenter = { longitude: 120, latitude: 35 };
//   }

//   drawWhat(obj) {
//     let text = '';
//     switch (obj.CLASS_NAME) {
//       case 'AMap.Marker':
//         text = `你绘制了一个标记，坐标位置是 {${obj.getPosition()}}`;
//         break;
//       case 'AMap.Polygon':
//         text = `你绘制了一个多边形，有${obj.getPath().length}个端点`;
//         break;
//       case 'AMap.Circle':
//         text = `你绘制了一个圆形，圆心位置为{${obj.getCenter()}}`;
//         break;
//       default:
//         text = '';
//     }
//     this.setState({
//       what: text
//     });
//   }

//   drawCircle() {
//     if (this.tool) {
//       this.tool.circle();
//       this.setState({
//         what: '准备绘制圆形'
//       });
//     }
//   }

//   drawRectangle() {
//     if (this.tool) {
//       this.tool.rectangle();
//       this.setState({
//         what: '准备绘制多边形（矩形）'
//       });
//     }
//   }

//   drawMarker() {
//     if (this.tool) {
//       this.tool.marker();
//       this.setState({
//         what: '准备绘制坐标点'
//       });
//     }
//   }

//   drawPolygon() {
//     if (this.tool) {
//       this.tool.polygon();
//       this.setState({
//         what: '准备绘制多边形'
//       });
//     }
//   }

//   close() {
//     if (this.tool) {
//       this.tool.close();
//     }
//     this.setState({
//       what: '关闭了鼠标工具'
//     });
//   }

//   render() {
//     return (
//       <div>
//         <div style={{ width: '100%', height: 370 }}>
//           <Map plugins={this.mapPlugins} center={[116.400274, 39.905812]} dragEnable={false} >
//             <MouseTool events={this.toolEvents} />
//           </Map>
//         </div>
//         <button onClick={() => { this.drawMarker(); }}>Draw Marker</button>
//         <button onClick={() => { this.drawRectangle(); }}>Draw Rectangle</button>
//         <button onClick={() => { this.drawCircle(); }}>Draw Circle</button>
//         <button onClick={() => { this.drawPolygon(); }}>Draw Polygon</button>
//         <button onClick={() => { this.close(); }}>Close</button>
//       </div>
//     );
//   }
// }
// export default MapDraw;

// import React, { useState, useRef, useEffect } from 'react';
// import { Map, MouseTool } from '@uiw/react-amap';

// const MapDraw = () => {
//   const [what, setWhat] = useState('点击下方按钮开始绘制');
//   const [mapCenter] = useState( [116.400274, 39.905812] );
//   const [mapZoom] = useState(10);
//   const toolRef = useRef(null);
//   const mapPlugins = ['ToolBar'];

//   // 工具创建时的回调
//   const handleToolCreated = (tool) => {
//     console.log('工具已创建:', tool);
//     toolRef.current = tool;
//   };

//   // 绘制完成的回调
//   const handleDraw = ({ obj }) => {
//     let text = '';
    
//     switch (obj.CLASS_NAME) {
//       case 'AMap.Marker':
//         const markerPos = obj.getPosition();
//         text = `你绘制了一个标记，坐标位置是 {经度:${markerPos.getLng()}, 纬度:${markerPos.getLat()}}`;
//         break;
//       case 'AMap.Polygon':
//         const path = obj.getPath();
//         text = `你绘制了一个多边形，有 ${path.length} 个端点`;
//         break;
//       case 'AMap.Circle':
//         const center = obj.getCenter();
//         text = `你绘制了一个圆形，圆心位置为 {经度:${center.getLng()}, 纬度:${center.getLat()}}`;
//         break;
//       case 'AMap.Rectangle':
//         const bounds = obj.getBounds();
//         text = `你绘制了一个矩形，西北角: {${bounds.north}}, 东南角: {${bounds.east}}`;
//         break;
//       default:
//         text = `绘制了未知图形: ${obj.CLASS_NAME}`;
//     }
    
//     setWhat(text);
//   };

//   // 各种绘制方法
//   const drawMarker = () => {
//     if (toolRef.current) {
//       // toolRef.current.marker();
//       setWhat('准备绘制坐标点 - 点击地图放置标记');
//     }
//     else setWhat('准备绘制坐标点 - 点击地图放置标记');
//   };

//   const drawRectangle = () => {
//     if (toolRef.current) {
//       toolRef.current.rectangle();
//       setWhat('准备绘制矩形 - 点击并拖动绘制矩形');
//     }
//   };

//   const drawCircle = () => {
//     if (toolRef.current) {
//       toolRef.current.circle();
//       setWhat('准备绘制圆形 - 点击确定圆心，拖动确定半径');
//     }
//   };

//   const drawPolygon = () => {
//     if (toolRef.current) {
//       toolRef.current.polygon();
//       setWhat('准备绘制多边形 - 点击添加顶点，双击完成绘制');
//     }
//   };

//   const closeTool = () => {
//     if (toolRef.current) {
//       toolRef.current.close();
//     }
//     setWhat('关闭了鼠标工具');
//   };

//   const clearDrawings = () => {
//     // 这里需要实现清除绘制的逻辑
//     // 可能需要通过地图实例清除所有覆盖物
//     setWhat('已清除所有绘制');
//   };

//   // 导出绘制的数据
//   const exportData = () => {
//     // 实现导出绘制数据的逻辑
//     alert('导出功能待实现');
//   };

//   return (
//     <div className="app-container">
//       <h1 className="title">高德地图绘制工具</h1>
      
//       <div className="map-container">
//         <Map
//           plugins={mapPlugins}
//           center={mapCenter}
//           zoom={mapZoom}
//           style={{ width: '100%', height: '500px' }}
//         >
//           <MouseTool
//             events={{
//               created: handleToolCreated,
//               draw: handleDraw
//             }}
//           />
//           <div className="info-panel">{what}</div>
//         </Map>
//       </div>
      
//       <div className="toolbar">
//         <div className="draw-buttons">
//           <button className="btn btn-primary" onClick={drawMarker}>
//             绘制标记
//           </button>
//           <button className="btn btn-primary" onClick={drawRectangle}>
//             绘制矩形
//           </button>
//           <button className="btn btn-primary" onClick={drawCircle}>
//             绘制圆形
//           </button>
//           <button className="btn btn-primary" onClick={drawPolygon}>
//             绘制多边形
//           </button>
//         </div>
        
//         <div className="action-buttons">
//           <button className="btn btn-secondary" onClick={closeTool}>
//             关闭工具
//           </button>
//           <button className="btn btn-warning" onClick={clearDrawings}>
//             清除绘制
//           </button>
//           <button className="btn btn-success" onClick={exportData}>
//             导出数据
//           </button>
//         </div>
//       </div>
      
//       <div className="instructions">
//         <h3>使用说明：</h3>
//         <ul>
//           <li>1. 点击上方按钮选择要绘制的图形类型</li>
//           <li>2. 在地图上点击/拖动进行绘制</li>
//           <li>3. 双击完成多边形绘制</li>
//           <li>4. 使用"关闭工具"结束当前绘制模式</li>
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default MapDraw;
import React, { useEffect, useRef } from 'react';
import { Map, useMap } from '@uiw/react-amap';
declare const AMap: any;
const CustomMouseTool = ({ onCreated, onDraw }) => {
  const { map } = useMap();
  const mouseToolRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // 手动创建高德原生 MouseTool
    mouseToolRef.current = new AMap.MouseTool(map);
    
    console.log('手动创建的MouseTool:', mouseToolRef.current);
    
    // 触发自定义的 created 事件
    if (onCreated) {
      onCreated(mouseToolRef.current);
    }

    // 监听绘制事件
    mouseToolRef.current.on('draw', (event) => {
      console.log('手动监听到draw事件:', event);
      if (onDraw) {
        onDraw(event);
      }
    });

    // 清理函数
    return () => {
      if (mouseToolRef.current) {
        mouseToolRef.current.close();
        mouseToolRef.current = null;
      }
    };
  }, [map, onCreated, onDraw]);

  return null; // 这个组件不渲染任何内容
};

// 使用示例
const MapDraw = () => {
  const handleToolCreated = (tool) => {
    console.log('✅ 工具已创建 (手动方式):', tool);
    // 现在可以使用工具了
    // tool.marker();
  };

  const handleDraw = (event) => {
    console.log('绘制完成:', event);
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Map center={[ 116.397428, 39.90923 ]} zoom={13}>
        <CustomMouseTool 
          onCreated={handleToolCreated}
          onDraw={handleDraw}
        />
      </Map>
    </div>
  );
};
export default MapDraw;