import React, { useEffect, useState } from "react";
import { Table, Drawer, Button, Spin, Space, Image } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { ReloadOutlined, BulbOutlined } from '@ant-design/icons';

import { apiUrlGetProjectionProfitAndLoss } from "@/utils/api";
import { PLMetricsResponse, Item } from "./types";
import ExcelExportButton from "@/components/dashboard/Projection/ExcelExportButton";

const formatNumber = (value: string | number): string => {
  if (isNaN(Number(value))) {
    return value.toString();
  }
  return new Intl.NumberFormat("ja-JP").format(Number(value));
};


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

  useEffect(() => {
    fetchData();
  }, [projectChanged]);

  if (!user) {
    setLoading(false);
    return null;
  }

  const fetchAccessToken = async (): Promise<string> => {
    return await user.getIdToken(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const accessToken = await fetchAccessToken();
      console.log('正しい', accessToken)

      const response = await axios.get<PLMetricsResponse>(
        apiUrlGetProjectionProfitAndLoss,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { year: 2024 },
        }
      );
      console.log(response.data);
      setData(response.data);
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

      // `data`の行と列を探して値を更新
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

      // 更新されたデータを保存
      setData({ ...data, rows: updatedRows });

      // Drawerを閉じる
      setIsDrawerVisible(false);
    }
  };


  const years = [2020, 2021, 2022, 2023, 2024];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 2024年12月から左起点にする
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
      key: `${year}-${month}`,
      render: (value: any, record: any) => {
        if (!value) return null;

        const { displayValue, candidates } = value;
        const hasDuplicates = candidates.length > 1;

        return {
          props: {
            style: {
              background: hasDuplicates ? "#fadaaa" : "transparent",
            },
          },
          children: (
            <Button
              type="text"
              onClick={() => handleCellClick(candidates, record.title, `${year}-${month}`)}
            >
              {formatNumber(displayValue)}
            </Button>
          ),
        };
      },
    })),
  ];

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
            displayValue: item.values[0]?.value || "None", // 最初の値を表示
            isDuplicate: item.values.length > 1, // 候補が複数の場合は重複と判定
            candidates: [...item.values],
          };
        }
      });
    });

    return Object.values(rowMap);
  };


  if (loading) {
    return <Spin size="large" />;
  }

  if (!data) {
    return <div>データがありません</div>;
  }

  const rows = generateRowData(data);

  return (
    <>
      <Space>
        <ExcelExportButton
          rows={rows}
          sortedColumns={sortedColumns}
        />
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
      />
      <Drawer
        title="参照元データ"
        placement="right"
        onClose={handleDrawerClose}
        open={isDrawerVisible}
        width={450}
      >
        <p>読み込んだ資料から自動で値を取得しました。</p>
        {drawerData.map((item, index) => (
          <div key={index} style={{ marginBottom: "20px" }}>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => handleCandidateSelect(item)}
              style={{ marginBottom: '10px' }}
            /*icon={< BulbOutlined />}*/
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

    </>
  );
};

export default PLMetricsTable;
