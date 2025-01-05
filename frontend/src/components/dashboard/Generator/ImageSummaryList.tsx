import React, { useState, useEffect } from 'react';
import { List, Image, Spin, Alert, Card, Typography, Row, Col, Space, Button } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import { apiUrlGetImageList, apiUrlGetParameterSummary } from '@/utils/api';
import ButtonAnalyzePL from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzePL';
import ButtonAnalyzeSaaS from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzeSaaS';

const { Paragraph } = Typography;

interface ImageURLsResponse {
  imageUrls: string[];
  pageNumbers: number[];
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
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
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

      // Fetch images and page numbers
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
      setPageNumbers(imageResponse.data.pageNumbers || []);

      // Fetch summaries
      const summaryResponse = await axios.get<SummaryResponse>(
        apiUrlGetParameterSummary,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: { file_uuid },
        }
      );
      setParameterSummaries(summaryResponse.data.data || []);

    } catch (err) {
      setError('データの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // 初期化時に fetchImages を自動実行
  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div>
      <Space>
        <Button onClick={fetchImages} type="primary" style={{ marginBottom: '10px' }}>
          再読み込み
        </Button>
        {/*<ButtonAnalyzePL file_uuid={file_uuid} />
        <ButtonAnalyzeSaaS file_uuid={file_uuid} />*/}
      </Space>
      <div style={{ padding: '20px' }}></div>

      {loading && <Spin />}
      {error && <Alert message={error} type="error" showIcon />}

      {images.length > 0 && (
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={pageNumbers.map((pageNumber, index) => ({
            pageNumber,
            imageUrl: images[index],
          }))}
          renderItem={(item) => {
            const summary = parameterSummaries.find((s) => s.pageNumber === item.pageNumber);

            return (
              <List.Item key={item.pageNumber}>
                <Card>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Image src={item.imageUrl} alt={`Page ${item.pageNumber}`} style={{ width: '100%' }} />
                    </Col>

                    <Col span={12}>
                      {summary ? (
                        <div style={{ marginTop: '16px' }}>
                          <p><b>解説</b></p><p style={{ color: 'gray' }}>page.{summary.pageNumber}</p>
                          {/*<Paragraph>{summary.output}</Paragraph>
                          <Paragraph>{summary.explanation}</Paragraph>
                          <p><b>注意ポイント</b></p>*/}
                          <Paragraph>{summary.opinion}</Paragraph>
                        </div>
                      ) : (
                        <Space>
                          <Spin />
                          <span>解析中</span>
                        </Space>
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
