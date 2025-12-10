import { Card } from 'tdesign-react';
import RoutePlanning from './component/mapwalking';

// import Distribution from './components/Distribution';
// import MapDraw from './components/map';
// import Mount from './components/mapb';
// import PolygonDrawert from './components/mapcontainer';
// import MapWalkingRouteExample from './components/MapWalkingRoute';
import React, { memo } from 'react';
// import OrderTableWithButtons from './components/new';

const mapwalking = () => (
    <Card>
      <RoutePlanning endLngLat={[116.427281, 39.903719]}/>

    </Card>

);

export default memo(mapwalking);