"use client";

import React, { useState } from 'react';
import { Button, List, Image, Spin, Alert } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import {
  apiUrlGetImageList,
} from '@/utils/api';

interface ImageURLsResponse {
  imageUrls: string[];
}

const ImageListComponent: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();


  const fetchImages = async () => {
    setLoading(true);
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      throw new Error('認証が必要です');
    }
    const accessToken = await user.getIdToken(true);

    try {
      const response = await axios.get<ImageURLsResponse>(
        apiUrlGetImageList,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      console.log(response.data);
      console.log(response.data.imageUrls);
      setImages(response.data.imageUrls || []);
    } catch (err) {
      setError('Failed to fetch images. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button type="primary" onClick={fetchImages}>
        Show Images
      </Button>
      {loading && <Spin />}
      {error && <Alert message={error} type="error" showIcon />}
      {
      images.length > 0 && (
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={images}
          renderItem={(imageUrl) => {
            console.log('Rendering image URL:', imageUrl);
            return (
              <List.Item>
                <Image src={imageUrl} alt="Uploaded Image" />
              </List.Item>
            )
          }}
        />
      )}
    </div>
  );
};

export default ImageListComponent;
