"use client";

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Col, Row, Spin} from 'antd';

import styles from '@/components/top/Top.module.css';
import SignInForm from '@/components/auth/SignInForm';

const background: React.CSSProperties = {
    height: '100vh',
};

const SignInPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');  // 既にログインしている場合はダッシュボードにリダイレクト
        }
    }, [user, loading, router]);

    if (loading) (
        <div style={background} className={styles.loadingWrapper}>
        <Spin />
      </div>
    )

    return (
        <>
            <div style={background} className={styles.signInUpPage}>
                <Row justify="center" style={{ paddingTop: '20vh'}}>
                    <Col
                        md={10}
                        xs={20} // 100% on smartphone
                        className={styles.animatedGradient}
                    >
                        <h2 style={{color:'#262260', fontSize:'25px', fontStyle:'bold'}}>ログイン</h2>
                        <SignInForm />
                    </Col>
                </Row>
            </div>
        </>
    );
};

export default SignInPage;
