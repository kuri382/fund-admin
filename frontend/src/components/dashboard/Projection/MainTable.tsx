import React, { useEffect, useState } from "react";
import { Table, Drawer, Button, Spin, Space, Image } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { ReloadOutlined } from '@ant-design/icons';

import { apiUrlGetProjectionProfitAndLoss } from "@/utils/api";
import { PLMetricsResponse, Item } from "./types";
import ExcelExportButton from "@/components/dashboard/Projection/ExcelExportButton";

const formatNumber = (value: string | number): string => {
  if (isNaN(Number(value))) {
    return value.toString();
  }
  return new Intl.NumberFormat("ja-JP").format(Number(value));
};

/**
 * 複数の PLMetricsResponse をまとめて一つに合体するサンプル関数
 * - 年月が重複した場合の扱いは要件に合わせて実装してください
 */
function mergePLMetricsResponses(responses: PLMetricsResponse[]): PLMetricsResponse {
  // ここでは単純に rows を合体しているだけ
  const mergedRows = responses.flatMap((resp) => resp.rows);
  return {
    rows: mergedRows,
  };
}

const PLMetricsTable: React.FC<{ projectChanged: boolean }> = ({ projectChanged }) => {
  const [data, setData] = useState<PLMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [drawerData, setDrawerData] = useState<Item[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    rowKey: string;
    columnKey: string;
  } | null>(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // もともと「year: 2024」固定だった部分を、
  // デフォルトでは [2025, 2024, 2023] の3年ぶんをまとめて取得する例に変更。
  // 必要に応じてここを変えれば取りたい年数を増減できます。
  const yearsToFetch = [2025, 2024, 2023];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [projectChanged, user]);

  const fetchAccessToken = async (): Promise<string> => {
    return await user!.getIdToken(true);
  };

  /**
   * 複数年ぶんをループで呼び出し、それらをマージして setData へ格納する
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      const accessToken = await fetchAccessToken();

      const allResponses: PLMetricsResponse[] = [];
      for (const yr of yearsToFetch) {
        const response = await axios.get<PLMetricsResponse>(
          apiUrlGetProjectionProfitAndLoss,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { year: yr }, // 単年ずつ渡す
          }
        );
        allResponses.push(response.data);
      }

      // 複数結果をマージして data に設定
      const merged = mergePLMetricsResponses(allResponses);
      setData(merged);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (candidates: Item[], rowKey: string, columnKey: string) => {
    setDrawerData(candidates);
    setSelectedCell({ rowKey, columnKey });
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
  };

  const handleCandidateSelect = (selectedValue: Item) => {
    if (selectedCell && data) {
      const { rowKey, columnKey } = selectedCell;

      const updatedRows = data.rows.map((row) => {
        if (row.items.some((item) => item.title === rowKey)) {
          return {
            ...row,
            items: row.items.map((item) => {
              if (item.title === rowKey) {
                const key = `${row.period.year}-${row.period.month}`;
                if (key === columnKey) {
                  // 対象セルを更新
                  return {
                    ...item,
                    values: [
                      { ...selectedValue },
                      ...item.values.filter((v) => v.value !== selectedValue.value),
                    ],
                  };
                }
              }
              return item;
            }),
          };
        }
        return row;
      });

      setData({ ...data, rows: updatedRows });
      setIsDrawerVisible(false);
    }
  };

  // ▼ ここは元の実装をほぼそのまま流用
  //   デフォルトで 2025, 2024, 2023 の三年分の列を descending(年→月)で生成
  const years = [2025, 2024, 2023];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const sortedColumns = years
    .flatMap((year) =>
      months.map((month) => ({ year, month }))
    )
    .sort((a, b) => b.year - a.year || b.month - a.month);

  const columns: ColumnsType<any> = [
    {
      title: "項目",
      dataIndex: "title",
      key: "title",
      fixed: "left",
    },
    ...sortedColumns.map(({ year, month }) => ({
      title: `${year}年${month}月`,
      dataIndex: `${year}-${month}`,
      onCell: (record: any) => {
        const cellData = record[`${year}-${month}`];
        return {
          style: {
            background: cellData && cellData.candidates && cellData.candidates.length > 1 ? "#fadaaa" : "transparent",
          },
        };
      },
      render: (value: any, record: any) => {
        if (!value) return null;
        const { displayValue, candidates } = value;
        return (
          <Button
            type="text"
            onClick={() => handleCellClick(candidates, record.title, `${year}-${month}`)}
          >
            {formatNumber(displayValue)}
          </Button>
        );
      },
      key: `${year}-${month}`,
    })),
  ];

  /** 元の実装に近い形で rowData を組み立て */
  const generateRowData = (data: PLMetricsResponse) => {
    const rowMap: Record<string, any> = {};

    data.rows.forEach((row) => {
      row.items.forEach((item) => {
        if (!rowMap[item.title]) {
          rowMap[item.title] = { title: item.title };
        }

        const key = `${row.period.year}-${row.period.month}`;
        const currentData = rowMap[item.title][key];

        if (currentData) {
          currentData.isDuplicate = true;
          currentData.candidates.push(...item.values);
        } else {
          rowMap[item.title][key] = {
            displayValue: item.values[0]?.value || "None",
            isDuplicate: item.values.length > 1,
            candidates: [...item.values],
          };
        }
      });
    });

    return Object.values(rowMap);
  };

  if (loading) {
    return <Spin size="default" />;
  }

  if (!data) {
    return <div>データがありません</div>;
  }

  const rows = generateRowData(data);

  return (
    <div style={{
      background: '#ffffff',
      borderRight: '1px solid #f0f0f0',
      borderBottom: '1px solid #f0f0f0',
      borderLeft: '1px solid #f0f0f0',
      borderTopRightRadius: '5px',
      borderTopLeftRadius: '5px',
    }}>
      <Space style={{ padding: '16px' }}>
        <ExcelExportButton rows={rows} sortedColumns={sortedColumns} />
        <Button
          onClick={fetchData}
          type="default"
          style={{ marginBottom: "16px", marginRight: "8px" }}
          icon={<ReloadOutlined />}
        >
          データ再読み込み
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={rows}
        bordered
        scroll={{ x: "max-content" }}
        rowKey="title"
        pagination={{ pageSize: 50 }}
        size="small"
        style={{ height: '100%', padding: '16px' }}
      />

      <Drawer
        title="参照元データ"
        placement="right"
        onClose={handleDrawerClose}
        open={isDrawerVisible}
        width={450}
      >
        <p>ベータ版機能：読み込んだ資料から自動で値を取得しました。</p>
        {drawerData.map((item, index) => (
          <div key={index} style={{ marginBottom: "20px" }}>
            <Button
              onClick={() => handleCandidateSelect(item)}
              style={{ marginBottom: "10px" }}
            >
              {formatNumber(item.value)} を採用する
            </Button>
            <Image
              src={item.url}
              alt="プレビュー"
              style={{ maxWidth: "100%", width: "400px", height: "auto" }}
            />
          </div>
        ))}
      </Drawer>
    </div>
  );
};

export default PLMetricsTable;
