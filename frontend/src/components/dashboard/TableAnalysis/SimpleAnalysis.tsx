import React from 'react';
import { Button, Row, Col, Spin, Alert } from 'antd';
import FileUpload from '@/components/FileUpload';
import useFetchFiles from '@/hooks/useFetchFiles';
import FileTabs from '@/components/dashboard/TableAnalysis/FileTabs';

const ExcelFileTabs: React.FC = () => {
  const { files, loading, error, fetchFiles } = useFetchFiles();

  return (
    <>
      <FileUpload />
      <Button onClick={fetchFiles} type="primary" style={{ marginBottom: '20px', margin: '10px' }}>
        読み込んだファイルを解析する
      </Button>
      {loading && <Spin size="small" />}
      {error && <Alert message={error} type="error" />}
      {!loading && !error && files.length > 0 && (
        <Row justify="center" style={{ marginTop: '20px' }}>
          <Col span={16}>
            <FileTabs files={files} />
          </Col>
        </Row>
      )}
      {!loading && !error && files.length === 0 && (
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
