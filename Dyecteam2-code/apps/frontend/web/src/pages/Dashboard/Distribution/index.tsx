import Manage from './components/Manage';

import React, { memo } from 'react';

const Distribution = () => (
  <div style={{ overflowX: 'hidden' }}>

    <Manage/>

  </div>
);

export default memo(Distribution);