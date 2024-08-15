"use client"

import React, { useState } from 'react';
import { Button, message } from 'antd';
import { api } from '@/utils/api';
import ReactMarkdown from 'react-markdown';

interface StepStatus {
    text: string;
    class: string;
}


export default function AnalysisStatus() {
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
            let response: any;
            switch (endpoint) {
                case 'get-summary':
                    response = await api.getSummary.getSummaryGetSummaryGet({ file_name: fileName });
                    break;
                case 'get-market-status':
                    response = await api.getMarketStatus.getSummaryGetMarketStatusGet({ file_name: fileName });
                    break;
                case 'get-financial-status':
                    response = await api.getFinancialStatus.getSummaryGetFinancialStatusGet({ file_name: fileName });
                    break;
                case 'get-services-status':
                    response = await api.getServicesStatus.getSummaryGetServicesStatusGet({ file_name: fileName });
                    break;
                case 'get-strong-point':
                    response = await api.getStrongPoint.getStrongPointGetStrongPointGet({ file_name: fileName });
                    break;
                default:
                    throw new Error('不明なエンドポイントです。');
            }

            if (response.data) {
                setMarkdownContent(prevContent => ({
                    ...prevContent,
                    [elementId]: response.data
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
            updateStepStatus('step1', '進行中', 'is-info');
            await fetchMarkdownContent('get-summary', 'summary');
            updateStepStatus('step1', '完了', 'is-success');

            updateStepStatus('step2', '進行中', 'is-info');
            await fetchMarkdownContent('get-market-status', 'marketStatus');
            updateStepStatus('step2', '完了', 'is-success');

            updateStepStatus('step3', '進行中', 'is-info');
            await fetchMarkdownContent('get-financial-status', 'financialStatus');
            updateStepStatus('step3', '完了', 'is-success');

            updateStepStatus('step4', '進行中', 'is-info');
            await fetchMarkdownContent('get-services-status', 'servicesStatus');
            updateStepStatus('step4', '完了', 'is-success');

            await fetchMarkdownContent('get-strong-point', 'strongPoint');
        } catch (error) {
            console.error('分析中にエラーが発生しました:', error);
            message.error('分析中にエラーが発生しました。もう一度お試しください。');
        } finally {
            await new Promise(resolve => setTimeout(resolve, 30000));
            setIsAnalyzing(false);
        }
    };

    return (
        <div>
            <Button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                loading={isAnalyzing}
            >
                解析開始
            </Button>
            {Object.entries(status).map(([step, stepStatus]) => (
                <div key={step} className={`step-status ${stepStatus.class}`}>
                    {step}: {stepStatus.text}
                </div>
            ))}
            {Object.entries(markdownContent).map(([elementId, content]) => (
                <div key={elementId} className="markdown-content">
                    <h3>{elementId}</h3>
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            ))}
        </div>
    );
}