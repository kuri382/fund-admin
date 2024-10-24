"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Menu, Button } from 'antd';

const Navbar: React.FC = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Firebaseからログアウト
      await signOut(auth);

      // localStorageからaccessTokenを削除
      localStorage.removeItem('accessToken');

      // ログインページにリダイレクト
      router.push('/signin');
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
    }
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
