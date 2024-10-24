"use client"

import { useState } from 'react'
import axios from "axios"
import { Upload, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { api } from '@/utils/api'
import { auth } from '@/services/firebase'

const { Dragger } = Upload

const divUpload: React.CSSProperties = {
  height: '220px',
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '10px',
}

interface FileStatus {
  filename: string;
  status: string;
}

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleUploadComplete = () => {
    message.loading('ファイルの処理を待機しています...', 2);

    // 2秒後にコールバックを実行
    setTimeout(() => {
      if (onUploadComplete) {
        onUploadComplete();
      }
    }, 3000);
  };

  const props = {
    name: 'file',
    multiple: true,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      const user = auth.currentUser;
      if (user) {
        try {
          setUploadingCount(prev => prev + 1);

          const accessToken = await user.getIdToken(true);
          const apiUrl = `${api.baseUrl}/upload`;
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post(apiUrl, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          console.log('Upload success:', response.data);
          const { filename, status } = response.data;
          setFileStatuses(prev => [...prev, { filename, status }]);
          onSuccess();
          message.success(`${filename} ファイルを変換し格納しました`);

          // アップロード完了時の処理
          setUploadingCount(prev => {
            const newCount = prev - 1;
            // すべてのファイルのアップロードが完了したら待機処理を開始
            if (newCount === 0) {
              handleUploadComplete();
            }
            return newCount;
          });

        } catch (err) {
          setUploadingCount(prev => prev - 1);
          onError({ err });
          message.error(`${file.name} ファイルのアップロードに失敗しました。`);
        }
      } else {
        onError({ message: 'ユーザーがサインインしていません。' });
        message.error('ユーザーがサインインしていません。');
      }
    },
    onChange(info: any) {
      const { status } = info.file;
      if (status !== 'uploading') {
        message.success(`${info.file.name} ファイルを分析しています。`);
      }
      if (status === 'error') {
        message.error(`${info.file.name} ファイルのアップロードに失敗しました。`);
      }
    },
  };

  return (
    <Card title="資料をアップロードしてください" style={{ height: '100%' }}>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">クリックまたはドラッグして複数のファイルをアップロード</p>
        <p className="ant-upload-hint">複数のファイルを選択またはドラッグできます</p>
      </Dragger>
      {fileStatuses.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4>アップロード状況:</h4>
          {fileStatuses.map((file, index) => (
            <p key={index} style={{ marginTop: '5px' }}>
              {file.filename}: {file.status}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
