import React, { useEffect, useState } from 'react';
import { Alert, Col, Row, Tabs, Table, message, Spin, Tag, Button } from 'antd';
import axios from 'axios';
import { api } from '@/utils/api';
import { auth } from '@/services/firebase';
import FileUpload from '@/components/FileUpload';

interface FileData {
  file_name: string;
  data: any[];
  abstract: string;
  category: string;
  feature: string;
}

const ExcelFileTabs: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = `${api.baseUrl}/upload/files`;
        const accessToken = await user.getIdToken(/* forceRefresh */ true);
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setFiles(response.data.files);
      } catch (err) {
        message.error('データがまだありません');
        setError('データがまだありません');
      } finally {
        setLoading(false);
      }
    } else {
      setError("分析ボタンを押してください");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const renderInvisibleUnnamed = (text: string) => {
    return (
      <span>
        {text.split(/(\bUnnamed:\s*\d+\b)/).map((part, index) => (
          part.match(/\bUnnamed:\s*\d+\b/) ?
            <span key={index} style={{ color: 'transparent' }}>{part}</span> :
            part
        ))}
      </span>
    );
  };

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <p>データがありません</p>;
    }

    const columns = Object.keys(data[0]).map((key) => ({
      title: renderInvisibleUnnamed(key),
      dataIndex: key,
      key,
      render: (text: string) => renderInvisibleUnnamed(text?.toString() || '-'),
    }));

    return (
      <Table
        dataSource={data}
        columns={columns}
        pagination={false}
        size="small"
        style={{
          fontSize: '10px',
        }}
        className="compact-table"
      />
    );
  };

  return (
    <>
      <FileUpload />
      <Button onClick={fetchFiles} type="primary" style={{ marginBottom: '20px', margin: '10px' }}>
        読み込んだファイルを解析する
      </Button>
      {loading && <Spin size="large" />}
      {error && <Alert message={error} type="error" />}
      {!loading && !error && files.length > 0 && (
        <Row justify="center" style={{ marginTop: '20px' }}>
          <Col span={16}>
            <Tabs>
              {files.map((file) => (
                <Tabs.TabPane
                  tab={
                    <>
                      <div>{(file.file_name)}</div>
                      <div style={{ fontSize: '12px', color: 'gray' }}>{(file.abstract.slice(0, 30))}...</div>
                    </>
                  }
                  key={file.file_name}
                >
                  <Row justify="center">
                    <Col span={20} style={{ maxHeight: '400px', overflow: 'auto' }}>
                      <Tag color="blue">{(file.category)}</Tag>
                      <p style={{ marginBottom: '20px' }}>{(file.abstract)}</p>
                      <Alert message={`分析: ${file.feature}`} type="info" showIcon style={{ marginBottom: '20px' }} />
                      {renderTable(file.data)}
                    </Col>
                  </Row>
                </Tabs.TabPane>
              ))}
            </Tabs>
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