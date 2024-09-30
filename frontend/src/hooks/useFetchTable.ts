import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '@/services/firebase';
import { apiUrlCheckTableData } from '@/utils/api';
import { message } from 'antd';

interface FileData {
  file_name: string;
  data: any[];
  abstract: string;
  category: string;
  feature: string;
}

const useFetchTable = () => {
  const [filesTable, setFiles] = useState<FileData[]>([]);
  const [loadingTable, setLoading] = useState<boolean>(true);
  const [errorTable, setError] = useState<string | null>(null);

  const fetchFilesTable = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      setError(null);
      try {
        //const apiUrl = `${api.baseUrl}/check/table_data`;
        const accessToken = await user.getIdToken(/* forceRefresh */ true);
        const response = await axios.get(apiUrlCheckTableData, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setFiles(response.data.files);
      } catch (err) {
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
    fetchFilesTable();
  }, []);

  return { filesTable, loadingTable, errorTable, fetchFilesTable };
};

export default useFetchTable;
