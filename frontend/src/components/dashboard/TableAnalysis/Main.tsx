import React, { useState, useCallback } from 'react';
import { Row, Col, Space, Button, notification } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import FileUpload from '@/components/dashboard/TableAnalysis/FileUpload';
import fetchTable from '@/hooks/useFetchTable';
import fetchDocument from '@/hooks/useFetchDocument';
import ProjectManager from '@/components/dashboard/ProjectManager';
import TaskCount from './Tasks/TaskCount';
import AnalysisTabs from './Home/AnalysisTabs';
import LoadingOverlay from './Home/LoadingOverlay';
import ErrorNotification from './Home/ErrorNotification';

const AnalysisComponents: React.FC = () => {
  // 状態管理
  const [projectChanged, setProjectChanged] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('1');

  // カスタムフックでデータフェッチ
  const { filesTable, loadingTable, errorTable, fetchFilesTable } = fetchTable() || {};
  const { filesDocument, loadingDocument, errorDocument, fetchFilesDocument } = fetchDocument() || {};

  // ローディング状態の統合
  const isLoadingAny = isLoading || loadingTable || loadingDocument;

  // プロジェクト変更ハンドラー
  const handleProjectChange = useCallback(async (projectId?: string) => {
    try {
      setIsLoading(true);
      setProjectChanged(true);
      setFetchError(null);

      if (projectId) {
        console.log('Project changed to:', projectId);
      }

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

  return (
    <>
      <ProjectManager onProjectChange={handleProjectChange} />
      <FileUpload onUploadComplete={() => {
        // アップロード完了後、5秒後にデータ更新を実行
        setTimeout(() => {
          handleAnalysisButtonClick();
        }, 5000);
      }} />

      <LoadingOverlay isLoading={isLoadingAny} />

      {(errorTable || errorDocument || fetchError) ? (
        <ErrorNotification onReload={handleAnalysisButtonClick} />
      ) : (
        <div style={{ minHeight: '200px' }}>
          <Space align="center" style={{ padding: '10px' }}>
            {/* ファイル更新を行うボタンを表示しない
            <Button
              onClick={handleAnalysisButtonClick}
              type="primary"
              style={{ margin: '0 0 0 20px' }}
              icon={<ReloadOutlined />}
              loading={isLoading}
            >
              ファイル情報を更新する
            </Button>
           */}

            <TaskCount />
          </Space>

          <Row justify="center" style={{ marginTop: '20px' }}>
            <Col span={22}>
              <AnalysisTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                filesTable={filesTable}
                filesDocument={filesDocument}
              />
            </Col>
          </Row>
        </div>
      )}

      <style jsx global>{`
        .compact-table .ant-table-cell {
          padding: 4px 8px !important;
        }
      `}</style>
    </>
  );
};

export default React.memo(AnalysisComponents);
