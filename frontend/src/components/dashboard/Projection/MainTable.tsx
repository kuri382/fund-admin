import React, { useEffect, useState } from "react";
import { Table, Drawer, Button, Spin, Image } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { getAuth } from "firebase/auth";

import { apiUrlGetProjectionProfitAndLoss } from "@/utils/api";
import { PLMetricsResponse, Item } from "./types"; // 型定義をインポート

const PLMetricsTable: React.FC = () => {
  const [data, setData] = useState<PLMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [drawerData, setDrawerData] = useState<Item[]>([]);

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    setLoading(false);
    return null;
  }

  const fetchAccessToken = async (): Promise<string> => {
    return await user.getIdToken(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = await fetchAccessToken();
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

    fetchData();
  }, []);

  const handleCellClick = (candidates: Item[]) => {
    setDrawerData(candidates);
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
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
      render: (value: any) => {
        if (!value) return null;

        const { displayValue, candidates } = value;
        const hasDuplicates = candidates.length > 1;

        return {
          props: {
            style: {
              background: hasDuplicates ? "#ff6666" : "transparent", // 重複時は赤、それ以外は透明
            },
          },
          children: (
            <Button type="link" onClick={() => handleCellClick(candidates)}>
              {displayValue}
            </Button>
          ),
        };
      }

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
            displayValue: item.values[0]?.value || "None",
            isDuplicate: false,
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
      <Table
        columns={columns}
        dataSource={rows}
        bordered
        scroll={{ x: "max-content" }}
        rowKey="title"
      />
      <Drawer
        title="参照元データ"
        placement="right"
        onClose={handleDrawerClose}
        open={isDrawerVisible}
        width={400}
      >
        {drawerData.map((item, index) => (
          <div key={index} style={{ marginBottom: "1em" }}>
            <p>
              値: {item.value}
            </p>
            <Image
              src={item.url}
              alt="プレビュー"
              style={{ maxWidth: "100%", width: "300px", height: "auto" }}
            />
          </div>
        ))}
      </Drawer>
    </>
  );
};

export default PLMetricsTable;
