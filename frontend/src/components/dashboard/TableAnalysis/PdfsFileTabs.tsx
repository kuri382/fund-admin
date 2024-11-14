import React from 'react';
import { Tabs, Row, Col, Tag, Alert } from 'antd';
import type { TabsProps } from 'antd';

import ImageListComponent from '@/components/dashboard/Generator/ImageUUIDViewer';

interface FileDocumentData {
  file_name: string;
  file_uuid: string;
  abstract: string;
  category: string;
  feature: string;
}

interface PdfsFileTabsProps {
  files: FileDocumentData[];
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

const PdfsFileTabs: React.FC<PdfsFileTabsProps> = ({ files }) => {
  const items: TabsProps['items'] = files.map((file, index) => {
    const extension = getFileExtension(file.file_name);
    console.log(file.file_uuid);
    const tagColor = getExtensionColor(extension);

    return {
      key: `${file.file_name}_${index}`,
      label: (
        <div key={`tab-label-${file.file_name}-${index}`}>
          <div>{file.file_name}</div>
          <div style={{ fontSize: '11px', color: 'gray' }}>
            {file.abstract.slice(0, 18)}...
            <br />
            <Tag color={tagColor}>{extension}</Tag>
          </div>
        </div>
      ),
      children: (
        <>
        <Row justify="center" key={`tab-content-${file.file_name}-${index}`}>
          <Col span={24} style={styleTabPane}>
            <Tag color="blue">{file.category}</Tag>
            <p style={{ marginBottom: '20px' }}>{file.abstract}</p>
            <Alert
              message={`分析: ${file.feature}`}
              type="info"
              showIcon
              style={{ marginBottom: '20px' }}
            />
          </Col>
        </Row>
        <ImageListComponent uuid={file.file_uuid} />
        </>
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

export default PdfsFileTabs;
