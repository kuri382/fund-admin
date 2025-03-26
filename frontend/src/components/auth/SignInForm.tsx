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
      // 1. Firebase Auth でログイン
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential) {
        router.push('/dashboard');
      }

    } catch (error: any) {
      setError('ログインに失敗しました');
      setIsLoading(false);
    };
  };

  return (
    <Form
      name="signin"
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        name="email"
        label={<label style={{ color: "#262260" }}><b>email</b></label>}
        rules={[{ required: true, message: 'メールアドレスを入力してください' }]}
      >
        <Input placeholder="メールアドレス" />
      </Form.Item>

      <Form.Item
        name="password"
        label={<label style={{ color: "#262260" }}><b>password</b></label>}
        rules={[{ required: true, message: 'パスワードを入力してください' }]}
      >
        <Input.Password placeholder="パスワード" />
      </Form.Item>

      {error && <p style={{ color: 'white' }}>{error}</p>}

      <Form.Item>
        <Button block type="default" htmlType="submit" loading={loading}>
          <div style={{ color: "#262260" }}>
            {loading ? '読み込み中...' : 'ログイン'}
          </div>
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignInForm;
