import React from 'react';
import { Row, Col } from 'antd';

import FileUpload from '@/components/dashboard/TableAnalysis/FileUpload';
import FileDropdown from '@/components/dashboard/old/FileDropdown';
import AnalysisResults from '@/components/dashboard/old/AnalysisResults';
import FileList from '@/components/dashboard/old/FileList';
import MoveButton from '@/components/dashboard/old/MoveButton';


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
