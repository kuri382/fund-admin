import React from 'react';
import FileUpload from '@/components/FileUpload';
import FileDropdown from '@/components/FileDropdown';
import AnalysisResults from '@/components/AnalysisResults';


const Home: React.FC = () => {
  return (
    <div style={{ padding: '10px' }}>
      <div style={{ padding: '10px' }}>
        <h1>Granite</h1>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <FileUpload />
      </div>
      <FileDropdown />
      <div style={{ marginBottom: '20px' }}>
      </div>
      <AnalysisResults />
    </div>
  );
};

export default Home;
