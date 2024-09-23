"use client";

import React from 'react';
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

const SignInPage = () => (
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

export default SignInPage;
