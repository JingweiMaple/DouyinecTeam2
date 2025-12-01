import Orders from './components/Orders';
import Distribution from './components/Distribution';
import BaiduMapGL from './components/map';
import Mount from './components/mapb';
import MapComponent from './components/mapcontainer';

import React, { memo } from 'react';

const Marketer = () => (
  <div style={{ overflowX: 'hidden' }}>
    <Orders />
    {/* <BaiduMapGL/> */}
    {/* <Distribution/> */}
    <Mount/>
  </div>
);

export default memo(Marketer);