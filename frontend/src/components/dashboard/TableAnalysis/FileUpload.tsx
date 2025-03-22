"use client"
import { useState, useCallback } from 'react'
import axios, { AxiosResponse } from "axios";
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

interface SignedUrlResponse {
  uploadUrl: string;
  gcsPath: string;
  filename: string;
  fileUuid: string;
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
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!allowedTypes.includes(file.type)) {
        message.error(`${file.name} はサポートされていないファイル形式です。`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    /**
     * customRequestは、ファイルごとのアップロード処理を書き換えられるAPI
     * 署名付きURLを発行 → PUTでアップロード → その後 /task に gcsPath を投げる
     */
    customRequest: async ({ file, onSuccess, onError }: any) => {
      const user = auth.currentUser;
      if (!user) {
        onError({ message: 'ユーザーがサインインしていません。' });
        message.error('ユーザーがサインインしていません。');
        return;
      }

      try {
        setUploadingCount(prev => prev + 1);
        message.loading(`${file.name} をアップロードしています...`);

        // (1) 署名付きURLを発行する
        const accessToken = await user.getIdToken(true);
        const signedUrlRes: AxiosResponse<SignedUrlResponse> = await axios.post(
          `${api.baseUrl}/upload/signed_url`,
          {
            filename: file.name,
            content_type: file.type,
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const { uploadUrl, gcsPath, fileUuid } = signedUrlRes.data;

        if (!uploadUrl) {
          throw new Error('署名付きURLが返されませんでした');
        }

        // (2) PUTで直接アップロード
        //     Content-Typeを指定しておくことで、GCS上でも正しいMIMEが付きます
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
          },
        });


        // (3) アップロード完了後 /task に gcsPath を通知して解析処理させる
        const taskResponse = await axios.post(
          `${api.baseUrl}/upload/task`,
          {
            gcsPath,
            content_type: file.type,
            filename: file.name,
            fileUuid: fileUuid,
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Task creation success:', taskResponse.data);
        const { filename, status } = taskResponse.data;

        // アップロード状況のステータスを更新
        setFileStatuses(prev => [...prev, { filename, status }]);
        onSuccess();
        message.success(`${file.name} の処理を開始しました`);

      } catch (err: any) {
        console.error('Upload error:', err);
        if (axios.isAxiosError(err) && err.response) {
          const { status, data } = err.response;
          if (status === 429) {
            message.error(`データ容量が大きすぎるため対応できません。`);
          } else if (status === 500) {
            message.error(`現在は対応できないファイルです。申し訳ありません。`);
          } else {
            message.error(`${file.name} のアップロードに失敗: ${data?.detail || '不明なエラー'}`);
          }
        } else {
          message.error(`${file.name} のアップロードに失敗: ${err?.message || '不明なエラー'}`);
        }
        onError(err);
      } finally {
        // アップロード中ファイル数を更新
        setUploadingCount(prev => {
          const newCount = prev - 1;
          if (newCount === 0) {
            handleUploadComplete();
          }
          return newCount;
        });
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
          クリックまたはドラッグして複数のPDFファイルをアップロード
        </p>
        <p className="ant-upload-hint">
          20ファイルまで同時にアップロードできます。PDFファイルのみ対応しています。
        </p>
      </Dragger>

      {/* アップロード状況表示 (任意) */}
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
