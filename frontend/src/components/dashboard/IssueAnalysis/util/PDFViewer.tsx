// components/dashboard/IssueAnalysis/util/PDFViewer.tsx
'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Space, Spin } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDFワーカーのパスを設定
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
    url: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const previousPage = () => {
        if (pageNumber > 1) {
            changePage(-1);
        }
    };

    const nextPage = () => {
        if (pageNumber < (numPages || 0)) {
            changePage(1);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4">
                <Space>
                    <Button
                        onClick={previousPage}
                        disabled={pageNumber <= 1}
                        icon={<LeftOutlined />}
                    >
                        前のページ
                    </Button>
                    <span className="mx-4">
                        {pageNumber} / {numPages || '--'}
                    </span>
                    <Button
                        onClick={nextPage}
                        disabled={numPages === null || pageNumber >= numPages}
                        icon={<RightOutlined />}
                    >
                        次のページ
                    </Button>
                </Space>
            </div>

            <div className="relative w-full" style={{ minHeight: '500px' }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Spin size="large" />
                    </div>
                )}
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<Spin size="large" />}
                    error={
                        <div className="text-red-500 text-center">
                            PDFの読み込みに失敗しました。<br />
                            URLが正しいことを確認してください。
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="pdf-page shadow-lg mx-auto"
                        width={Math.min(window.innerWidth * 0.7, 800)}
                    />
                </Document>
            </div>
        </div>
    );
};

export default PDFViewer;