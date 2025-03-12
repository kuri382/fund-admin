import React, { useState } from 'react';
import { Row, Col, List, Tag, Typography } from 'antd';
import ImageSummaryList from '@/components/dashboard/Generator/ImageSummaryList';

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

// 右側コンテンツに適用するスタイル（元の styleTabPane を踏襲）
const styleTabPane: React.CSSProperties = {
  minHeight: '200px',
  maxHeight: '800px',
  overflow: 'auto',
  padding: '10px'
};

const PdfsFileTabs: React.FC<PdfsFileTabsProps> = ({ files }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  // 現在選択されているファイルデータ
  const selectedFile = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#f7f7f7',
      borderRadius: '3px'
    }}>
      <Row style={{ height: '100%' }}>
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
        <Col span={18} >
          {selectedFile ? (
            <div style={styleTabPane}>
              {/* カテゴリ */}
              <Tag color="blue">{selectedFile.category}</Tag>
              <p>ファイル概要</p>
              <p style={{ marginBottom: '20px' }}>{selectedFile.abstract}</p>
              {/* ここで feature 等も表示したい場合は追記 */}
              <p>特徴: {selectedFile.feature}</p>

              {/* PDF や画像の要約リスト (既存コンポーネント) */}
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
