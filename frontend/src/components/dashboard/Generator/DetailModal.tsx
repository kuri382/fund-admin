import React from 'react';
import { Modal, Row, Col, Image, Typography, Button, Tag } from 'antd';
import { ParameterSummary } from '@/components/dashboard/Generator/ImageSummaryList';

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

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="95%"
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
            {/* 親要素に固定高さを与えて、内部のColだけスクロールできるようにする */}
            <Row gutter={24} style={{ height: '70vh' }}>
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
                        overflowY: 'auto', // 文章部分のみスクロール可
                        paddingRight: '8px'
                    }}
                >
                    <div>
                        {item && item.summary ? (
                            <>
                                <p style={{ color: 'gray' }}>page.{item.summary.pageNumber}</p>
                                <p><b><Tag color="cyan">fact</Tag>読み取れる情報</b></p>
                                <Typography.Paragraph>{item.summary.facts}</Typography.Paragraph>
                                <p><b><Tag color="blue">issues</Tag>潜在的なリスクや経営上の懸念点</b></p>
                                <Typography.Paragraph>{item.summary.issues}</Typography.Paragraph>
                                <p><b><Tag color="geekblue">rationale</Tag>課題やリスクを推測した理由</b></p>
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
