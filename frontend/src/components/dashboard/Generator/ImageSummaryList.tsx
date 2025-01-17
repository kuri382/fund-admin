"use client";

import React, { useState } from 'react';
import { Button, List, Image, Spin, Alert, Card, Typography, Row, Col, Space } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import { apiUrlGetImageList, apiUrlGetParameterSummary } from '@/utils/api';
import ButtonAnalyzePL from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzePL'
import ButtonAnalyzeSaaS from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzeSaaS'

const { Paragraph } = Typography;

interface ImageURLsResponse {
  imageUrls: string[];
}

interface ParameterSummary {
  pageNumber: number;
  output: string;
  explanation: string;
  opinion: string;
}

interface SummaryResponse {
  data: ParameterSummary[];
}

interface ImageListComponentProps {
  file_uuid: string;
}

const ImageListComponent: React.FC<ImageListComponentProps> = ({ file_uuid }) => {
  const [images, setImages] = useState<string[]>([]);
  const [parameterSummaries, setParameterSummaries] = useState<ParameterSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();

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

      const imageResponse = await axios.get<ImageURLsResponse>(
        apiUrlGetImageList,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: { file_uuid },
        }
      );
      setImages(imageResponse.data.imageUrls || []);

      const summaryResponse = await axios.get<SummaryResponse>(
        apiUrlGetParameterSummary,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: { file_uuid },
        }
      );
      console.log(summaryResponse.data)
      setParameterSummaries(summaryResponse.data.data || []);

    } catch (err) {
      setError('データの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button type="primary" onClick={fetchImages} style={{ marginBottom: '10px' }}>
        資料詳細を表示する
      </Button>
      <br></br>
      <Space>
        <ButtonAnalyzePL file_uuid={file_uuid} />
        <ButtonAnalyzeSaaS file_uuid={file_uuid} />
      </Space>
      <div style={{ padding: '20px' }}></div>

      {loading && <Spin />}
      {error && <Alert message={error} type="error" showIcon />}

      {images.length > 0 && (
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={images}
          renderItem={(imageUrl, index) => {
            const summary = parameterSummaries[index];

            return (
              <List.Item key={imageUrl}>
                <Card>
                  <Row gutter={16}>
                    {/* 画像を左側に表示 */}
                    <Col span={12}>
                      <Image src={imageUrl} alt={`Image ${index}`} style={{ width: '100%' }} />
                    </Col>

                    {/* サマリーを右側に表示 */}
                    <Col span={12}>
                      {summary && (
                        <div style={{ marginTop: '16px' }}>
                          <p><b>解説</b></p>
                          <Paragraph>{summary.output}</Paragraph>
                          <Paragraph>{summary.explanation}</Paragraph>
                          <p><b>注意ポイント</b></p>
                          <Paragraph>{summary.opinion}</Paragraph>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default ImageListComponent;
