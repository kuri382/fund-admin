import React, { useState, useEffect } from 'react';
import { Row, Col, List, Tag, Typography } from 'antd';
import ImageSummaryList from '@/components/dashboard/DocumentsSummary/ImageSummaryList';
import SummaryModal from '@/components/dashboard/DocumentsSummary/SummaryModal';

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
  minHeight: '200px',
  maxHeight: '800px',
  overflow: 'auto',
  padding: '10px'
};

const PdfsFileTabs: React.FC<PdfsFileTabsProps> = ({ files = [] }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(
    files.length > 0 ? 0 : null
  );

  // ファイル一覧が変化したら、selectedFileIndex の範囲を補正する
  useEffect(() => {
    if (files.length === 0) {
      // ファイルが空になった場合は選択を解除
      setSelectedFileIndex(null);
    } else if (selectedFileIndex === null) {
      // 未選択の場合、強制的に先頭を選択させる
      setSelectedFileIndex(0);
    } else if (selectedFileIndex >= files.length) {
      // 選択中のインデックスがファイル数を超えてしまった場合は修正
      setSelectedFileIndex(files.length - 1);
    }
  }, [files, selectedFileIndex]);

  const selectedFile =
    selectedFileIndex !== null && selectedFileIndex < files.length
      ? files[selectedFileIndex]
      : null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#ffffff',
      borderRight: '1px solid #f0f0f0',
      borderBottom: '1px solid #f0f0f0',
      borderLeft: '1px solid #f0f0f0',
      borderTopRightRadius: '5px',
    }}>
      <Row style={{ height: '100%', paddingTop: '16px' }}>
        {/* 左カラム: ファイル一覧 */}
        <Col
          span={6}
          style={{
            maxHeight: '800px',
            overflowY: 'auto',
            padding: '10px',
          }}
        >
          <List
            dataSource={files}
            split
            bordered
            renderItem={(file, index) => {
              const extension = getFileExtension(file.file_name);
              const tagColor = getExtensionColor(extension);
              return (
                <List.Item
                  key={file.file_uuid}
                  onClick={() => setSelectedFileIndex(index)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor:
                      index === selectedFileIndex ? '#cdcdcd' : 'transparent'
                  }}
                >
                  <div>
                    <Typography.Text strong>{file.file_name}</Typography.Text>
                    <div style={{ fontSize: '11px', color: 'gray' }}>
                      {file.abstract.slice(0, 18)}...
                      <br />
                      <Tag color={tagColor}>{extension}</Tag>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </Col>

        {/* 右カラム: 選択中のファイル詳細表示 */}
        <Col span={18}>
          {selectedFile ? (
            <div key={selectedFile.file_uuid} style={styleTabPane}>
              <Tag color="blue">{selectedFile.category}</Tag>
              <p>ファイル概要</p>
              <p style={{ marginBottom: '20px' }}>{selectedFile.abstract}</p>
              <p>{selectedFile.feature}</p>
              <SummaryModal file_uuid={selectedFile.file_uuid} />
              <ImageSummaryList file_uuid={selectedFile.file_uuid} />
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <Typography.Text type="secondary">
                左のリストからファイルを選択してください
              </Typography.Text>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default PdfsFileTabs;
