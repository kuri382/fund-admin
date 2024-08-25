"use client"

import { useState } from 'react'
import { Upload, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { api } from '@/utils/api'

const { Dragger } = Upload

const divUpload: React.CSSProperties = {
  height: '220px',
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '10px',
};

export default function FileUpload() {
  const [fileName, setFileName] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const props = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.upload.uploadFileUploadPost({ file: file as File });

        // APIレスポンスを処理
        const { filename, status } = response.data;
        setFileName(filename);
        setStatusMessage(status);

        onSuccess();
        message.success(`${filename} ファイルを変換し格納しました`);
      } catch (err) {
        onError({ err });
        message.error(`${file.name} ファイルのアップロードに失敗しました。`);
      }
    },
    onChange(info: any) {
      const { status } = info.file
      if (status !== 'uploading') {
        console.log(info.file, info.fileList)
      }
      if (status === 'done') {
        // ファイルアップロード完了時の処理
      } else if (status === 'error') {
        message.error(`${info.file.name} ファイルのアップロードに失敗しました。`)
      }
    },
  }

  return (
    <Card title="IR資料をアップロードしてください" style={{height:'100%'}}>
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
