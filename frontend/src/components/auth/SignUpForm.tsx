"use client"
import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';

interface SignUpFormValues {
  email: string;
  password: string;
}

// Firebase Authエラーコード => 日本語メッセージのマッピング
const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に使われています。';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/weak-password':
      return 'パスワードが短すぎます。もう少し複雑なパスワードを設定してください。';
    default:
      return 'サインアップに失敗しました。お手数ですが管理者に連絡してください。';
  }
};

const SignUpForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onFinish = async ({ email, password }: SignUpFormValues) => {
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/signup-complete');
    } catch (error: any) {
      const errorCode = error.code || '';
      const friendlyMessage = getAuthErrorMessage(errorCode);
      setError(friendlyMessage);
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
        rules={[{ required: true, message: 'パスワードを入力してください', min: 6 }]}
      >
        <Input.Password placeholder="パスワード" />
      </Form.Item>
      {error && <p style={{ color: 'white' }}>{error}</p>} {/* エラーがある場合に表示 */}
      <Form.Item>
        <Button type="default" htmlType="submit" loading={loading} block>
          登録
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignUpForm;
