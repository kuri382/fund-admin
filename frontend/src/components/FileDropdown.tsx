"use client"

import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { fetchUploadedFiles } from '@/api/api';

const { Option } = Select;

const FileDropdown: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');

  useEffect(() => {
    const loadFiles = async () => {
      const fetchedFiles = await fetchUploadedFiles();
      setFiles(fetchedFiles);
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
      placeholder="-- ファイルを選択 --"
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

