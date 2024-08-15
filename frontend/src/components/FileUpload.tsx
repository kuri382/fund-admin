"use client"

import { useState } from 'react'
import { Upload, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { Api } from '@/api/api'

const { Dragger } = Upload

const api = new Api({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
});

export default function FileUpload() {
  const [fileName, setFileName] = useState<string>('')

  const props = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        await api.upload.uploadFileUploadPost({ file: file as File });
        onSuccess();
      } catch (err) {
        onError({ err });
      }
    },
    onChange(info: any) {
      const { status } = info.file
      if (status !== 'uploading') {
        console.log(info.file, info.fileList)
      }
      if (status === 'done') {
        setFileName(info.file.name)
        message.success(`${info.file.name} ファイルのアップロードに成功しました。`)
      } else if (status === 'error') {
        message.error(`${info.file.name} ファイルのアップロードに失敗しました。`)
      }
    },
  }

  return (
    <Card title="IR資料をアップロードしてください" style={{ height: '100%' }}>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">クリックまたはドラッグしてファイルをアップロード</p>
      </Dragger>
      {fileName && <p style={{ marginTop: '10px' }}>{fileName}</p>}
    </Card>
  )
}
