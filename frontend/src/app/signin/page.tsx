"use client";

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Col, Row } from 'antd';

import SignInForm from '@/components/auth/SignInForm';

const areaStyle: React.CSSProperties = {
    margin: '20px',
    padding: '30px',
    backgroundColor: '#efefef',
    textAlign: 'center',
    borderRadius: '10px',
};

const scrollable: React.CSSProperties = {
    maxHeight: '700px',
    overflowY: 'auto'
};

const SignInPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');  // 既にログインしている場合はダッシュボードにリダイレクト
        }
    }, [user, loading, router]);

    if (loading) {
        return <p>読み込み中...</p>;  // 認証状態の確認中は読み込み表示
    }

    return (
        <>
            <div style={scrollable}>
                <Row justify="center">
                    <Col
                        md={10}
                        xs={20} // 100% on smartphone
                        style={areaStyle}>
                        <h2>ログイン</h2>
                        <SignInForm />
                    </Col>
                </Row>
            </div>
        </>
    );
};

export default SignInPage;
