'use client';

import React, { useEffect, useReducer, useState } from 'react';
import { Table, Tooltip, Button, Image, notification } from 'antd';
import { apiUrlGetParameterSales } from '@/utils/api';

interface DataSource {
    value: number | null;
    source: string;
    url: string;
}

interface QuarterData {
    year: number;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    data: DataSource[];
}

interface FinancialData {
    key: string;
    metric: string;
    values: QuarterData[];
}

interface APIResponse {
    data: FinancialData[];
}

// カスタムフックでデータ取得
const useFinancialData = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, dispatch] = useReducer(dataReducer, []);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const response = await fetch(apiUrlGetParameterSales);
            const result: APIResponse = await response.json();
            console.log(result);

            dispatch({ type: 'INITIALIZE_DATA', payload: result.data });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, dispatch };
};

// Reducerアクションの型
type Action =
    | { type: 'SELECT_VALUE'; key: string; quarterKey: string; value: DataSource }
    | { type: 'INITIALIZE_DATA'; payload: FinancialData[] };

// `selected` フィールドを管理するための一時的な状態管理
interface ExtendedFinancialData extends FinancialData {
    selected?: { [quarterKey: string]: DataSource };
}

// Reducer
const dataReducer = (state: ExtendedFinancialData[], action: Action): ExtendedFinancialData[] => {
    switch (action.type) {
        case 'SELECT_VALUE':
            return state.map((item) =>
                item.key === action.key
                    ? { ...item, selected: { ...item.selected, [action.quarterKey]: action.value } }
                    : item
            );
        case 'INITIALIZE_DATA':
            return action.payload.map((item) => ({ ...item, selected: {} }));
        default:
            return state;
    }
};

// 通知表示
const showNotification = (quarterKey: string, value: number) => {
    notification.info({
        message: '変更履歴',
        description: `${quarterKey}に${value.toLocaleString()} 円を採用しました`,
        placement: 'topRight',
    });
};
const uniqueValues = (data: DataSource[]) => {
    const seen = new Set<string>();
    return data.filter((item) => {
        const key = `${item.source}-${item.value}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

// テーブルのセルをレンダリング
const renderCell = (
    record: ExtendedFinancialData,
    year: number,
    quarter: string,
    handleValueSelection: (key: string, quarterKey: string, value: DataSource) => void
) => {
    const quarterData = record.values.find((value) => value.year === year && value.quarter === quarter);
    if (!quarterData) return <span>データなし</span>;

    const values = quarterData.data;
    const quarterKey = `${year}${quarter}`;
    const selectedValue = record.selected?.[quarterKey];
    const backgroundColor = values.length > 1 ? '#ffebcc' : 'transparent';

    return (
        <Tooltip
            title={
                <div>
                    {values.map((item, index) => (
                        <div key={`${item.source}-${item.value}-${index}`}>
                            <p>{item.source}: {item.value?.toLocaleString()}</p>
                            <Image width={200} src={item.url} alt="example" />
                            <Button type="link" onClick={() => handleValueSelection(record.key, quarterKey, item)}>
                                {item.value?.toLocaleString()} を採用する
                            </Button>
                        </div>
                    ))}
                </div>
            }
            trigger="click"
        >
            <span style={{ cursor: 'pointer', backgroundColor, padding: '5px', textAlign: 'right' }}>
                {selectedValue ? selectedValue.value?.toLocaleString() : values[0].value?.toLocaleString() ?? '-'}
            </span>
        </Tooltip>
    );
};

const FinancialTable: React.FC = () => {
    const { data, loading, error, dispatch } = useFinancialData();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    const columns = Array.from(
        new Set(data.flatMap((item) => item.values.map((value) => `${value.year}-${value.quarter}`)))
    ).map((key) => {
        const [year, quarter] = key.split("-");
        return { year: parseInt(year), quarter };
    });

    const handleValueSelection = (key: string, quarterKey: string, value: DataSource) => {
        dispatch({ type: 'SELECT_VALUE', key, quarterKey, value });
        showNotification(quarterKey, value.value!);
    };

    const tableColumns = [
        {
            title: '指標',
            dataIndex: 'metric',
            key: 'metric',
            fixed: 'left' as const,
        },
        ...columns.map(({ year, quarter }) => {
            const quarterKey = `${year}${quarter}`;
            return {
                title: `${year} ${quarter}`,
                dataIndex: quarterKey,
                key: quarterKey,
                render: (_: unknown, record: ExtendedFinancialData) => renderCell(record, year, quarter, handleValueSelection),
            };
        }),
    ];

    return (
        <Table
            columns={tableColumns}
            dataSource={data}
            bordered
            scroll={{ x: 'max-content' }}
            rowKey="key"
        />
    );
};

export default FinancialTable;
