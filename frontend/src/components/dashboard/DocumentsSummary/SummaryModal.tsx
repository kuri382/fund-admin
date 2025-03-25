import React, { useState, useEffect } from 'react';
import { Spin, Alert, Typography, Button, Modal } from 'antd';
import axios from 'axios';
import { marked } from 'marked';

import { getAuth } from 'firebase/auth';
import { apiUrlGetDataReport } from '@/utils/api';

const { Paragraph, Text } = Typography;

interface SummaryModalProps {
    file_uuid: string;
}

// /data/report のレスポンス型
interface DataReportResponse {
    summary: string;
}

export const formatText = (text: string) => {
    if (!text) return "";
    return marked(text);
};


const SummaryModal: React.FC<SummaryModalProps> = ({ file_uuid }) => {
    const [reportSummary, setReportSummary] = useState<string>('');
    const [reportSummaryLoading, setReportSummaryLoading] = useState<boolean>(true);
    const [reportSummaryError, setReportSummaryError] = useState<string | null>(null);

    // モーダル表示制御用
    const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

    const auth = getAuth();

    // /data/report の取得
    const fetchDataReport = async () => {
        setReportSummaryLoading(true);
        setReportSummaryError(null);

        const user = auth.currentUser;
        if (!user) {
            setReportSummaryError('認証が必要です');
            setReportSummaryLoading(false);
            return;
        }

        try {
            const accessToken = await user.getIdToken(true);
            const res = await axios.get<DataReportResponse>(apiUrlGetDataReport, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: { file_uuid },
            });
            setReportSummary(res.data.summary ?? '');
        } catch (err) {
            setReportSummaryError('summary の取得に失敗しました。');
        } finally {
            setReportSummaryLoading(false);
        }
    };

    useEffect(() => {
        fetchDataReport();
    }, []);

    // summary の冒頭部分（例: 80文字）だけを表示する
    const shortSummary = reportSummary
        ? reportSummary.substring(0, 80) + (reportSummary.length > 80 ? '...' : '')
        : '';

    const handleOpenReportModal = () => setReportModalOpen(true);
    const handleCloseReportModal = () => setReportModalOpen(false);

    return (
        <div>
            {/* Summary 取得部分 */}
            <div style={{ marginBottom: '1rem' }}>
                {/*reportSummaryLoading && <Spin />*/}
                {!reportSummaryLoading && !reportSummaryError && reportSummary && (
                    <>

                        <Button type="primary" onClick={handleOpenReportModal}>
                            自動作成レポートを確認する
                        </Button>
                        {/*<br />
                        <br />
                        <Text strong>詳細サマリーを開く:</Text> {shortSummary}
                        */}
                    </>
                )}
            </div>

            {/* /data/report の全文用モーダル */}
            <Modal
                title="レポート"
                open={reportModalOpen}
                onCancel={handleCloseReportModal}
                footer={null}
                width="70%"
                styles={{
                    body: {
                        maxHeight: '77vh',
                        overflowY: 'auto',
                    },
                }}
            >
                <Paragraph>
                    <div dangerouslySetInnerHTML={{ __html: formatText(reportSummary) }} />
                </Paragraph>
            </Modal>
        </div>
    );
};

export default SummaryModal;
