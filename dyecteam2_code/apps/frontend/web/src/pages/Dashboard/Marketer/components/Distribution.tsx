import React from 'react';
import { Card } from 'tdesign-react';
import classnames from 'classnames';
import Style from './Distribution.module.less';

const Distribution = () => (
  <Card title='配送管理' bordered={false}className={Style.toolBar}>
    <div className={Style.toolBar}>

    </div>
  </Card>
);

export default React.memo(Distribution);