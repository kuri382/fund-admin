"use client"
import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { api } from '@/utils/api'

const { Option } = Select;

const FileDropdown: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await api.uploadedFiles.getUploadedFilesUploadedFilesGet();
        if (response.data) {
          // APIレスポンスの構造に応じて適切にデータを取り出す
          // 例: レスポンスが { files: string[] } の形式だと仮定
          setFiles(response.data.files || []);
        }
      } catch (error) {
        console.error('Failed to fetch files:', error);
        // エラー処理を追加する（例：ユーザーへの通知）
      }
    };
    loadFiles();
  }, []);

  const handleChange = (value: string) => {
    setSelectedFile(value);
    localStorage.setItem('uploadedFileName', value);
    console.log(`Selected file ${value} saved to localStorage.`);
  };

  return (
    <Select
      placeholder="-- サンプルから選ぶ --"
      onChange={handleChange}
      value={selectedFile || undefined}
      style={{ width: '100%' }}
    >
      {files.map((file) => (
        <Option key={file} value={file}>
          {file}
        </Option>
      ))}
    </Select>
  );
};

export default FileDropdown;
