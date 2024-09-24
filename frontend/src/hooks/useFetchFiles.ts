import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '@/services/firebase';
import { api } from '@/utils/api';
import { message } from 'antd';

interface FileData {
  file_name: string;
  data: any[];
  abstract: string;
  category: string;
  feature: string;
}

const useFetchFiles = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = `${api.baseUrl}/upload/files`;
        const accessToken = await user.getIdToken(/* forceRefresh */ true);
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setFiles(response.data.files);
      } catch (err) {
        message.error('データがまだありません');
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
    fetchFiles();
  }, []);

  return { files, loading, error, fetchFiles };
};

export default useFetchFiles;
