"use client";

import React, { useState } from 'react';
import { Button, List, Image, Spin, Alert } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import { apiUrlGetImageList } from '@/utils/api';

// インターフェース定義
interface ImageURLsResponse {
  imageUrls: string[];
}

interface ImageListComponentProps {
  uuid: string;
}

const ImageListComponent: React.FC<ImageListComponentProps> = ({ uuid }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();

  // 画像リストを取得する非同期関数
  const fetchImages = async () => {
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
      const response = await axios.get<ImageURLsResponse>(
        apiUrlGetImageList,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: { uuid },
        }
      );
      setImages(response.data.imageUrls || []);
    } catch (err) {
      setError('画像の取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button type="primary" onClick={fetchImages}>
        画像を表示
      </Button>
      {loading && <Spin />}
      {error && <Alert message={error} type="error" showIcon />}
      {images.length > 0 && (
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={images}
          renderItem={(imageUrl) => (
            <List.Item key={imageUrl}>
              <Image src={imageUrl} alt="Uploaded Image" />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default ImageListComponent;
