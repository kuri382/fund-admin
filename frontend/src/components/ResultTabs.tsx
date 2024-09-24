"use client"

import { Tabs, Card, Button } from 'antd'
import KeyPersons from './KeyPersons'

const { TabPane } = Tabs

export default function ResultTabs() {
    return (
        <Card style={{ marginTop: '20px' }}>
            <Tabs defaultActiveKey="summary">
                <TabPane tab="エグゼクティブサマリー" key="summary">
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box" />
                </TabPane>
                <TabPane tab="財務状況" key="financialStatus">
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button type="primary" style={{ marginRight: '10px' }}>財務状況スプレッドシート</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box" />
                </TabPane>
                <TabPane tab="市場の状況" key="marketStatus">
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box" />
                </TabPane>
                <TabPane tab="各種事業（サービス）の状況" key="servicesStatus">
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合サービスの情報確認</Button>
                    <div className="result-box" />
                </TabPane>
                <TabPane tab="会社の強み" key="strongPoint">
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合サービスの情報確認</Button>
                    <div className="result-box" />
                </TabPane>
                <TabPane tab="業界のキーパーソン" key="keyPersons">
                    <KeyPersons />
                </TabPane>
            </Tabs>
        </Card>
    )
}