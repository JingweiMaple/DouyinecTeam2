import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, MessagePlugin, Notification } from 'tdesign-react';
import Style from './mapcontainer.module.less';
import { TreeSelect } from 'tdesign-react';
import { options } from './consts';




const Provcity = (): React.ReactElement => {
    const [value, setValue] = useState(['guangzhou', 'shenzhen']);
      const handleClick = (event: any) => {
    console.log('配送范围已设置:', event.obj);
    MessagePlugin.success('配送范围修改完成');
  };
    return (
        <Card title='城市选择' bordered={false} >
            <TreeSelect
                data={options}
                clearable
                multiple
                placeholder="请选择"
                value={value}
                        minCollapsedNum={10}
                onChange={(val: string[]) => {
                    setValue(val);
                    console.log(val);
                }}
                style={{ width: 600 }}
                className={Style.container}
            />
            <div><Button onClick={handleClick}>确定</Button></div>
            


        </Card>
    );
};
export default React.memo(Provcity);