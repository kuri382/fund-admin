import React from 'react';
import { Row, Col } from 'antd';

import FileUpload from '@/components/FileUpload';
import FileDropdown from '@/components/FileDropdown';
import AnalysisResults from '@/components/AnalysisResults';
import FileList from '@/components/FileList';
import MoveButton from '@/components/MoveButton';


const Top: React.FC = () => {
    return (
        <div style={{ padding: '10px' }}>
            <div style={{ padding: '10px' }}>
                <h1>Dropselect</h1>
            </div>

            <div style={{ marginBottom: '20px'}}>
            <Row gutter={16}>
                <Col span={16}>
                    <FileUpload />
                </Col>
                <Col span={8} >
                    <FileList />
                </Col>
            </Row>
            </div>

            <FileDropdown />
            <MoveButton />
            <div style={{ marginBottom: '20px' }}>
            </div>
            <AnalysisResults />
        </div>
    );
};

export default Top;
