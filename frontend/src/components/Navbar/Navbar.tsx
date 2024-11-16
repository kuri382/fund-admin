"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Menu, Button } from 'antd';
import type { MenuProps } from 'antd';

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

  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      label: <a href="/">ホーム</a>,
    },
    /* 必要に応じて表示する
    {
      key: 'business plan',
      label: <a href="/plan">事業計画書</a>,
    },
    {
      key: 'about',
      label: <a href="/about">About</a>,
    },
    */
    {
      key: 'logout',
      label: (
        <Button type="primary" onClick={handleLogout}>
          ログアウト
        </Button>
      ),
    },
  ];

  return (
    <Menu
      mode="horizontal"
      items={menuItems}
    />
  );
};

export default Navbar;
