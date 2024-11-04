import React, { useState, useCallback } from 'react';
import {
    Card,
    message,
    Button,
    List,
    Space,
    Tabs,
    Typography
} from 'antd';
import {
    FileTextOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import {
    apiUrlGetExplorerFinancialStatements,
} from '@/utils/api';

const { Text } = Typography;


interface FinancialStatement {
    uuid: string;
    name: string;
    url: string;
    categoryIr: string;
    yearInfo: string;
    periodType: string;
}

interface ApiResponse {
    financialStatements: FinancialStatement[];
}

const formatYearInfo = (yearInfo: string): string => {
    if (yearInfo && yearInfo.length === 6) {
        return `${yearInfo.slice(0, 4)}.${yearInfo.slice(4)}`;
    }
    return yearInfo;
};

const FinancialStatementViewer: React.FC = () => {
    const [documents, setDocuments] = useState<FinancialStatement[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('list');

    const auth = getAuth();

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setDocuments([]);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('認証が必要です');
            }

            const accessToken = await user.getIdToken(true);
            const response = await axios.get<ApiResponse>(
                apiUrlGetExplorerFinancialStatements,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );

            setDocuments(response.data.financialStatements);
            console.log(response.data);

        } catch (error) {
            console.error('Error fetching documents:', error);
            message.error('IR資料の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [auth]);

    // タブアイテムの定義
    const tabItems = [
        {
            key: 'list',
            label: 'IR資料一覧',
            children: (
                <List
                    dataSource={documents}
                    loading={loading}
                    locale={{ emptyText: 'IRがありません' }}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                            ]}
                        >
                            <List.Item.Meta
                                title={item.name}
                                description={
                                    <Space direction="vertical">
                                        <Text type="secondary">ID: {item.uuid}</Text>
                                        <Text type="secondary">{formatYearInfo(item.yearInfo)} {item.periodType}</Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            ),
        }
    ];

    return (
        <div>
            <Card title="IR資料ビューワー">
                <Button
                    type="primary"
                    onClick={fetchDocuments}
                    loading={loading}
                    icon={<FileTextOutlined />}
                >
                    IR資料を取得
                </Button>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                />
            </Card>
        </div>
    );
};

export default FinancialStatementViewer;
