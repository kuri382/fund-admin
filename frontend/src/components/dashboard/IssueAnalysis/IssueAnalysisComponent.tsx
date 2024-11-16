import React, { useState } from 'react';
import { Card, Spin, message, Button, Typography } from 'antd';
import { apiUrlQueryIssueAnalysis } from '@/utils/api';
import { getAuth } from "firebase/auth";

const { Title, Paragraph } = Typography;

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

const IssueAnalysisComponent: React.FC = () => {
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    const fetchAnswer = async () => {
        setLoading(true);
        setAnswer('');
        const user = auth.currentUser;

        if (user) {
            try {
                const accessToken = await user.getIdToken(/* forceRefresh */ true);

                const response = await fetch(apiUrlQueryIssueAnalysis, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch the answer.');
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let result = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        result += decoder.decode(value, { stream: true });
                        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
                    }
                }
            } catch (error) {
                console.error('Error fetching answer:', error);
                message.error('Failed to get answer. Please try again later.');
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
            message.error('User not authenticated. Please log in and try again.');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <Card title="Issue Analysis" style={{ width: '100%' }}>
                <Button
                    type="primary"
                    onClick={fetchAnswer}
                    loading={loading}
                    style={{ marginBottom: '16px' }}
                >
                    Issue Analysis リスト
                </Button>
                {loading ? (
                    <div style={{ textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    answer && (
                        <div>
                            <Title level={4} style={{ marginBottom: '8px' }}></Title>
                            {/*<Paragraph>{answer}</Paragraph>*/}
                            <div style={{ textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: formatText(answer) }} />
                        </div>
                    )
                )}
            </Card>
        </div>
    );
};

export default IssueAnalysisComponent;
