import React from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const SignUpCompletePage: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
            <h1 style={{ marginTop: '20px' }}>サインアップが完了しました！</h1>
            <p style={{ marginTop: '10px', fontSize: '16px', color: '#888' }}>
                登録が完了しました。ログイン画面からサインインしてください。
            </p>
            <Link href="/signin">
                <Button type="primary" size="large" style={{ marginTop: '20px' }}>
                    ログインページへ
                </Button>
            </Link>
        </div>
    );
};

export default SignUpCompletePage;
