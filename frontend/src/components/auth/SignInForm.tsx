"use client";

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';

interface SignInFormValues {
  email: string;
  password: string;
}

const SignInForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onFinish = async ({ email, password }: SignInFormValues) => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(); // Firebaseのアクセストークンを取得
        localStorage.setItem('token', token); // トークンを保存（セキュリティに注意）
        router.push('/dashboard'); // ダッシュボードにリダイレクト
      }
    } catch (error: any) {
      setError('ログインに失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form name="signin" onFinish={onFinish}>
      <Form.Item
        name="email"
        rules={[{ required: true, message: 'メールアドレスを入力してください' }]}
      >
        <Input placeholder="メールアドレス" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'パスワードを入力してください' }]}
      >
        <Input.Password placeholder="パスワード" />
      </Form.Item>
      {error && <p>{error}</p>}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          ログイン
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignInForm;
