import React, { useEffect, useState } from 'react';
import { Row, Col, List, Checkbox, Button, Spin, Alert, message } from 'antd';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

import { apiUrlGetRetrieverFiles, apiUrlPostRetrieverDebug } from "@/utils/api";

// APIのレスポンスに対応する型
interface FileItem {
  fileUuid: string;
  fileName: string;
}

interface GetFilesResponse {
  files: FileItem[];
}

const FileListWithChat: React.FC = () => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedFileUuids, setSelectedFileUuids] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();

  // ファイル一覧を取得する関数
  const fetchFileList = async () => {
    setLoading(true);
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      setError('認証が必要です');
      setLoading(false);
      return;
    }

    try {
      const accessToken = await user.getIdToken(true);

      // ファイル一覧取得
      const response = await axios.get<GetFilesResponse>(apiUrlGetRetrieverFiles, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // JSONの "files" 配列を state に格納
      setFileList(response.data.files || []);
    } catch (err) {
      console.error(err);
      setError('ファイル一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // チェックボックスの変更を処理する
  const onChangeCheckbox = (checked: boolean, fileUuid: string) => {
    if (checked) {
      setSelectedFileUuids((prev) => [...prev, fileUuid]);
    } else {
      setSelectedFileUuids((prev) => prev.filter((uuid) => uuid !== fileUuid));
    }
  };

  // 「ファイルについて質問する」ボタンのクリック処理
  const onClickAskQuestion = async () => {
    if (selectedFileUuids.length === 0) {
      message.warning('ファイルが選択されていません。');
      return;
    }

    setLoading(true);
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      setError('認証が必要です');
      setLoading(false);
      return;
    }

    try {
      const accessToken = await user.getIdToken(true);

      // 選択されたファイルUUIDをバックエンドに送信
      const response = await axios.post(
        apiUrlPostRetrieverDebug,
        { fileUuids: selectedFileUuids },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // 正常時の処理
      message.success('選択されたファイルUUIDを送信しました');
      // 必要に応じて response.data を使った後続処理を行う
      console.log(response.data);
    } catch (err) {
      console.error(err);
      setError('ファイルUUIDの送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row gutter={16} style={{ width: '100%', padding: '16px' }}>
      {/* 左側：ファイル一覧表示とチェックボックス */}
      <Col span={8}>
        <h2>ファイル一覧</h2>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        {loading && <Spin style={{ marginBottom: 16 }} />}

        <List
          bordered
          dataSource={fileList}
          renderItem={(file) => (
            <List.Item key={file.fileUuid}>
              <Checkbox
                checked={selectedFileUuids.includes(file.fileUuid)}
                onChange={(e) => onChangeCheckbox(e.target.checked, file.fileUuid)}
              >
                {file.fileName}
              </Checkbox>
            </List.Item>
          )}
          style={{ marginBottom: 16 }}
        />

        <Button type="primary" onClick={onClickAskQuestion}>
          ファイルについて質問する
        </Button>
      </Col>

      {/* 右側：将来的にチャット欄を配置する想定のスペース（今はダミー） */}
      <Col span={16}>
        <h2>チャット欄（将来的に実装）</h2>
        <div style={{ border: '1px solid #ccc', height: '400px', padding: '16px' }}>
          <p>ここにチャットコンポーネントが入る想定です。</p>
        </div>
      </Col>
    </Row>
  );
};

export default FileListWithChat;
