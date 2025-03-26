import React from 'react';
import { Alert, Button } from 'antd';
import FileUpload from '@/components/dashboard/TableAnalysis/FileUpload';
import ProjectManager from '@/components/dashboard/ProjectManager';

interface ErrorNotificationProps {
  onReload: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ onReload }) => {
  return (
    <>
      <ProjectManager onProjectChange={() => {}} />
      <FileUpload onUploadComplete={() => {
        setTimeout(() => {
          onReload();
        }, 5000);
      }} />
      <Alert
        message="データがまだありません"
        type="info"
        style={{ marginTop: '20px' }}
      />
      <Button
        onClick={onReload}
        type="primary"
        style={{ marginTop: '10px' }}
      >
        読み込む
      </Button>
    </>
  );
};

export default ErrorNotification;
