import React from 'react';
import { Tabs, Tag } from 'antd';
import type { TabsProps } from 'antd';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/Home/PdfsFileTabs';
import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import ChatMain from '@/components/dashboard/Chat/ChatMain';
import MainTable from '@/components/dashboard/Projection/MainTable';

import "@/styles/dashboard.css";

interface AnalysisTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  filesTable: any[];
  filesDocument: any[];
  projectChanged: boolean;
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
  activeTab,
  onTabChange,
  filesTable,
  filesDocument,
  projectChanged,
}) => {
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <div>
          <div style={{ width: '150px' }}>入力 ドキュメントデータ</div>
          <Tag color="red">PDF資料の分析ができます</Tag>
        </div>
      ),
      children: <PdfsFileTabs files={filesDocument} />,
      style: { height: '800px' }
    },
    /*
    {
      key: '2',
      label: (
        <div>
          <div>入力 テーブルデータ</div>
          <Tag color="green">次回アップデート：xlsx, csvの整理</Tag>
        </div>
      ),
      children: <TableFileTabs files={filesTable} />,
      style: { height: '800px' }
    },
    */
    {
      key: '2',
      label: (
        <div>
          <div style={{ width: '150px' }}>事業計画書自動作成</div>
          <Tag color="orange">自動で集計されたデータの確認ができます</Tag>
        </div>
      ),
      children: <MainTable projectChanged={projectChanged} />,
      style: { height: '800px' }
    },
    {
      key: '3',
      label: (
        <div>
          <div>データ検索</div>
          <Tag color="blue">データの探索が行えます</Tag>
        </div>
      ),
      children: <ChatMain projectChanged={projectChanged} />,
      style: { height: '800px' }
    },
  ];

  return (
    <Tabs
      defaultActiveKey="1"
      activeKey={activeTab}
      items={tabItems}
      onChange={onTabChange}
      tabPosition='top'
      type="card"
    />
  );
};

export default AnalysisTabs;
