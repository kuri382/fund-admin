"use client"

import { Layout, Button, Typography, Row, Col } from 'antd';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import styles from './Top.module.css';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const Home = () => {
    const router = useRouter();

    const moveToSignUp = () => {
        router.push('/signup');
    };

    const moveToSignIn = () => {
        router.push('/signin');
    };

    return (
        <Layout style={{
            margin: 0,
            padding: 0, // 内側の余白を削除
            width: '100%', // フル幅を指定
        }}>
            <Head>
                <title>Granite - Business Due Diligence</title>
                <meta name="description" content="Granite: Streamline your business due diligence process." />
            </Head>

            <Header
                style={{
                    position: 'fixed', // フローティング
                    top: 0,
                    left: 0,
                    zIndex: 1000, // 他の要素より前面に配置
                    width: '100%', // フル幅
                    background: 'rgba(0, 0, 0, 0.5)', // 半透明背景
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 20px',
                }}
            >
                <Title level={3} style={{ color: 'white', margin: 0 }}>
                    Granite
                </Title>
                {/*
                <div>
                    <Button type="default" className={`${styles.ctaButton} ${styles.secondaryButton}`} style={{ marginRight: '10px' }}>Log In</Button>
                    <Button type="primary" className={`${styles.ctaButton} ${styles.secondaryButton}`}>Sign Up</Button>
                </div>
                 */}
            </Header>

            <Content className={styles.heroSection} >
                {/* Hero Section */}
                <Row justify="center" align="middle" style={{ minHeight: '70vh', textAlign: 'center' }}>
                    <Col span={24}>
                        <Title className={styles.heroTitle} style={{ color: 'white', fontSize: '3rem' }}>
                            Streamline Your Business Due Diligence
                        </Title>
                        <Paragraph className={styles.heroSub} style={{ fontSize: '1.3rem', color: 'white', marginBottom: '40px' }}>
                            Discover an efficient way to structure data, validate insights,
                            <br />and project business outcomes with Granite.
                        </Paragraph>

                        <Button type="primary" size="large" className={styles.ctaButton} onClick={moveToSignUp}>
                            新規登録
                        </Button>
                        <Button size="large" className={`${styles.ctaButton} ${styles.secondaryButton}`} onClick={moveToSignIn}>
                            ログイン
                        </Button>

                    </Col>
                </Row>
            </Content>

            {/* Service Description Section */}
            <Footer style={{ textAlign: 'center', backgroundColor: '#001529', color: 'white' }}>
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <Title level={4} style={{ color: 'white' }}>Data Structuring</Title>
                        <Paragraph style={{ color: 'white' }}>
                            ファイルをアップロードするだけで、データを自動で整理。
                        </Paragraph>
                    </Col>
                    <Col span={8}>
                        <Title level={4} style={{ color: 'white' }}>Business Modeling</Title>
                        <Paragraph style={{ color: 'white' }}>
                            ファイル情報から瞬時に事業計画・モデリングを作成。
                        </Paragraph>
                    </Col>
                    <Col span={8}>
                        <Title level={4} style={{ color: 'white' }}>Advanced Analytics</Title>
                        <Paragraph style={{ color: 'white' }}>
                            他社とのKPI比較や最新ニュースの取得など、追加の情報調査も可能。
                        </Paragraph>
                    </Col>
                </Row>
                <Paragraph style={{ marginTop: '50px', color: 'white' }}>© 2024 Granite. All Rights Reserved.</Paragraph>
            </Footer>
        </Layout>
    );
};

export default Home;
