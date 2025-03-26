import React, { useEffect, useState } from "react";
import { List, Checkbox, Spin, Alert } from "antd";
import axios from "axios";

import { getAuth } from 'firebase/auth';
import { FileItem } from "@/components/dashboard/Chat/types";
import { apiUrlGetRetrieverFiles } from "@/utils/api";

interface FileListPaneProps {
  selectedFileUuids: string[];
  onChangeSelectedFiles: (fileUuids: string[]) => void;
}

interface GetFilesResponse {
  files: FileItem[];
}

const FileListPane: React.FC<FileListPaneProps> = ({
  selectedFileUuids,
  onChangeSelectedFiles
}) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();

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

      setFileList(response.data.files || []);
    } catch (err) {
      setError("ファイル一覧の取得に失敗しました");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  const onChangeCheckbox = (checked: boolean, fileUuid: string) => {
    if (checked) {
      onChangeSelectedFiles([...selectedFileUuids, fileUuid]);
    } else {
      onChangeSelectedFiles(selectedFileUuids.filter((uuid) => uuid !== fileUuid));
    }
  };

  return (
    <div style={{ padding: '0px 10px'}}>
      <h3>ファイル一覧</h3>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {loading && <Spin style={{ marginBottom: 16 }} />}

      <div style={{ maxHeight: '70vh', overflowY: 'auto', marginBottom: '10px'}}>
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
        />
      </div>
    </div>
  );
};

export default FileListPane;
