"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Button } from 'antd';

const Navbar: React.FC = () => {
  const router = useRouter();

  // ログアウト処理
  const handleLogout = () => {
    // localStorageからaccessTokenを削除
    localStorage.removeItem('accessToken');

    // ログインページにリダイレクト
    router.push('/signin');
  };

  return (
    <Menu mode="horizontal">
      <Menu.Item key="home">
        <a href="/">ホーム</a>
      </Menu.Item>
      {/*<Menu.Item key="about">
        <a href="/about">About</a>
      </Menu.Item>
  */}

      {/* ログアウトボタン */}
      <Menu.Item key="logout">
        <Button type="primary" onClick={handleLogout}>
          ログアウト
        </Button>
      </Menu.Item>
    </Menu>
  );
};

export default Navbar;
