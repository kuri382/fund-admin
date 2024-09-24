import React from 'react';
import { Layout } from 'antd';
import FileUpload from '@/components/FileUpload';
import FileDropdown from '@/components/FileDropdown';

const { Content } = Layout;

const Home: React.FC = () => {
  return (
    <Layout>
      <Content style={{ padding: '20px' }}>
        <h1>デューデリジェンス</h1>
        <div style={{ marginBottom: '20px' }}>
          <FileUpload />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <FileDropdown />
        </div>
      </Content>
    </Layout>
  );
};

export default Home;
