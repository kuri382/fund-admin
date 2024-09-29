"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Tabs } from 'antd';  // Ant Design の Tabs コンポーネントをインポート
import type { TabsProps } from 'antd';

import FileUpload from '@/components/FileUpload'

import styles from './SalesData.module.css';
import Navbar from "../Navbar/Navbar";
import { api } from '@/utils/api'
import { auth } from '@/services/firebase';


export interface SalesData {
  time: string;
  value: number;
}

export interface ExtractableInfo {
  category: string;
  entity_abstract: string;
  information: string;
  data: SalesData[];
}

export interface SourceData {
  source_id: string;
  source_filename: string;
  source_abstract: string;
  source_sheet_name: string;
  source_level: string;
  source_label: string;
  source_extractable_info: ExtractableInfo[];
}

const convertFiscalYearToDate = (fyTime: string): string => {
  const fiscalYear = parseInt(fyTime.substring(2, 6), 10);
  const month = parseInt(fyTime.substring(6), 10);
  return `${fiscalYear}-${String(month).padStart(2, '0')}`;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ExcelAnalysis: React.FC = () => {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number>(0);  // source_idごとのタブ
  const [selectedTab, setSelectedTab] = useState<number>(0);  // informationごとのタブ
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const user = auth.currentUser;

      if (user) {
        try {
          const accessToken = await user.getIdToken(/* forceRefresh */ true);
          const apiUrl = `${api.baseUrl}/companies/company_456/sources`;

          console.log('apiurl', apiUrl)
          const response = await axios.get<{ sources: SourceData[] }>(apiUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          console.log('response 得られた')

          // データを状態にセット
          setSources(response.data.sources);
          setLoading(false); // ローディング状態を解除
        } catch (err) {
          // エラーハンドリング
          setError("Error fetching source data");
          setLoading(false); // ローディング状態を解除
        }
      } else {
        console.log('error', user)

        setError("No user is signed in.");
        setLoading(false); // ローディング状態を解除
      }
    };

    fetchData(); // 非同期関数の呼び出し
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (sources.length === 0) return <div>No data available</div>;

  // 現在選択されている source_id に対応するデータ
  const selectedSource = sources[selectedSourceIndex];

  // informationごとのタブ
  const tabs = selectedSource?.source_extractable_info?.map((info, index) => ({
    key: String(index),
    label: info.information,
    content: info.data,
    entity_abstract: info.entity_abstract,  // entity_abstractも追加
  })) || [];

  // 現在選択されているinformationタブのデータ
  const selectedData = tabs[selectedTab]?.content || [];
  const selectedEntityAbstract = tabs[selectedTab]?.entity_abstract || '';  // entity_abstractを取得

  const headers = ["Time", "Value"];
  const tableRows = selectedData.map((row, index) => (
    <tr key={index}>
      <td>{convertFiscalYearToDate(row.time)}</td>
      <td>{row.value.toLocaleString()}</td>
    </tr>
  ));

  const chartData = {
    labels: selectedData.map((item) => convertFiscalYearToDate(item.time)),
    datasets: [
      {
        label: tabs[selectedTab]?.label || '',
        data: selectedData.map((item) => item.value),
        backgroundColor: "rgba(75,192,192,0.6)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: tabs[selectedTab]?.label || '',
      },
    },
  };

  // source_idごとのタブの定義
  const sourceTabs: TabsProps['items'] = sources.map((source, index) => ({
    key: String(index),
    label: source.source_filename,
    children: (
      <div>
        <div className={styles.description}>
        </div>
        <Tabs
          activeKey={String(selectedTab)}
          onChange={(key) => setSelectedTab(Number(key))}
          items={tabs.map((tab, idx) => ({
            key: String(idx),
            label: tab.label,
            children: (
              <div>
                <div className={styles.description}>
                  <h3>データ概要</h3>
                  <p>{source.source_abstract}</p>  {/* source_abstractの表示 */}
                  <p>{tab.entity_abstract}</p>  {/* entity_abstractの表示 */}
                </div>
                <div className={styles.chartContainer}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
                    </thead>
                    <tbody>{tableRows}</tbody>
                  </table>
                </div>
              </div>
            ),
          }))}
        />
      </div>
    ),
  }));

  return (
    <>
      <Navbar />
      <div className={styles.mainContainer}>
        <div className={styles.container}>
          <FileUpload />
          <h2 className={styles.title}></h2>

          {/* source_idごとのタブ (Ant DesignのTabs) */}
          <Tabs
            activeKey={String(selectedSourceIndex)}
            onChange={(key) => {
              setSelectedSourceIndex(Number(key));
              setSelectedTab(0);  // 新しいsourceに切り替えたとき、最初のタブを表示
            }}
            items={sourceTabs}
          />
        </div>
      </div>
    </>
  );
};

export default ExcelAnalysis;
