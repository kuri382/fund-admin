import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthenticated(false); // トークンが存在しない場合にも状態を更新
      router.push('/signin');
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  if (authenticated === null) {
    return <Spin size="large" />; // 認証状態の確認中はスピナーを表示
  }

  return authenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
