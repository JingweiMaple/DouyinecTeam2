import AMapLoader from '@amap/amap-jsapi-loader';
import React, { Component } from 'react';
import style from "./mapContainer.module.less";
import { MessagePlugin, Tabs, Table, Tag, Row, Col, Button, Input, Card, Popup, SortInfo, TableSort, Checkbox } from 'tdesign-react';
class  MapComponent extends Component{
  constructor(){
    super();      
    this.map = null;
  }
  // 2.dom渲染成功后进行map对象的创建
  componentDidMount(){
    window._AMapSecurityConfig = {
      securityJsCode: "6094dad2a7674771b5b64ae9773a64fa",
    };
    AMapLoader.load({
      key:"1acd0b23703356a683d8b4c0c9daa645",                     // 申请好的Web端开发者Key，首次调用 load 时必填
      version:"2.0",              // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
      plugins:["AMap.Scale"],     //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
    }).then((AMap)=>{
      this.map = new AMap.Map("container",{ //设置地图容器id
        viewMode:"3D",         //是否为3D地图模式
        zoom:5,                //初始化地图级别
        center:[105.602725,37.076636], //初始化地图中心点位置
      });
    }).catch(e=>{
      console.log(e);
    })
  }
  render(){
      // 1.初始化创建地图容器,div标签作为地图容器，同时为该div指定id属性；
      return (
        <div id="container" className={style.container} style={{ height: '800px' }} > 
        </div>
    );
  }
}
//导出地图组建类
export default MapComponent;