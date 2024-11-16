"use client"

import React, { useEffect, useState } from 'react';
import { Select, Button, Col, Row } from 'antd';
import { api } from '@/utils/api';

const { Option } = Select;

const FileDropdown: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await api.uploadedFiles.getUploadedFilesUploadedFilesGet();
      if (response.data) {
        setFiles(response.data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleChange = (value: string) => {
    setSelectedFile(value);
    localStorage.setItem('uploadedFileName', value);
    console.log(`Selected file ${value} saved to localStorage.`);
  };

  return (
    <Row gutter={16} align="middle" style={{ width: '100%' }}>
      <Col flex="auto">
        <Select
          placeholder="-- アップロード済み資料から選ぶ --"
          onChange={handleChange}
          value={selectedFile || undefined}
          style={{ width: '100%' }}
          loading={loading}
        >
          {files.map((file) => (
            <Option key={file} value={file}>
              {file}
            </Option>
          ))}
        </Select>
      </Col>
      <Col flex="400px">
        <Button onClick={loadFiles} loading={loading} style={{ width: '100%' }}>
          再読み込み
        </Button>
      </Col>
    </Row>
  );
};

export default FileDropdown;
