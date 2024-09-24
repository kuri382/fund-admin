"use client";

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';
import axios from 'axios';

interface SignInFormValues {
  email: string;
  password: string;
}

const SignInForm: React.FC = () => {
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onFinish = async ({ email, password }: SignInFormValues) => {
    setIsLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential) {
        // サーバーにトークンを送信してセッションを開始
        //const token = await user.getIdToken();
        //await axios.post('/api/auth/set-token', { token });
        // ダッシュボードにリダイレクト
        router.push('/dashboard');
      }

    } catch (error: any) {
      setError('ログインに失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
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
