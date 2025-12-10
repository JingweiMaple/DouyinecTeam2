import React from 'react';
import { Card, Col, Row, Tabs } from 'tdesign-react';
import classnames from 'classnames';
import Style from './Manage.module.less';
import TabPanel from 'tdesign-react/es/tabs/TabPanel';
import PolygonDrawert from './mapcontainer';
import  Provcity from './provcity';
const Manage = (): React.ReactElement => {

    return (
        <Card title='配送范围' bordered={false} className={Style.toolBar}>

            <Tabs placement='top' size='medium' defaultValue='all'>
                <TabPanel value='all' label='按省份/城市勾选'>
            <Provcity/>
                </TabPanel>
                <TabPanel value='0' label='按地图勾选'>
                    <PolygonDrawert 
                        containerStyle={{ height: '600px', border: '1px solid #ddd' }} />
                </TabPanel>
            </Tabs>

        </Card>
    );
};


export default React.memo(Manage);