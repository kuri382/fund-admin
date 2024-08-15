"use client"

import React, { useState } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadPDF } from '@/api/api';

const FileUpload: React.FC = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');

  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setUploading(true);
    try {
      const uploadedFileName = await uploadPDF(file);
      setFileName(`${uploadedFileName} (アップロード完了)`);
      message.success('ファイルが正常にアップロードされました');
    } catch (error) {
      setFileName(`${file.name} (アップロード失敗)`);
      message.error('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Upload
      beforeUpload={(file) => {
        handleUpload(file);
        return false;
      }}
      showUploadList={false}
    >
      <Button icon={<UploadOutlined />} loading={uploading}>
        {fileName || 'PDFファイルを選択'}
      </Button>
    </Upload>
  );
};

export default FileUpload;
