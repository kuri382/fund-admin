import React, { useState, useEffect } from 'react';
import { List, Image, Spin, Alert, Card, Typography, Row, Col, Space, Button, Tag } from 'antd';
import axios from 'axios';
import { getAuth } from "firebase/auth";

import { apiUrlGetImageList, apiUrlGetParameterSummary } from '@/utils/api';
import { ReloadOutlined } from '@ant-design/icons';
import ButtonAnalyzePL from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzePL';
import ButtonAnalyzeSaaS from '@/components/dashboard/TableAnalysis/Button/ButtonAnalyzeSaaS';
import DetailModal from '@/components/dashboard/DocumentsSummary/DetailModal';

const { Paragraph } = Typography;

interface ImageURLsResponse {
  imageUrls: string[];
  pageNumbers: number[];
}

export interface ParameterSummary {
  pageNumber: number;
  facts: string;
  issues: string;
  rationale: string;
  forecast: string;
  investigation: string;
  transcription: string;
}

interface SummaryResponse {
  data: ParameterSummary[];
}

interface ImageListComponentProps {
  file_uuid: string;
}

interface CombinedData {
  pageNumber: number;
  imageUrl: string;
  summary?: ParameterSummary;
}

const formatText = (text: string | undefined) => {
  if (!text) return "";
  return text
    .replace(/####\s(.*?)(?:\n|$)/g, '<strong>$1</strong>') // ### を strong タグに変換
    .replace(/###\s(.*?)(?:\n|$)/g, '<strong>$1</strong>') // ### を strong タグに変換
    .replace(/##\s(.*?)(?:\n|$)/g, '<strong>$1</strong>') // ## を h2 タグに変換
    .replace(/#\s(.*?)(?:\n|$)/g, '<strong>$1</strong>') // # を h2 タグに変換
    //.replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>') // 番号付きリストに対応
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    //.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **text** を太字に変換
    .replace(/\n/g, '<br>'); // 改行に変換
};

const ImageListComponent: React.FC<ImageListComponentProps> = ({ file_uuid }) => {
  const [images, setImages] = useState<string[]>([]);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [parameterSummaries, setParameterSummaries] = useState<ParameterSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //modal settings
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  //modal
  const openModal = (index: number) => {
    setCurrentIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  // 初期化時に fetchImages を自動実行
  useEffect(() => {
    fetchImages();
  }, []);

  // pageNumbers, images, parameterSummariesをまとめた配列を作る
  const combinedData: CombinedData[] = pageNumbers.map((pageNumber, idx) => {
    const summary = parameterSummaries.find(
      (s) => s.pageNumber === pageNumber
    );
    return {
      pageNumber,
      imageUrl: images[idx],
      summary,
    };
  });

  return (
    <div>
      <div style={{ padding: '20px' }}></div>

      {loading && <Spin />}
      {error && <Alert message={error} type="error" showIcon />}

      {images.length > 0 && (
        <List
          grid={{ gutter: 20, column: 1 }}
          dataSource={pageNumbers.map((pageNumber, index) => ({
            pageNumber,
            imageUrl: images[index],
          }))}
          renderItem={(item, index) => {
            const summary = parameterSummaries.find((s) => s.pageNumber === item.pageNumber);

            return (
              <List.Item key={item.pageNumber}>
                <Card>
                  <Row gutter={20}>
                    <Col span={12}>
                      <p style={{ color: 'gray' }}>画像をクリックすることで、画像と説明を大きく表示できます</p>
                      <Image
                        src={item.imageUrl}
                        alt={`Page ${item.pageNumber}`}
                        style={{ width: '100%', cursor: 'pointer' }}
                        preview={false}
                        onClick={() => openModal(index)}
                      />
                    </Col>

                    <Col span={12}>
                      {summary ? (
                        <div style={{ marginTop: '16px' }}>
                          <p style={{ color: 'gray' }}>page.{summary.pageNumber}</p>
                          <p><b><Tag color="green">summary</Tag>サマリー</b></p>
                          <Paragraph>{summary.facts}</Paragraph>
                          <p ><b><Tag color="cyan">transcription</Tag>正確な内容</b></p>
                          <Paragraph><div dangerouslySetInnerHTML={{ __html: formatText(summary.transcription) }}></div></Paragraph>
                          <p><b><Tag color="blue">issues</Tag>潜在的なリスクや経営上の懸念点</b></p>
                          <Paragraph>{summary.issues}</Paragraph>
                          <p><b><Tag color="geekblue">evidence</Tag>課題やリスクを推測した理由</b></p>
                          <Paragraph>{summary.rationale}</Paragraph>
                          {/*<p><b><Tag color="purple">investigation</Tag>課題やリスク推測をより精緻に行うために必要な情報</b></p>
                          <Paragraph>{summary.investigation}</Paragraph>*/}
                        </div>
                      ) : (
                        <>
                          <Space>
                            <Spin />
                            <span>解析中</span>
                          </Space>
                          <br></br>
                          <div style={{ textAlign: 'left' }}>
                            <p>ファイルのページ数が多い場合、表示まで時間がかかる場合があります。</p>
                            <Button
                              icon={<ReloadOutlined />}
                              onClick={fetchImages}
                              type="default"
                            >
                              解析結果を更新する
                            </Button>
                          </div>
                        </>
                      )}
                    </Col>
                  </Row>
                </Card>
              </List.Item>
            );
          }}
        />
      )}

      <DetailModal
        open={modalOpen}
        onClose={closeModal}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        data={combinedData}
      />
    </div>
  );
};

export default ImageListComponent;
