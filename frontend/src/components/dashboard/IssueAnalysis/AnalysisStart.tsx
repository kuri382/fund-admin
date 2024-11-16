import React, { useState } from 'react';
import { Button, message, Spin } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";
import {
    apiUrlGetExplorerFinancialStatementsUUID,
} from '@/utils/api';

interface FetchButtonProps {
    uuid: string;
}

const AnalysisStart: React.FC<FetchButtonProps> = ({ uuid }) => {
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    const handleFetch = async () => {
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('認証が必要です');
            }

            const accessToken = await user.getIdToken(true);
            const response = await axios.get(`${apiUrlGetExplorerFinancialStatementsUUID}/${uuid}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.status === 200) {
                message.success('PDFページ情報が正常に取得されました');
            }
        } catch (error) {
            console.error('Error fetching PDF pages:', error);
            message.error('PDFページ情報の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button type="primary" onClick={handleFetch} loading={loading}>
            {loading ? <Spin /> : 'ページ取得'}
        </Button>
    );
};

export default AnalysisStart;
