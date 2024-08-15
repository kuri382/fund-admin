"use client"

import { Card, Avatar, Row, Col, Typography } from 'antd'

const { Title, Paragraph } = Typography

const keyPersons = [
    {
        name: '山田太郎',
        title: 'テックイノベーション株式会社 CEO',
        description: 'AIとロボティクスの分野で20年以上の経験を持つ。複数のテクノロジースタートアップを成功に導いた実績あり。',
        avatar: 'images/avatar01.png'
    },
    // ... 他のキーパーソンのデータ
]

export default function KeyPersons() {
    return (
        <Row gutter={[16, 16]}>
            {keyPersons.map((person, index) => (
                <Col span={8} key={index}>
                    <Card>
                        <Avatar size={64} src={person.avatar} style={{ display: 'block', margin: '0 auto' }} />
                        <Title level={4} style={{ textAlign: 'center', marginTop: '10px' }}>{person.name}</Title>
                        <Paragraph type="secondary" style={{ textAlign: 'center' }}>{person.title}</Paragraph>
                        <Paragraph>{person.description}</Paragraph>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}