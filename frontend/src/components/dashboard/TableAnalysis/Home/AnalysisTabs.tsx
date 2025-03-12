import React from 'react';
import { Tabs, Tag } from 'antd';
import type { TabsProps } from 'antd';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/Home/PdfsFileTabs';
import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import MainTable from '@/components/dashboard/Projection/MainTable';

interface AnalysisTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  filesTable: any[];
  filesDocument: any[];
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
  activeTab,
  onTabChange,
  filesTable,
  filesDocument
}) => {
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <div>
          <div style={{ width: '150px' }}>入力 ドキュメントデータ</div>
          <Tag color="red">pdf分析ができます</Tag>
        </div>
      ),
      children: <PdfsFileTabs files={filesDocument} />,
      style: { height: '800px' }
    },
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
    {
      key: '3',
      label: (
        <div>
          <div style={{ width: '150px' }}>事業計画書自動作成</div>
          <Tag color="gray">数値はバックグラウンドで収集されます</Tag>
        </div>
      ),
      children: <MainTable projectChanged={false} />,
      style: { height: '800px' }
    }
  ];

  return (
    <Tabs
      defaultActiveKey="1"
      activeKey={activeTab}
      items={tabItems}
      onChange={onTabChange}
      centered
    />
  );
};

export default AnalysisTabs;
