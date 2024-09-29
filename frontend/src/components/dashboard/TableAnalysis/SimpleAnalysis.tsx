import React from 'react';
import { Button, Row, Col, Spin, Alert, Tabs, Tag } from 'antd';
import FileUpload from '@/components/FileUpload';

import fetchTable from '@/hooks/fetchTable';
import fetchDocument from '@/hooks/fetchDocument';

import TableFileTabs from '@/components/dashboard/TableAnalysis/TablesFileTabs';
import PdfsFileTabs from '@/components/dashboard/TableAnalysis/PdfsFileTabs';

const ExcelFileTabs: React.FC = () => {
  const { filesTable, loadingTable, errorTable, fetchFilesTable } = fetchTable();
  const { filesDocument, loadingDocument, errorDocument, fetchFilesDocument } = fetchDocument();

  const handleAnalysisButtonClick = () => {
    fetchFilesTable();
    fetchFilesDocument();
  };

  return (
    <>
      <FileUpload />
      <Button onClick={handleAnalysisButtonClick} type="primary" style={{ marginBottom: '20px', margin: '10px' }}>
        読み込んだファイルを解析する
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
                  <div>テーブルデータ</div>
                  <Tag color='green'>xlsx, csvなど</Tag>
                </>
              } key="1">
                <TableFileTabs files={filesTable} />
              </Tabs.TabPane>

              <Tabs.TabPane tab={
                <>
                  <div>ドキュメントデータ</div>
                  <Tag color='red'>pdf, wordなど</Tag>
                </>
              } key="2">
                <PdfsFileTabs files={filesDocument} />
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

export default ExcelFileTabs;
