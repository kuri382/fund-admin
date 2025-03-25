"use client"
import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { auth } from '@/services/firebase';
import { apiUrlPostAuthInvitationCheck } from "@/utils/api";

interface SignUpFormValues {
  email: string;
  password: string;
  invitationCode: string;
}

const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に使われています';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません';
    case 'auth/weak-password':
      return 'パスワードが短すぎます。もう少し複雑なパスワードを設定してください';
    default:
      return '招待コードが違っています';
  }
};

const SignUpForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onFinish = async ({ email, password, invitationCode }: SignUpFormValues) => {
    setLoading(true);
    setError('');

    let tempUser = null; // 招待コード検証失敗時にユーザーを削除するために利用

    try {
      // 1. Firebase Auth でユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      tempUser = userCredential.user;

      // 2. ユーザー作成成功後にトークンを取得
      const token = await userCredential.user.getIdToken();

      // 3. サーバーで招待コードを検証
      await axios.post(
        apiUrlPostAuthInvitationCheck,
        { invitationCode },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status === 200,
        }
      );

      // 4. 招待コード検証が成功すれば完了画面へ遷移
      router.push('/signup-complete');

    } catch (err: any) {
      if (tempUser) {
        await deleteUser(tempUser).catch((e) => {
          console.error('ユーザー削除に失敗しました:', e);
        });
      }

      // Firebase Auth のエラーの場合
      if (err.code) {
        const friendlyMessage = getAuthErrorMessage(err.code);
        setError(friendlyMessage);
        setLoading(false)
        return;
      }

      if (err.response?.status === 400) {
        // 招待コードエラー時
        setError('招待コードが間違っています');
        setLoading(false)
      } else if (err.response) {
        // 400以外の他のエラー (401,403,500など)
        setError('サインアップまたは招待コードの確認に失敗しました。');
        setLoading(false)
      }
    }
  };

  return (
    <Form
      name="signup"
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
        rules={[
          { required: true, message: 'パスワードを入力してください' },
          { min: 6, message: 'パスワードは6文字以上を推奨しています' },
        ]}
      >
        <Input.Password placeholder="パスワード" />
      </Form.Item>

      {/* 招待コードが必須の場合は required を true に */}
      <Form.Item
        name="invitationCode"
        label={<label style={{ color: "#262260" }}><b>招待コード</b></label>}
        rules={[{ required: true, message: '招待コードを入力してください' }]}
        normalize={(value) => (value ? value.toUpperCase() : '')}
      >
        <Input placeholder="招待コード" />
      </Form.Item>

      {error && <p style={{ color: 'white' }}>{error}</p>}

      <Form.Item>
        <Button type="default" htmlType="submit" loading={loading} block>
          登録
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignUpForm;
