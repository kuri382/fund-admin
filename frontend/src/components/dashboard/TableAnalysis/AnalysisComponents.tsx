import React, { useState, useCallback } from 'react';
import { Button, message, Row, Col, Spin, Alert, Tabs, Tag } from 'antd';
import type { TabsProps } from 'antd';
import FileUpload from '@/components/dashboard/old/FileUpload';

import fetchTable from '@/hooks/useFetchTable';
import fetchDocument from '@/hooks/useFetchDocument';

import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/PdfsFileTabs';
import ProjectManager from '@/components/dashboard/ProjectManager';
import ResultReport from '@/components/dashboard/TableAnalysis/ResultReport';
import IssueAnalysisComponent from '@/components/dashboard/IssueAnalysis/IssueAnalysisComponent';
import QuestionAnswerComponent from '@/components/dashboard/IssueAnalysis/QuestionAnswerComponent';

// 型定義
interface FetchError {
  message: string;
  code?: string;
  details?: unknown;
}

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

  const handleUploadComplete = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      await Promise.all([
        fetchFilesTable(),
        fetchFilesDocument()
      ]);

      message.success('ファイルリストを更新しました');
    } catch (error) {
      setFetchError('データの更新中にエラーが発生しました。');
      console.error('Fetch error after upload:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFilesTable, fetchFilesDocument]);

  // タブ項目の定義
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <div key="tab-1">
          <div>入力 テーブルデータ</div>
          <Tag color='green'>xlsx, csvなど</Tag>
        </div>
      ),
      children: <TableFileTabs files={filesTable} />,
      style: { height: '800px' }
    },
    {
      key: '2',
      label: (
        <div key="tab-2">
          <div style={{ width: '150px' }}>入力 ドキュメントデータ</div>
          <Tag color='red'>pdf, wordなど</Tag>
        </div>
      ),
      children: <PdfsFileTabs files={filesDocument} />,
      style: { height: '800px' }
    },
    {
      key: '3',
      label: (
        <div key="tab-3">
          <div style={{ width: '150px' }}>出力 QA一覧</div>
          <Tag color='gray'>β版</Tag>
        </div>
      ),
      children: <QuestionAnswerComponent />,
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
      children: <IssueAnalysisComponent />,
      style: { height: '800px' }
    },
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
  if (isLoadingAny) {
    return (
      <>
        <ProjectManager onProjectChange={handleProjectChange} />
        <FileUpload onUploadComplete={handleUploadComplete} />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Spin size="large" />
          <p>データを読み込んでいます...</p>
        </div>
      </>
    );
  }

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

  // メインのレンダリング
  return (
    <>
      <ProjectManager onProjectChange={handleProjectChange} />
      <FileUpload />
      <Button
        onClick={handleAnalysisButtonClick}
        type="primary"
        style={{ marginBottom: '20px', margin: '10px' }}
      >
        読み込んだファイル情報を更新
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

      <style jsx global>{`
        .compact-table .ant-table-cell {
          padding: 4px 8px !important;
        }
      `}</style>
    </>
  );
};

export default React.memo(AnalysisComponents);
