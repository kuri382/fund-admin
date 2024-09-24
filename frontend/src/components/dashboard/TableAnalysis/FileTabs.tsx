import React from 'react';
import { Tabs, Row, Col, Tag, Alert } from 'antd';
import FileTable from '@/components/dashboard/TableAnalysis/FileTable';

interface FileData {
  file_name: string;
  data: any[];
  abstract: string;
  category: string;
  feature: string;
}

interface FileTabsProps {
  files: FileData[];
}

const styleTabPane: React.CSSProperties = {
  minHeight: '400px',
  maxHeight: '600px',
  overflow: 'auto',
  padding: '5px'
}

const FileTabs: React.FC<FileTabsProps> = ({ files }) => (
  <Tabs>
    {files.map((file) => (
      <Tabs.TabPane
        tab={
          <>
            <div>{file.file_name}</div>
            <div style={{ fontSize: '12px', color: 'gray' }}>{file.abstract.slice(0, 30)}...
            </div>
          </>
        }
        key={file.file_name}
        style={{background: '#f0f6fa'}}
      >
        <Row justify="center">
          <Col span={24} style={styleTabPane}>
            <Tag color="blue">{file.category}</Tag>
            <p style={{ marginBottom: '20px' }}>{file.abstract}</p>
            <Alert message={`分析: ${file.feature}`} type="info" showIcon style={{ marginBottom: '20px' }} />
            <FileTable data={file.data} />
          </Col>
        </Row>
      </Tabs.TabPane>
    ))}
  </Tabs>
);

export default FileTabs;
