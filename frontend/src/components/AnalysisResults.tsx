"use client"

import React, { useState } from 'react';
import { Button, message, Tabs, Card } from 'antd';
import { CloudSyncOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

import KeyPersons from './KeyPersons';

interface StepStatus {
    text: string;
    class: string;
}

export default function AnalysisResults() {
    const [status, setStatus] = useState<Record<string, StepStatus>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [markdownContent, setMarkdownContent] = useState<Record<string, string>>({});

    const updateStepStatus = (step: string, statusText: string, statusClass: string) => {
        setStatus(prevStatus => ({
            ...prevStatus,
            [step]: { text: statusText, class: statusClass }
        }));
    };

    const fetchMarkdownContent = async (endpoint: string, elementId: string) => {
        const fileName = localStorage.getItem('uploadedFileName');
        if (!fileName) {
            throw new Error('ファイル名が設定されていません。');
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${endpoint}?file_name=${encodeURIComponent(fileName)}`);
            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setMarkdownContent(prevContent => ({
                    ...prevContent,
                    [elementId]: (prevContent[elementId] || '') + chunk
                }));
            }
        } catch (error) {
            console.error(`Error fetching content from ${endpoint}:`, error);
            throw error;
        }
    };

    const startAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const endpoints = [
                { endpoint: 'get-summary', elementId: 'summary' },
                { endpoint: 'get-market-status', elementId: 'marketStatus' },
                { endpoint: 'get-financial-status', elementId: 'financialStatus' },
                { endpoint: 'get-services-status', elementId: 'servicesStatus' },
                { endpoint: 'get-strong-point', elementId: 'strongPoint' },
            ];

            await Promise.all(endpoints.map(async ({ endpoint, elementId }) => {
                updateStepStatus(elementId, '進行中', 'is-info');
                await fetchMarkdownContent(endpoint, elementId);
                updateStepStatus(elementId, '完了', 'is-success');
            }));
        } catch (error) {
            console.error('分析中にエラーが発生しました:', error);
            message.error('分析中にエラーが発生しました。もう一度お試しください。');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const items = [
        {
            key: 'summary',
            label: 'エグゼクティブサマリー',
            children: (
                <>
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box">
                        <ReactMarkdown>{markdownContent.summary || ''}</ReactMarkdown>
                    </div>
                </>
            )
        },
        {
            key: 'financialStatus',
            label: '財務状況',
            children: (
                <>
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button type="primary" style={{ marginRight: '10px' }}>財務状況スプレッドシート</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box">
                        <ReactMarkdown>{markdownContent.financialStatus || ''}</ReactMarkdown>
                    </div>
                </>
            )
        },
        {
            key: 'marketStatus',
            label: '市場の状況',
            children: (
                <>
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合企業の情報確認</Button>
                    <div className="result-box">
                        <ReactMarkdown>{markdownContent.marketStatus || ''}</ReactMarkdown>
                    </div>
                </>
            )
        },
        {
            key: 'servicesStatus',
            label: '各種事業（サービス）の状況',
            children: (
                <>
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合サービスの情報確認</Button>
                    <div className="result-box">
                        <ReactMarkdown>{markdownContent.servicesStatus || ''}</ReactMarkdown>
                    </div>
                </>
            )
        },
        {
            key: 'strongPoint',
            label: '会社の強みとリスク',
            children: (
                <>
                    <Button type="primary" style={{ marginRight: '10px' }}>より詳しく調査</Button>
                    <Button style={{ marginRight: '10px' }}>参考文献を確認</Button>
                    <Button>競合サービスの情報確認</Button>
                    <div className="result-box">
                        <ReactMarkdown>{markdownContent.strongPoint || ''}</ReactMarkdown>
                    </div>
                </>
            )
        },
        {
            key: 'keyPersons',
            label: '業界のキーパーソン',
            children: <KeyPersons />
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                loading={isAnalyzing}
                size='large'
                style={{
                    width: '40%',
                    background: 'linear-gradient(135deg, #6253E1, #04BEFE)',
                }}
                type="primary"
                icon={<CloudSyncOutlined />}
            >
                解析開始
            </Button>
            </div>
            {Object.entries(status).map(([step, stepStatus]) => (
                <div key={step} className={`step-status ${stepStatus.class}`}>
                    {step}: {stepStatus.text}
                </div>
            ))}
            <Card style={{ marginTop: '20px'}}>
                <Tabs items={items} style = {{height: '500px', padding: '10px', marginBottom: '20px'}} />
            </Card>
        </div>
    );
}