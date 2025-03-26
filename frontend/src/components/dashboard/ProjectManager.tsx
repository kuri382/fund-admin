import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Card, Modal, Select, message, Row, Col } from 'antd';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProjectCreating, setIsProjectCreating] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // キー入力中

  const fetchProjects = async () => {
    const user = auth.currentUser;
    if (user) {
      setIsLoading(true);
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
        setIsLoading(false);
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

    setIsProjectCreating(true);

    try {
      await createNewProject(newProjectName);
      setNewProjectName('');
      setIsModalVisible(false);
      onProjectChange();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsProjectCreating(false);
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
      <div style={{ margin: '20px' }}>
        <Card
          title="Project"
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            読み込み中
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px' }}>

      <p>データを紐づけるプロジェクトを作成または選択してください。プロジェクトごとに文書・数値データが統合されます。</p>

      <Row gutter={16} align="middle">
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openModal}
            style={{ marginBottom: 20 }}
          >
            プロジェクトを新規作成
          </Button>
        </Col>
        <Col flex="auto">
          <Select
            style={{ width: '100%', marginBottom: 20 }}
            placeholder="既存のプロジェクトから選択"
            onChange={handleSelectProject}
            value={selectedProjectId}
            loading={isLoading}
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
        </Col>
      </Row>

      <Modal
        title="新規作成する"
        open={isModalVisible}
        onOk={handleAddProject}
        onCancel={() => setIsModalVisible(false)}
        okText="作成"
        cancelText="キャンセル"
        okButtonProps={{ disabled: isProjectCreating }}
      >
        <Form layout="vertical">
          <Form.Item label="プロジェクト名" required>
            <Input
              value={newProjectName}
              onCompositionStart={() => setIsComposing(true)} // 変換開始
              onCompositionEnd={() => setIsComposing(false)} // 変換確定
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="プロジェクト名を入力"
              onPressEnter={(e) => {
                if (!isComposing) {
                  handleAddProject();
                }
              }}
              disabled={isLoading || isProjectCreating}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManager;
