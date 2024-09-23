import React from 'react';
import { Col, Row } from 'antd';

import SignUpForm from '@/components/auth/SignUpForm';

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

const SignUpPage: React.FC = () => {
    return (
        <div style={scrollable}>
            <Row justify="center">
                <Col
                    md={10}
                    xs={20} // 100% on smartphone
                    style={areaStyle}>
                    <h2>新規登録</h2>
                    <SignUpForm />
                </Col>
            </Row>
        </div>
    );
};

export default SignUpPage;
