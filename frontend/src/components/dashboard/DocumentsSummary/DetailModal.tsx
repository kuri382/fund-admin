import React, { useEffect } from 'react';
import { Modal, Row, Col, Image, Typography, Button, Tag } from 'antd';
import { ParameterSummary } from '@/components/dashboard/DocumentsSummary/ImageSummaryList';

interface DataItem {
    pageNumber: number;
    imageUrl: string;
    summary?: ParameterSummary;
}

interface DetailModalProps {
    open: boolean;
    onClose: () => void;
    currentIndex: number;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    data: DataItem[];
}

const formatText = (text: string | undefined) => {
    if (!text) return "";
    return text
        .replace(/####\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/###\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/##\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/#\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
};

const DetailModal: React.FC<DetailModalProps> = ({
    open,
    onClose,
    currentIndex,
    setCurrentIndex,
    data
}) => {
    const item = data[currentIndex];

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < data.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    // --- 矢印キーのハンドリング ---
    useEffect(() => {
        if (!open) return; // モーダルが開いていなければイベントを登録しない

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowLeft':
                    handlePrev();
                    break;
                case 'ArrowDown':
                case 'ArrowRight':
                    handleNext();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // クリーンアップで監視解除
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, currentIndex, data, handlePrev, handleNext]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="95%"
            // styles は antd v5 新機能ですが、v4 以下の場合は bodyStyle や wrapClassName などで対応してください
            styles={{
                body: {
                    overflow: 'hidden'
                }
            }}
        >
            <div style={{ paddingRight: '50px', textAlign: 'right' }}>
                <Button onClick={handlePrev} disabled={currentIndex === 0} style={{ marginRight: '10px' }}>
                    前へ
                </Button>
                <Button onClick={handleNext} disabled={currentIndex === data.length - 1}>
                    次へ
                </Button>
            </div>
            <Row gutter={24} style={{ height: '80vh' }}>
                <Col
                    span={14}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#f8f8f8',
                    }}
                >
                    {item && (
                        <Image
                            src={item.imageUrl}
                            alt="拡大画像"
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                            preview={false}
                        />
                    )}
                </Col>
                <Col
                    span={10}
                    style={{
                        height: '100%',
                        overflowY: 'auto',
                        paddingRight: '8px'
                    }}
                >
                    <div>
                        {item && item.summary ? (
                            <>
                                <p style={{ color: 'gray' }}>page.{item.summary.pageNumber}</p>
                                <p><b><Tag color="green">summary</Tag>サマリー</b></p>
                                <Typography.Paragraph>{item.summary.facts}</Typography.Paragraph>
                                <p><b><Tag color="cyan">transcription</Tag>正確な内容</b></p>
                                <Typography.Paragraph><div dangerouslySetInnerHTML={{ __html: formatText(item.summary.transcription) }}></div></Typography.Paragraph>
                                <p><b><Tag color="blue">issues</Tag>潜在的なリスクや経営上の懸念点</b></p>
                                <Typography.Paragraph>{item.summary.issues}</Typography.Paragraph>
                                <p><b><Tag color="geekblue">evidence</Tag>課題やリスクを推測した理由</b></p>
                                <Typography.Paragraph>{item.summary.rationale}</Typography.Paragraph>
                                {/*<p><b>リスクが顕在化した場合の影響や将来の見通し</b></p>
                                <Typography.Paragraph>{item.summary.forecast}</Typography.Paragraph> */}
                                <p><b><Tag color="purple">investigation</Tag>課題やリスク推測をより精緻に行うために必要な情報</b></p>
                                <Typography.Paragraph>{item.summary.investigation}</Typography.Paragraph>
                            </>
                        ) : (
                            <p>解析中</p>
                        )}
                    </div>
                </Col>
            </Row>
        </Modal>
    );
};

export default DetailModal;
