import React from 'react';
import { Tabs, Row, Col, Tag, Alert } from 'antd';
import FileTable from '@/components/dashboard/TableAnalysis/FileTable';

interface FileDocumentData {
  file_name: string;
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
}

const PdfsFileTabs: React.FC<PdfsFileTabsProps> = ({ files }) => {
  return (
    <Tabs
      type="card"
    >
      {files.map((file, index) => {
        const extension = getFileExtension(file.file_name);
        const tagColor = getExtensionColor(extension);

        return (
          <Tabs.TabPane
            tab={
              <>
                <div>{file.file_name}</div>
                <div style={{ fontSize: '11px', color: 'gray' }}>{file.abstract.slice(0, 18)}...
                  <br />
                  <Tag color={tagColor}>{extension}</Tag>
                </div>
              </>
            }
            key={`${file.file_name}_${index}`}
            style={{ background: '#f0f6fa' }}
          >
            <Row justify="center">
              <Col span={24} style={styleTabPane}>
                <Tag color="blue">{file.category}</Tag>
                <p style={{ marginBottom: '20px' }}>{file.abstract}</p>
                <Alert message={`分析: ${file.feature}`} type="info" showIcon style={{ marginBottom: '20px' }} />
              </Col>
            </Row>
          </Tabs.TabPane>
        )
      })}
    </Tabs>
  );
};

export default PdfsFileTabs;
