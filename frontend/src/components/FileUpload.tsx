"use client"

import { useState } from 'react'
import axios from "axios";
import { Upload, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

import { api } from '@/utils/api'
import { auth } from '@/services/firebase';


const { Dragger } = Upload

const divUpload: React.CSSProperties = {
  height: '220px',
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '10px',
};

export default function FileUpload() {
  const [fileName, setFileName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const props = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      const user = auth.currentUser;
      if (user) {
        try {
          const accessToken = await user.getIdToken(/* forceRefresh */ true);
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
          setFileName(filename);
          setStatusMessage(status);

          onSuccess();
          message.success(`${filename} ファイルを変換し格納しました`);
        } catch (err) {
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
        //console.log(info.file, info.fileList);
        message.success(`${info.file.name} ファイルを分析しています。`);
      }
      if (status === 'done') {
        // ファイルアップロード完了時の処理
        //console.log(`${info.file.name} ファイルがアップロードされました。`);
      } else if (status === 'error') {
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
        <p className="ant-upload-text">クリックまたはドラッグしてファイルをアップロード</p>
      </Dragger>
      {statusMessage && <p style={{ marginTop: '5px' }}>{statusMessage}</p>}
      {/*fileName && <p style={{ marginTop: '10px' }}>アップロードされたファイル: {fileName}</p>*/}
    </Card>
  )
}
