import React, { useState, useCallback } from 'react';
import { Alert, Button, Row, Col, notification, Spin, Tabs, Tag } from 'antd';
import type { TabsProps } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import FileUpload from '@/components/dashboard/TableAnalysis/FileUpload';
import fetchTable from '@/hooks/useFetchTable';
import fetchDocument from '@/hooks/useFetchDocument';

import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/PdfsFileTabs';
import ProjectManager from '@/components/dashboard/ProjectManager';
import ResultReport from '@/components/dashboard/TableAnalysis/ResultReport';
import IssueAnalysisComponent from '@/components/dashboard/IssueAnalysis/IssueAnalysisComponent';
import QuestionAnswerComponent from '@/components/dashboard/IssueAnalysis/QuestionAnswerComponent';
import MainTable from '@/components/dashboard/Projection/MainTable';
import FinancialTable from '@/components/dashboard/Generator/generateBusinessPlan';

const AnalysisComponents: React.FC = () => {
  // 状態管理
  const [projectChanged, setProjectChanged] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('1');

  // カスタムフックの使用
  const {
    filesTable = [],
    loadingTable = false,
    errorTable = null,
    fetchFilesTable
  } = fetchTable() || {};

  const {
    filesDocument = [],
    loadingDocument = false,
    errorDocument = null,
    fetchFilesDocument
  } = fetchDocument() || {};


  // タブ項目の定義
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <div key="tab-1">
          <div style={{ width: '150px' }}>入力 ドキュメントデータ</div>
          <Tag color='red'>pdf, wordなど</Tag>
        </div>
      ),
      children: <PdfsFileTabs files={filesDocument} />,
      style: { height: '800px' }
    },
    {
      key: '2',
      label: (
        <div key="tab-2">
          <div>入力 テーブルデータ</div>
          <Tag color='green'>xlsx, csvなど</Tag>
        </div>
      ),
      children: <TableFileTabs
        files={filesTable}
      />,
      style: { height: '800px' }
    },
    {
      key: '3',
      label: (
        <div key="tab-3">
          <div style={{ width: '150px' }}>事業計画書 自動作成</div>
          <Tag color='gray'>β版</Tag>
        </div>
      ),
      children: <FinancialTable />,
      //children: <QuestionAnswerComponent />,
      style: { height: '800px' }
    },
    {
      key: '4',
      label: (
        <div key="tab-4">
          <div style={{ width: '150px' }}>出力 Issue Analysis</div>
          <Tag color='gray'>β版</Tag>
        </div>
      ),
      children: <MainTable />,
      style: { height: '800px' }
    },
    /*
    {
      key: '5',
      label: (
        <div key="tab-5">
          <div style={{ width: '150px' }}>出力 分析結果</div>
          <Tag color='orange'>β版</Tag>
        </div>
      ),
      children: <ResultReport />,
      style: { height: '800px' }
    }
    */
  ];

  // プロジェクト変更ハンドラー
  const handleProjectChange = useCallback(async (projectId?: string) => {
    try {
      setIsLoading(true);
      setProjectChanged(true);
      setFetchError(null);

      // プロジェクト変更に関連する処理
      if (projectId) {
        console.log('Project changed to:', projectId);
      }

      // データの再取得
      await Promise.all([
        fetchFilesTable(),
        fetchFilesDocument()
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'プロジェクトの変更中にエラーが発生しました。';

      setFetchError(errorMessage);
      console.error('Project change error:', error);
    } finally {
      setIsLoading(false);
      setProjectChanged(false);
    }
  }, [fetchFilesTable, fetchFilesDocument]);

  // データ更新ハンドラー
  const handleAnalysisButtonClick = useCallback(async () => {
    try {
      setFetchError(null);
      setIsLoading(true);

      await Promise.all([
        fetchFilesTable(),
        fetchFilesDocument()
      ]);

      notification.success({
        message: 'データ読み込み完了',
        description: 'データの読み込みが正常に完了しました。',
      });

    } catch (error) {
      setFetchError('データの更新中にエラーが発生しました。もう一度お試しください。');
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFilesTable, fetchFilesDocument]);

  // タブ変更ハンドラー
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // ローディング状態の統合
  const isLoadingAny = isLoading || loadingTable || loadingDocument;

  // ローディング表示
  {
    isLoadingAny && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Spin size="large" />
      </div>
    )
  }
  <Tabs
    defaultActiveKey="1"
    activeKey={activeTab}
    items={tabItems}
    onChange={handleTabChange}
    centered
  />

  // エラー表示
  if (errorTable || errorDocument || fetchError) {
    return (
      <>
        <ProjectManager onProjectChange={handleProjectChange} />
        <FileUpload />
        <Alert
          message="データがまだありません"
          type="info"
          style={{ marginTop: '20px' }}
        />
        <Button
          onClick={handleAnalysisButtonClick}
          type="primary"
          style={{ marginTop: '10px' }}
        >
          読み込む
        </Button>
      </>
    );
  }


  return (
    <>
      <ProjectManager onProjectChange={handleProjectChange} />
      <FileUpload />

      <div style={{ minHeight: '200px' }}>
        <Button
          onClick={handleAnalysisButtonClick}
          type="primary"
          style={{ margin: '10px 0px 0px 20px' }}
          icon={<ReloadOutlined />}
          loading={isLoading}
        >
          ファイル情報を更新する
        </Button>

        <Row justify="center" style={{ marginTop: '20px' }}>
          <Col span={18}>
            <Tabs
              defaultActiveKey="1"
              activeKey={activeTab}
              items={tabItems}
              onChange={handleTabChange}
              centered
            />
          </Col>
        </Row>
      </div>

      <style jsx global>{`
        .compact-table .ant-table-cell {
          padding: 4px 8px !important;
        }
      `}</style>
    </>
  );
};

export default React.memo(AnalysisComponents);
