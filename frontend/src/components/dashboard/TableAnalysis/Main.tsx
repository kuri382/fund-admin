import React, { useState, useCallback } from 'react';
import { Button, Row, Col, Space, message, Collapse } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import FileUpload from '@/components/dashboard/TableAnalysis/FileUpload';
import fetchTable from '@/hooks/useFetchTable';
import fetchDocument from '@/hooks/useFetchDocument';
import ProjectManager from '@/components/dashboard/ProjectManager';
import TaskCount from './Tasks/TaskCount';
import AnalysisTabs from './Home/AnalysisTabs';
import LoadingOverlay from './Home/LoadingOverlay';
import ErrorNotification from './Home/ErrorNotification';


const { Panel } = Collapse;

const AnalysisComponents: React.FC = () => {
  const [projectChanged, setProjectChanged] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('1');

  // カスタムフックでデータ・ローディング・エラーを取得
  const { filesTable, loadingTable, errorTable, fetchFilesTable } = fetchTable() || {};
  const { filesDocument, loadingDocument, errorDocument, fetchFilesDocument } = fetchDocument() || {};

  // どちらかがロード中であればローディングを表示する
  const isLoadingAny = loadingTable || loadingDocument;

  // プロジェクトが切り替わったときの処理
  const handleProjectChange = useCallback(async (projectId?: string) => {
    try {
      setProjectChanged(true);
      if (projectId) {
        console.log('Project changed to:', projectId);
      }
      await Promise.all([
        fetchFilesTable(),
        fetchFilesDocument()
      ]);
    } catch (error) {
      console.error('Project change error:', error);
    } finally {
      setProjectChanged(false);
    }
  }, [fetchFilesTable, fetchFilesDocument]);

  // 「分析」や更新ボタンを押した時の処理
  const handleAnalysisButtonClick = useCallback(async () => {
    try {
      await Promise.all([
        fetchFilesTable(),
        fetchFilesDocument()
      ]);
      message.success('データの読み込みが正常に完了しました。');
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [fetchFilesTable, fetchFilesDocument]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div>
      <Row justify="center" style={{ paddingTop: '10px' }}>
        <Col span={22}>
          <Collapse
            defaultActiveKey={['1']}
          >
            <Panel
              header={<span style={{ fontWeight: "bold" }}>プロジェクト設定</span>}
              key="1"
            >
              <Row gutter={[16, 16]} style={{ padding: '10px' }}>
                <Col xs={24} md={12}>
                  <p><b>プロジェクト</b></p>
                  <ProjectManager onProjectChange={handleProjectChange} />
                </Col>

                <Col xs={24} md={12}>
                  <p><b>ファイルアップロード</b></p>

                  <FileUpload />
                  {/*onUploadComplete={() => {
                      // アップロード完了後、20秒後にデータ更新
                      setTimeout(() => {
                        handleAnalysisButtonClick();
                      }, 20000);
                    }}
                  />
                  */}
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Col>
      </Row>

      {/* ローディング状態が true ならオーバーレイを表示 */}
      <LoadingOverlay isLoading={isLoadingAny} />

      {/* フェッチ時に発生したエラーがあればErrorNotificationを表示 */}
      {(errorTable || errorDocument) ? (
        <ErrorNotification onReload={handleAnalysisButtonClick} />
      ) : (
        <div style={{ minHeight: '200px', marginTop: '20px' }}>
          <Row justify="center" style={{ marginTop: '20px' }}>
            <Col span={22}>
              <Row>
                <Col span={18}>
                  <Space align="center">
                    <TaskCount />
                  </Space>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Button
                    type="default"
                    icon={<ReloadOutlined />}
                    onClick={handleAnalysisButtonClick}
                  >
                    ファイルを最新版にする
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>


          <Row justify="center" style={{ marginTop: '20px' }}>
            <Col span={22}>
              <AnalysisTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                filesTable={filesTable}
                filesDocument={filesDocument}
                projectChanged={projectChanged}
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
    </div>
  );
};

export default React.memo(AnalysisComponents);
