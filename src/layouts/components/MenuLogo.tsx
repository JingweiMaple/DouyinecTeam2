import React, { memo } from 'react';
import Style from './Menu.module.less';
// import FullLogo from 'assets/svg/assets-logo-full.svg?component';
// import MiniLogo from 'assets/svg/assets-t-logo.svg?component';
import DouyinLogo from 'assets/image/douyin-logo.png';
import { useNavigate } from 'react-router-dom';

interface IProps {
  collapsed?: boolean;
}

export default memo((props: IProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/');
  };

  return (
    <div className={Style.menuLogo} onClick={handleClick}>
      {/* 展开和收起时，用不同高度显示同一张图 */}
      <img
        src={DouyinLogo}
        alt='抖音电商'
        style={{
          height: props.collapsed ? 24 : 32, // 收起小一点，展开大一点
          cursor: 'pointer',
        }}
      />
    </div>
  );
});
