import React, { useState } from 'react';
import { Button, Row, Col, Spin, Alert, Tabs, Tag, Space } from 'antd';
import { AndroidOutlined, AppleOutlined } from '@ant-design/icons';
import FileUpload from '@/components/dashboard/old/FileUpload';

import fetchTable from '@/hooks/useFetchTable';
import fetchDocument from '@/hooks/useFetchDocument';

import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/PdfsFileTabs';
import ProjectManager from '@/components/dashboard/ProjectManager';
import ResultReport from '@/components/dashboard/TableAnalysis/ResultReport';
import ABEJAReport from '@/components/dashboard/TableAnalysis/ABEJAReport';
import IssueAnalysisComponent from '@/components/dashboard/IssueAnalysis/IssueAnalysisComponent';
import QuestionAnswerComponent from '@/components/dashboard/IssueAnalysis/QuestionAnswerComponent';

const AnalysisComponents: React.FC = () => {
  const { filesTable, loadingTable, errorTable, fetchFilesTable } = fetchTable();
  const { filesDocument, loadingDocument, errorDocument, fetchFilesDocument } = fetchDocument();

  const [projectChanged, setProjectChanged] = useState(false);  // プロジェクト変更の状態を管理

  const handleProjectChange = () => {
    setProjectChanged(true);  // プロジェクト変更を検知
  };

  const handleAnalysisButtonClick = () => {
    fetchFilesTable();
    fetchFilesDocument();
  };

  React.useEffect(() => {
    if (projectChanged) {
      fetchFilesTable();  // プロジェクトが変わったらデータを再取得
      fetchFilesDocument();
      setProjectChanged(false);  // 状態をリセット
    }
  }, [projectChanged]);

  return (
    <>
      <ProjectManager onProjectChange={handleProjectChange} />
      <FileUpload />
      <Button onClick={handleAnalysisButtonClick} type="primary" style={{ marginBottom: '20px', margin: '10px' }}>
        読み込んだファイル情報を更新
      </Button>
      {loadingTable && <Spin size="small" />}
      {errorTable && <Alert message={errorTable} type="error" />}
      {!loadingTable && !errorTable && filesTable.length > 0 && (
        <Row justify="center" style={{ marginTop: '20px' }}>
          <Col span={18}>
            <Tabs
              defaultActiveKey="1"
              centered
            >

              <Tabs.TabPane tab={
                <>
                  <div>入力 テーブルデータ</div>
                  <Tag color='green'>xlsx, csvなど</Tag>
                </>
              }
                key="1"
                style={{ height: '800px' }}
              >
                <TableFileTabs files={filesTable} />
              </Tabs.TabPane>

              <Tabs.TabPane tab={
                <>
                  <div style={{ width: '150px' }}>入力 ドキュメントデータ</div>
                  <Tag color='red'>pdf, wordなど</Tag>
                </>
              }
                key="2"
                style={{ height: '800px' }}
              >
                <PdfsFileTabs files={filesDocument} />
              </Tabs.TabPane>

              <Tabs.TabPane tab={
                <>
                  <div style={{ width: '150px' }}>出力 QA一覧</div>
                  <Tag color='gray'>β版</Tag>
                </>
              } key="3"
                style={{ height: '800px' }}
              >
                <QuestionAnswerComponent />
              </Tabs.TabPane>

              <Tabs.TabPane tab={
                <>
                  <div style={{ width: '150px' }}>出力 Issue Analysis</div>
                  <Tag color='gray'>β版</Tag>
                </>
              } key="4"
                style={{ height: '800px' }}
              >
                <IssueAnalysisComponent />
              </Tabs.TabPane>

              <Tabs.TabPane tab={
                <>
                  <div style={{ width: '150px' }}>出力 分析結果</div>
                  <Tag color='orange'>β版</Tag>
                </>
              } key="5"
                style={{ height: '800px' }}
              >
                {/*<ResultReport />*/}
                <ABEJAReport />
              </Tabs.TabPane>

            </Tabs>
          </Col>
        </Row>
      )}
      {!loadingTable && !errorTable && filesTable.length === 0 && (
        <Alert message="ファイルがアップロードされていません。上記のアップロードモジュールを使用してファイルをアップロードしてください。" type="info" />
      )}
      <style jsx global>{`
        .compact-table .ant-table-cell {
          padding: 4px 8px !important;
        }
      `}</style>
    </>
  );
};

export default AnalysisComponents;
