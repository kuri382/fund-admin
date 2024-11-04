'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tooltip, Button, notification } from 'antd';
import './FinancialTable.css';

interface DataSource {
    value: number;
    source: string;
}

interface FinancialData {
    key: string;
    metric: string;
    [key: string]: DataSource[] | string | boolean;
}

const sampleData: FinancialData[] = [
    {
        key: '1',
        metric: '売上高',
        '2024Q1': [
            { value: 5000000, source: '2023年決算説明資料' },
            { value: 7000000, source: '2024年決算説明資料' },
        ],
        '2024Q2': [
            { value: 7000000, source: '2023年決算説明資料' },
        ],
        '2024Q3': [
            { value: 9000000, source: '2023年決算説明資料' },
            { value: 8500000, source: '2024年計画資料' },
        ],
        '2024Q4': [
            { value: 11000000, source: '2023年決算説明資料' },
        ],
    },
    {
        key: '2',
        metric: '売上高粗利',
        '2024Q1': [
            { value: 3000000, source: '2023年決算説明資料' },
        ],
        '2024Q2': [
            { value: 4000000, source: '2023年決算説明資料' },
            { value: 4500000, source: '2024年決算資料' },
        ],
        '2024Q3': [
            { value: 5000000, source: '2023年決算説明資料' },
        ],
        '2024Q4': [
            { value: 6000000, source: '2023年決算説明資料' },
            { value: 5800000, source: '2024年決算資料' },
        ],
    },
    {
        key: '3',
        metric: '営業利益',
        '2024Q1': [
            { value: 2000000, source: '2023年決算説明資料' },
        ],
        '2024Q2': [
            { value: 3000000, source: '2023年決算説明資料' },
        ],
        '2024Q3': [
            { value: 3500000, source: '2023年決算説明資料' },
            { value: 4000000, source: '2024年計画資料' },
        ],
        '2024Q4': [
            { value: 4500000, source: '2023年決算説明資料' },
        ],
    },
    {
        key: '4',
        metric: '純利益',
        '2024Q1': [
            { value: 1000000, source: '2023年決算説明資料' },
            { value: 1200000, source: '2024年計画資料' },
        ],
        '2024Q2': [
            { value: 1500000, source: '2023年決算説明資料' },
        ],
        '2024Q3': [
            { value: 1800000, source: '2023年決算説明資料' },
        ],
        '2024Q4': [
            { value: 2000000, source: '2023年決算説明資料' },
            { value: 2100000, source: '2024年決算資料' },
        ],
    },
    {
        key: '5',
        metric: '販管費',
        '2024Q1': [
            { value: 500000, source: '2023年決算説明資料' },
        ],
        '2024Q2': [
            { value: 520000, source: '2023年決算説明資料' },
            { value: 530000, source: '2024年決算資料' },
        ],
        '2024Q3': [
            { value: 540000, source: '2023年決算説明資料' },
        ],
        '2024Q4': [
            { value: 560000, source: '2023年決算説明資料' },
        ],
    },
];

const FinancialTable: React.FC = () => {
    const [data, setData] = useState<FinancialData[]>([]);
    const [outputData, setOutputData] = useState<FinancialData[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    useEffect(() => {
        setData(sampleData);
        setOutputData(sampleData);

        const uniqueColumns = Array.from(
            new Set(
                sampleData.flatMap((item) =>
                    Object.keys(item).filter((key) => key !== 'key' && key !== 'metric')
                )
            )
        );
        setColumns(uniqueColumns);
    }, []);

    const handleNotification = (quarter: string, value: number) => {
        notification.info({
            message: '変更履歴',
            description: `${quarter}に${value.toLocaleString()} 円を採用しました`,
            placement: 'topRight',
        });
    };

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
        handleNotification(quarter, selectedValue);
    };

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
            render: (values: DataSource[] | undefined, record: FinancialData) => {
                if (!values || values.length === 0) return <span>データなし</span>;

                const isSelected = record[`${quarter}_selected`] ? true : false;
                const backgroundColor = isSelected ? 'transparent' : (values.length > 1 ? '#ffebcc' : 'transparent');

                return {
                    props: {
                        style: { backgroundColor: backgroundColor }, // セル全体の背景色を設定
                    },
                    children: (
                        <Tooltip
                            title={
                                <div>
                                    {values.map((item, index) => (
                                        <div key={index}>
                                            <p>{item.source}: {item.value.toLocaleString()} 円</p>
                                            <Button type="link" onClick={() => handleValueSelection(quarter, record.key, item.value)}>
                                                {item.value.toLocaleString()} 円を採用する
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            }
                            trigger="click"
                        >
                            <span style={{ cursor: 'pointer', display: 'block', padding: '5px' }}>
                                {values[0].value.toLocaleString()}
                            </span>
                        </Tooltip>
                    ),
                };
            }

        })),
    ];

    return (
        <Table
            columns={tableColumns}
            dataSource={outputData}
            bordered
            scroll={{ x: 'max-content' }}
        />
    );
};

export default FinancialTable;
