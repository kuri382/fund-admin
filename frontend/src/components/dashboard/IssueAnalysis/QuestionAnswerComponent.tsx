import React, { useState, useCallback } from 'react';
import {
    Card,
    message,
    Button,
    List,
    Space,
    Typography,
    Spin
} from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";
import {
    apiUrlGetExplorerFinancialStatements,
    apiUrlGetExplorerFinancialStatementsUUIDPages,
    apiUrlGetExplorerFinancialStatementsUUID,
} from '@/utils/api';
import AnalysisResults from '@/components/dashboard/IssueAnalysis/AnalysisStart'

const { Text } = Typography;

interface PageDetail {
    index: number;
    summary: string;
    updatedAt: string;
}

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

const formatText = (text: string | undefined) => {
    if (!text) return "";
    return text
        .replace(/####\s(.*?)(?:\n|$)/g, '<h3>$1</h3>') // ### を h3 タグに変換
        .replace(/###\s(.*?)(?:\n|$)/g, '<h3>$1</h3>') // ### を h3 タグに変換
        .replace(/##\s(.*?)(?:\n|$)/g, '<h2>$1</h2>') // ## を h2 タグに変換
        .replace(/#\s(.*?)(?:\n|$)/g, '<h2>$1</h2>') // # を h2 タグに変換
        //.replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>') // 番号付きリストに対応
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        //.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **text** を太字に変換
        .replace(/\n/g, '<br>'); // 改行に変換
};

const formatYearInfo = (yearInfo: string): string => {
    if (yearInfo && yearInfo.length === 6) {
        return `${yearInfo.slice(0, 4)}.${yearInfo.slice(4)}`;
    }
    return yearInfo;
};

const FinancialStatementViewer: React.FC = () => {
    const [documents, setDocuments] = useState<FinancialStatement[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedDocument, setExpandedDocument] = useState<string | null>(null);
    const [pageDetails, setPageDetails] = useState<{ [key: string]: PageDetail[] }>({});
    const [loadingPages, setLoadingPages] = useState<{ [key: string]: boolean }>({});
    const [analysisLoading, setAnalysisLoading] = useState<{ [key: string]: boolean }>({});

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
            const financialStatements = response.data.financialStatements;
            setDocuments(financialStatements);

            // IR資料ごとにページ詳細情報を取得
            await Promise.all(
                financialStatements.map(async (statement) => {
                    await fetchPageDetails(statement.uuid, accessToken);
                })
            );
        } catch (error) {
            console.error('Error fetching documents:', error);
            message.error('IR資料の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [auth]);

    const fetchPageDetails = async (uuid: string, accessToken: string) => {
        if (pageDetails[uuid]) return;

        setLoadingPages(prev => ({ ...prev, [uuid]: true }));
        try {
            const response = await axios.get<PageDetail[]>(
                `${apiUrlGetExplorerFinancialStatementsUUIDPages}/${uuid}/pages`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            setPageDetails(prev => ({ ...prev, [uuid]: response.data }));
        } catch (error) {
            console.error('Error fetching page details:', error);
            message.error('ページ情報の取得に失敗しました');
        } finally {
            setLoadingPages(prev => ({ ...prev, [uuid]: false }));
        }
    };

    const handleAnalysis = async (uuid: string) => {
        setAnalysisLoading(prev => ({ ...prev, [uuid]: true }));
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('認証が必要です');
            }
            const accessToken = await user.getIdToken(true);
            const response = await axios.get(
                `${apiUrlGetExplorerFinancialStatementsUUID}/${uuid}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            if (response.status === 200) {
                message.success('PDFページ情報が正常に取得されました');
            }
        } catch (error) {
            console.error('Error fetching PDF pages:', error);
            message.error('PDFページ情報の取得に失敗しました');
        } finally {
            setAnalysisLoading(prev => ({ ...prev, [uuid]: false }));
        }
    };

    const handleExpand = (uuid: string) => {
        if (expandedDocument === uuid) {
            setExpandedDocument(null);  // 折りたたむ
        } else {
            setExpandedDocument(uuid);  // 展開する
        }
    };

    const renderPageDetails = (uuid: string) => {
        if (loadingPages[uuid]) {
            return <div className="p-4 text-center"><Spin /></div>;
        }

        const pages = pageDetails[uuid];
        if (!pages) return null;

        return (
            <List
                className="ml-8"
                size="small"
                dataSource={pages}
                renderItem={(page) => (
                    <List.Item>
                        <Space direction="vertical" className="w-full">
                            {/*<Text className="text-gray-600">{page.summary}</Text>*/}
                            <div style={{ textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: formatText(page.summary) }} />
                        </Space>
                    </List.Item>
                )}
            />
        );
    };

    return (
        <div>
            <Card>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-4">分析</h2>
                    <Button
                        onClick={fetchDocuments}
                        disabled={loading}
                        className="mb-4"
                    >
                        IR資料を取得
                    </Button>
                </div>
                <List
                    dataSource={documents}
                    loading={loading}
                    locale={{ emptyText: 'IRがありません' }}
                    renderItem={(item) => (
                        <List.Item
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleExpand(item.uuid)}
                        >
                            <List.Item.Meta
                                title={item.name}
                                description={
                                    <Space direction="vertical" className="w-full">
                                        <Text className="text-gray-500">ID: {item.uuid}</Text>
                                        <Text className="text-gray-500">
                                            {formatYearInfo(item.yearInfo)} {item.periodType}
                                        </Text>
                                        {expandedDocument === item.uuid && renderPageDetails(item.uuid)}
                                        <AnalysisResults uuid={item.uuid} />
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
};

export default FinancialStatementViewer;
