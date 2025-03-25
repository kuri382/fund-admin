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
        // const token = await user.getIdToken();
        // await axios.post('/api/auth/set-token', { token });

        // ダッシュボードにリダイレクト
        await router.push('/dashboard');  // 画面遷移が完了するまで待機
      }

    } catch (error: any) {
      setError('ログインに失敗しました: ' + error.message);
    };
  };

  return (
    <Form name="signin" onFinish={onFinish} >
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
        <Button
          block
          type="default"
          htmlType="submit"
          loading={loading}
          disabled={loading}>
          {loading ? '読み込み中' : 'ログイン'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignInForm;
