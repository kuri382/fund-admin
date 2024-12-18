import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '@/services/firebase';
import { apiUrlCheckDocumentData } from '@/utils/api';
import { message } from 'antd';

interface FileData {
  file_name: string;
  file_uuid: string;
  abstract: string;
  category: string;
  feature: string;
}

const useFetchDocument = () => {
  const [filesDocument, setFiles] = useState<FileData[]>([]);
  const [loadingDocument, setLoading] = useState<boolean>(true);
  const [errorDocument, setError] = useState<string | null>(null);

  const fetchFilesDocument = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      setError(null);
      try {
        //const apiUrl = `${api.baseUrl}/check/document_data`;
        const accessToken = await user.getIdToken(/* forceRefresh */ true);
        const response = await axios.get(apiUrlCheckDocumentData, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setFiles(response.data.files);
      } catch (err) {
        //message.error('データがまだありません');
        setError('データがまだありません');
      } finally {
        setLoading(false);
      }
    } else {
      setError("分析ボタンを押してください");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilesDocument();
  }, []);

  return { filesDocument, loadingDocument, errorDocument, fetchFilesDocument };
};

export default useFetchDocument;
