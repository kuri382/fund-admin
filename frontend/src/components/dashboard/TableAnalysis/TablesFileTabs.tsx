import React from 'react';
import { Tabs, Row, Col, Tag, Alert } from 'antd';
import type { TabsProps } from 'antd';
import FileTable from '@/components/dashboard/TableAnalysis/FileTable';

interface FileData {
  file_name: string;
  data: any[];
  abstract: string;
  category: string;
  feature: string;
}

interface TablesFileTabProps {
  files: FileData[];
}

const getExtensionColor = (extension: string) => {
  switch (extension) {
    case 'xlsx':
      return 'green';
    case 'pdf':
      return 'red';
    default:
      return 'blue';
  }
};

const getFileExtension = (fileName: string) => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

const styleTabPane: React.CSSProperties = {
  minHeight: '400px',
  maxHeight: '600px',
  overflow: 'auto',
  padding: '5px'
};

const TablesFileTab: React.FC<TablesFileTabProps> = ({ files = [] }) => {
  if (files.length === 0) {
    return <Alert message="ファイルがありません" type="info" />;
  }

  const items: TabsProps['items'] = files.map((file, index) => {
    const extension = getFileExtension(file.file_name);
    const tagColor = getExtensionColor(extension);
    const uniqueKey = `${file.file_name}_${index}`;

    return {
      key: uniqueKey,
      label: (
        <div key={`tab-label-${uniqueKey}`}>
          <div>{file.file_name}</div>
          <div style={{ fontSize: '11px', color: 'gray' }}>
            {file.abstract.slice(0, 18)}...
            <br />
            <Tag color={tagColor}>{extension}</Tag>
          </div>
        </div>
      ),
      children: (
        <Row justify="center" key={`tab-content-${uniqueKey}`}>
          <Col span={24} style={styleTabPane}>
            <Tag color="blue">{file.category}</Tag>
            <p style={{ marginBottom: '20px' }}>{file.abstract}</p>
            <Alert
              message={`分析: ${file.feature}`}
              type="info"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            <FileTable
              data={file.data.map(item => ({
                ...item,
                key: item.id || `${uniqueKey}-${Math.random().toString(36).substr(2, 9)}`
              }))}
            />
          </Col>
        </Row>
      ),
      style: { background: '#f0f6fa' }
    };
  });

  return (
    <Tabs
      type="card"
      items={items}
    />
  );
};

export default TablesFileTab;
