import React, { useState } from 'react';
import axios from 'axios';
import { Button, message } from 'antd';

import { auth } from '@/services/firebase';
import { apiUrlPostProjectionProfitAndLoss } from '@/utils/api';


interface ButtonAnalyzePLProps {
    file_uuid: string;
}

const ButtonAnalyzePL: React.FC<ButtonAnalyzePLProps> = ({ file_uuid }) => {
    const [loading, setLoading] = useState(false);

    const handleButtonClick = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                setLoading(true);
                const accessToken = await user.getIdToken(true);
                const response = await axios.post(
                    apiUrlPostProjectionProfitAndLoss,
                    null,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                        params: {
                            file_uuid: file_uuid, // クエリパラメータ
                        },
                    }
                );
                message.success('データの取得に成功しました。');
                console.log(response.data);
            } catch (error) {
                message.error('データの取得に失敗しました。');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
    };

    return (
        <div>
            <Button type="default" loading={loading} onClick={handleButtonClick}>
            事業計画書用のPL関連数値の自動分析
            </Button>
        </div>
    );
};

export default ButtonAnalyzePL;
