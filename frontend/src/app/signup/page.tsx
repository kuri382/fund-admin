import React from 'react';
import { Col, Row } from 'antd';

import styles from '@/components/top/Top.module.css';
import SignUpForm from '@/components/auth/SignUpForm';

const background: React.CSSProperties = {
    height: '100vh',
};

const SignUpPage: React.FC = () => {
    return (
        <div style={background} className={styles.signInUpPage}>
            <Row justify="center" style={{ paddingTop: '20vh'}}>
                <Col
                    md={10}
                    xs={20} // 100% on smartphone
                    className={styles.animatedGradient}
                >
                    <h2 style={{ color: '#262260', fontSize: '25px', fontStyle: 'bold' }}>新規登録</h2>
                    <SignUpForm />
                </Col>
            </Row>
        </div>
    );
};

export default SignUpPage;
