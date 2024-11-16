import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Card, Modal, Select, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { auth } from '@/services/firebase';

import {
  apiUrlGetProjects,
  apiUrlGetSelectedProject,
  apiUrlSelectProject,
  apiUrlPostProjects,
} from '@/utils/api';

const { Option } = Select;
const { Title } = Typography;

interface ProjectManagerProps {
  onProjectChange: () => void;
}

interface Project {
  project_id: string;
  name: string;
  is_selected: boolean;
  is_archived: boolean;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectChange }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchProjects = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      try {
        const accessToken = await user.getIdToken(true);
        const response = await axios.get(apiUrlGetProjects, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = response.data;
        if (Array.isArray(data)) {
          setProjects(data);
          return data;
        } else {
          setProjects([]);
          return [];
        }
      } catch (error) {
        setProjects([]);
        return [];
      } finally {
        setLoading(false);
      }
    } else {
      message.error('ユーザー情報が取得できませんでした');
      return [];
    }
  };

  const fetchSelectedProject = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const accessToken = await user.getIdToken(true);
        const response = await axios.get(apiUrlGetSelectedProject, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data: Project = response.data;
        if (data && data.project_id) {
          setSelectedProjectId(data.project_id);
          return data.project_id;
        }
        return null;
      } catch (error) {
        console.log('no selected project');
        return null;
      }
    }
    return null;
  };

  const createNewProject = async (projectName: string) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const accessToken = await user.getIdToken(true);
        const response = await axios.post(apiUrlPostProjects, {
          name: projectName,
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const newProject: Project = response.data;
        setProjects((prevProjects) => [...prevProjects, newProject]);
        setSelectedProjectId(newProject.project_id);
        await handleSelectProject(newProject.project_id);
        message.success(`プロジェクト「${projectName}」が作成されました`);
        return newProject;
      } catch (error) {
        message.error('プロジェクトの作成に失敗しました');
        throw error;
      }
    } else {
      message.error('ユーザー情報が取得できませんでした');
      throw new Error('User not authenticated');
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName) {
      message.error('プロジェクト名を入力してください');
      return;
    }

    try {
      await createNewProject(newProjectName);
      setNewProjectName('');
      setIsModalVisible(false);
      onProjectChange();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const accessToken = await user.getIdToken(true);
        await axios.patch(`${apiUrlSelectProject}/${projectId}/select`, {}, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        setSelectedProjectId(projectId);
        onProjectChange();
        message.success('プロジェクトが選択されました');
      } catch (error) {
        message.error('プロジェクトの選択に失敗しました');
      }
    }
  };

  useEffect(() => {
    const initializeProject = async () => {
      try {
        setIsInitializing(true);
        const fetchedProjects = await fetchProjects();
        const selectedProject = await fetchSelectedProject();

        if (fetchedProjects.length === 0) {
          // プロジェクトが存在しない場合、自動的に新規プロジェクトを作成
          try {
            await createNewProject('サンプルプロジェクト');
            onProjectChange();
          } catch (error) {
            console.error('Failed to auto-create project:', error);
          }
        } else if (!selectedProject) {
          // プロジェクトは存在するが選択されていない場合、最初のプロジェクトを選択
          const firstProject = fetchedProjects[0];
          await handleSelectProject(firstProject.project_id);
        }
      } catch (error) {
        console.error('Failed to initialize projects:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProject();
  }, []);

  const openModal = () => {
    setNewProjectName('');
    setIsModalVisible(true);
  };

  if (isInitializing) {
    return (
      <Card
        title="プロジェクト管理"
        style={{ margin: '20px 0px' }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          初期化中...
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="プロジェクト管理"
        style={{ margin: '20px 0px' }}
        styles={{
          body: {
            padding: '0px 20px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #d9d9d9',
          },
        }}
      >
        <p>データを紐づけるプロジェクトを作成または選択してください</p>

        <Space style={{ marginBottom: 20 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openModal}
            style={{ marginBottom: 20 }}
          >
            プロジェクトを新規作成
          </Button>

          <Select
            style={{ width: '500px', marginBottom: 20 }}
            placeholder="既存のプロジェクトから選択"
            onChange={handleSelectProject}
            value={selectedProjectId}
            loading={loading}
          >
            {projects.length > 0 ? (
              projects.map((project) => (
                <Option key={project.project_id} value={project.project_id}>
                  {project.name}
                </Option>
              ))
            ) : (
              <Option disabled>プロジェクトがありません</Option>
            )}
          </Select>
        </Space>
      </Card>

      <Modal
        title="プロジェクトを新規作成"
        open={isModalVisible}
        onOk={handleAddProject}
        onCancel={() => setIsModalVisible(false)}
        okText="作成"
        cancelText="キャンセル"
      >
        <Form layout="vertical">
          <Form.Item label="プロジェクト名" required>
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="プロジェクト名を入力"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectManager;
