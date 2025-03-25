import React from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

import styles from '@/components/top/Top.module.css';

const SignUpCompletePage: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '30vh', height:'100%'}} className={styles.fullImageBackground}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: 'white' }} />
            <h1 style={{ marginTop: '20px', color: 'white'}}>Welcome to Granite</h1>
            <p style={{ marginTop: '10px', fontSize: '16px', color: 'white' }}>
                登録が完了しました。ログインをお願いします。
            </p>
            <Link href="/signin">
                <Button type="default" size="large" style={{ marginTop: '20px' }}>
                    ログインページへ
                </Button>
            </Link>
        </div>
    );
};

export default SignUpCompletePage;
