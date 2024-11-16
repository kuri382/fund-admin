"use client";

import React from 'react';
import { Image, Col, Row, Button, Space, Layout } from 'antd';
import { useRouter } from 'next/navigation';

const { Content } = Layout;

const rowStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '50px 50px',
    width: '100vw',
    margin: "0 auto",
    display: "flex",
    /*maxWidth: "1200px",*/
};

const textColStyle: React.CSSProperties = {
    verticalAlign: 'middle',
    textAlign: 'left',
    /*padding: '20px 0px',*/
};

const imgColStyle: React.CSSProperties = {
    verticalAlign: 'middle',
};

const mainTitleStyle: React.CSSProperties = {
    fontSize: '28px',
    lineHeight: '34px',
    color: '#146C94',
    margin:'0'
};

const subTitleStyle: React.CSSProperties = {
    fontSize: '22px',
    lineHeight: '30px',
    color: '#425164'
};

const backgroundGradationStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(175deg, #F5F5F5 75%, rgba(20, 20, 21, 0.8) 11.8%, \
    rgba(176, 60, 196, 0.6) 23.6%, rgba(92, 55, 173, 0.4) 35.4%, rgba(217, 46, 116, 0) 59%), \
    radial-gradient(100% 100% at 10% 100%, #fdd575 0%, #fcc06a 8.29%, #fbaa63 28.57%, \
        #f99262 42.86%, #f77868 57.14%, #f55973 71.43%, #636bb7 88%, #146C94 100%)'
};


const discriptionStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '20px',
    color: '#9D9D9D'
};

const buttonArea: React.CSSProperties = {
    textAlign: 'center'
};

const mainButton: React.CSSProperties = {
    height: '50px',
    minWidth: '250px',
    lineHeight: '25px',
    borderRadius: '50px',
    padding: '10px 50px',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: '#F3950D',
    color: 'white',
    boxShadow: 'none',
};


const inquiryButton: React.CSSProperties = {
    height: '50px',
    minWidth: '250px',
    lineHeight: '25px',
    borderRadius: '50px',
    padding: '10px 50px',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: '#D8D8D8',
    color: '#27374D',
    boxShadow: 'none',
};


const Top: React.FC = () => {
    const router = useRouter();

    const moveToSignUp = () => {
        router.push('/signup');
    };

    const moveToSignIn = () => {
        router.push('/signin');
    };

    return (
        <>
            <Content style={backgroundGradationStyle}>

                <Row style={rowStyle} justify="center" align="middle">

                    <Col
                        xs={{ span: 24 }}
                        sm={{ span: 24 }}
                        md={{ span: 12 }}
                        style={textColStyle}
                    >
                        <h1 style={mainTitleStyle}>
                            Granite
                        </h1>
                            <h2 style={subTitleStyle}>Business Due Diligence</h2>
                        <div style={discriptionStyle}>
                            <p>β版</p>
                        </div>
                        <br />

                        <Space wrap style={buttonArea}>
                            <Button style={mainButton} type="primary" onClick={moveToSignUp}>新規登録</Button>
                            <Button style={inquiryButton} type="primary" onClick={moveToSignIn}>ログイン</Button>
                        </Space>

                    </Col>
                    <Col
                        xs={{ span: 24 }}
                        sm={{ span: 20 }}
                        md={{ span: 12 }}
                        style={imgColStyle}
                    >
                        <Space style={{ verticalAlign: 'middle', padding: '20px 0' }}>
                            <Image
                                src="./top/hero.png"
                                width={"30%"}
                                alt=""
                                preview={false}
                            />
                        </Space>
                    </Col>
                </Row>
            </Content>
        </>
    );
};

export default Top;