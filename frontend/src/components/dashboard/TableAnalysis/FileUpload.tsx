"use client"
import { useState, useCallback } from 'react'
import axios from "axios"
import { Upload, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { api } from '@/utils/api'
import { auth } from '@/services/firebase'

const { Dragger } = Upload

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

  const handleUploadComplete = useCallback(() => {
    if (onUploadComplete) {
      onUploadComplete();
      message.success('ファイル情報を更新しました');
    }
  }, [onUploadComplete]);

  const props = {
    name: 'file',
    multiple: true,
    beforeUpload: (file: File, fileList: File[]) => {
      if (fileList.length > 20) {
        message.error('一度にアップロードできるファイルは最大20ファイルまでです。');
        return Upload.LIST_IGNORE; // このファイルはリストから無視する
      }
      return true; // アップロードを続行
    },
    customRequest: async ({ file, onSuccess, onError }: any) => {
      const user = auth.currentUser;
      if (user) {
        try {
          setUploadingCount(prev => prev + 1);
          message.loading(`${file.name}を分析しています...`);

          const accessToken = await user.getIdToken(true);
          //const apiUrl = `${api.baseUrl}/upload/task`;
          const apiUrl = `${api.baseUrl}/upload`; //debug用
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

          // アップロード中のファイル数を更新し、すべて完了したら処理完了を呼び出す
          setUploadingCount(prev => {
            const newCount = prev - 1;
            if (newCount === 0) {
              handleUploadComplete();
            }
            return newCount;
          });

        } catch (err: any) {
          console.error('Upload error:', err);
          setUploadingCount(prev => prev - 1);

          if (axios.isAxiosError(err) && err.response) {
            const { status, data } = err.response;

            if (status === 429) {
              message.error(`データ容量が大きすぎるため、現在は対応できないファイルです。申し訳ありません。`);
            } else if (status === 500) {
              message.error(`現在は対応できないファイルです。申し訳ありません。`);
            } else {
              message.error(`${file.name} ファイルのアップロードに失敗しました: ${data?.detail || '不明なエラー'}`);
            }
          }
          onError(err);
        }
      } else {
        onError({ message: 'ユーザーがサインインしていません。' });
        message.error('ユーザーがサインインしていません。');
      }
    },
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'error') {
        message.error(`${info.file.name} ファイルのアップロードに失敗しました。`);
      }
    },
  };

  return (
    <Card bordered={false}>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          クリックまたはドラッグして複数のファイルをアップロード
        </p>
        <p className="ant-upload-hint">
          20ファイルまで同時にアップロードできます。
        </p>
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
