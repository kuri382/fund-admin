import React from 'react';
import FileUpload from '@/components/FileUpload';
import FileDropdown from '@/components/FileDropdown';
import ResultTabs from '@/components/ResultTabs';
import AnalysisResults from '@/components/AnalysisResults';


const Home: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Granite</h1>
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
