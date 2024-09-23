"use client";

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';

interface SignUpFormValues {
  email: string;
  password: string;
}

const SignUpForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onFinish = async ({ email, password }: SignUpFormValues) => {
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/signup-complete'); // サインアップ完了後に完了ページへリダイレクト
    } catch (error: any) {
      setError('サインアップに失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form name="signup" onFinish={onFinish}>
      <Form.Item
        name="email"
        rules={[{ required: true, message: 'メールアドレスを入力してください' }]}
      >
        <Input placeholder="メールアドレス" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'パスワードを入力してください', min: 6 }]} // 最低6文字のパスワード
      >
        <Input.Password placeholder="パスワード" />
      </Form.Item>
      {error && <p>{error}</p>} {/* エラーがある場合に表示 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          サインアップ
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignUpForm;
