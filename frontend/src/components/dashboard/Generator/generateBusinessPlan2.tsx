'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tooltip, Button, notification } from 'antd';

import {
    apiUrlGetParameterSales,
  } from '@/utils/api';

interface DataSource {
    value: number | null;
    source: string;
}

interface FinancialData {
    key: string;
    metric: string;
    [key: string]: DataSource[] | string | boolean;
}

const useFinancialData = () => {
    const [data, setData] = useState<FinancialData[]>([]);
    const [outputData, setOutputData] = useState<FinancialData[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    useEffect(() => {
        // データをAPIから取得
        const fetchData = async () => {
            try {
                const response = await fetch(apiUrlGetParameterSales);
                const result: FinancialData[] = await response.json();

                setData(result);
                setOutputData(result);

                // カラムの取得
                const uniqueColumns = Array.from(
                    new Set(
                        result.flatMap((item) =>
                            Object.keys(item).filter((key) => key !== 'key' && key !== 'metric')
                        )
                    )
                );
                setColumns(uniqueColumns);
            } catch (error) {
                console.error('データの取得に失敗しました', error);
            }
        };

        fetchData();
    }, []);

    return { data, outputData, setOutputData, columns };
};

// 通知を表示する関数
const showNotification = (quarter: string, value: number) => {
    notification.info({
        message: '変更履歴',
        description: `${quarter}に${value.toLocaleString()} 円を採用しました`,
        placement: 'topRight',
    });
};

const FinancialTable: React.FC = () => {
    const { data, outputData, setOutputData, columns } = useFinancialData();

    // 値の選択を処理する関数
    const handleValueSelection = (quarter: string, key: string, selectedValue: number) => {
        const updatedData = outputData.map((item) => {
            if (item.key === key) {
                return {
                    ...item,
                    [quarter]: [{ value: selectedValue, source: '選択された値' }],
                    [`${quarter}_selected`]: true, // フラグを追加して選択状態を記憶
                };
            }
            return item;
        });
        setOutputData(updatedData);
        showNotification(quarter, selectedValue);
    };

    // セルレンダリング用関数
    const renderCell = (values: DataSource[] | undefined, record: FinancialData, quarter: string) => {
        if (!values || values.length === 0) return <span>データなし</span>;

        const isSelected = record[`${quarter}_selected`] ? true : false;
        const backgroundColor = isSelected ? 'transparent' : (values.length > 1 ? '#ffebcc' : 'transparent');

        if (values.length === 1) {
            return {
                props: {
                    style: { backgroundColor },
                },
                children: (
                    <span style={{ display: 'block', padding: '5px', textAlign: 'right' }}>
                        {values[0].value !== null ? values[0].value.toLocaleString() : '-'}
                    </span>
                ),
            };
        }

        return {
            props: {
                style: { backgroundColor },
            },
            children: (
                <Tooltip
                    title={
                        <div>
                            {values
                                .filter((item) => item.value !== null)
                                .map((item, index) => (
                                    <div key={index}>
                                        <p>{item.source}: {item.value?.toLocaleString()}</p>
                                        <Button type="link" onClick={() => handleValueSelection(quarter, record.key, item.value!)}>
                                            {item.value?.toLocaleString()} を採用する
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    }
                    trigger="click"
                >
                    <span style={{ cursor: 'pointer', display: 'block', padding: '5px', textAlign: 'right' }}>
                        {values[0].value !== null ? values[0].value.toLocaleString() : '-'}
                    </span>
                </Tooltip>
            ),
        };
    };

    // テーブルの列定義
    const tableColumns = [
        {
            title: '指標',
            dataIndex: 'metric',
            key: 'metric',
            fixed: 'left' as const,
        },
        ...columns.map((quarter) => ({
            title: quarter,
            dataIndex: quarter,
            key: quarter,
            render: (values: DataSource[] | undefined, record: FinancialData) => renderCell(values, record, quarter),
        })),
    ];

    return (
        <>
            <div style={{ textAlign: 'right', padding: '10px' }}>
                <Button type="primary" onClick={() => console.log('test')}>
                    スプレッドシートに保存する
                </Button>
            </div>
            <Table
                columns={tableColumns}
                dataSource={outputData}
                bordered
                scroll={{ x: 'max-content' }}
            />
        </>
    );
};

export default FinancialTable;
