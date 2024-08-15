import React from 'react';
import { Button, Layout } from 'antd';
import FileUpload from '@/components/FileUpload';
import FileDropdown from '@/components/FileDropdown';
import ResultTabs from '@/components/ResultTabs';


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
      <Button>test</Button>
      <ResultTabs />
    </div>
  );
};

export default Home;
