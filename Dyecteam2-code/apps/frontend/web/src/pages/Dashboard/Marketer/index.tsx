import Orders from './components/Orders';
// import Distribution from './components/Distribution';
// import MapDraw from './components/map';
// import Mount from './components/mapb';
// import PolygonDrawert from './components/mapcontainer';
import MapWalkingRouteExample from './components/MapWalkingRoute';
import React, { memo } from 'react';
// import OrderTableWithButtons from './components/new';

const Marketer = () => (
  <div style={{ overflowX: 'hidden' }}>
    <Orders />
   {/* <Distribution/>
    <OrderTableWithButtons/>
    <Mount/>
    <PolygonDrawert
    mapKey="1acd0b23703356a683d8b4c0c9daa645&plugin=AMap.MouseTool"
    containerStyle={{ width: '800px', height: '600px', border: '1px solid #ddd' }}/> */}
    {/* <MapWalkingRouteExample/> */}
  </div>
);

export default memo(Marketer);