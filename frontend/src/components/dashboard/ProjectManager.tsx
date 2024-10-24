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
  onProjectChange: () => void;  // プロジェクト変更時に呼び出すコールバック
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
        } else {
          setProjects([]);
        }
      } catch (error) {
        //message.error('プロジェクトデータの取得に失敗しました');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    } else {
      message.error('ユーザー情報が取得できませんでした');
    }
  };

  // 選択されたプロジェクトを取得して初期値に設定
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
          setSelectedProjectId(data.project_id); // 選択されたプロジェクトのIDを初期値に設定
        }
      } catch (error) {
        //message.error('選択されたプロジェクトの取得に失敗しました');
        console.log('no selected project');
      }
    }
  };

  // プロジェクトを新規作成
  const handleAddProject = async () => {
    const user = auth.currentUser;
    if (user) {
      if (!newProjectName) {
        message.error('プロジェクト名を入力してください');
        return;
      }

      try {
        const accessToken = await user.getIdToken(true);
        const response = await axios.post(apiUrlPostProjects, {
          name: newProjectName,
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const newProject: Project = response.data; // 新規作成されたプロジェクトのデータを取得
        setProjects((prevProjects) => [...prevProjects, newProject]); // 既存のプロジェクトに追加
        setSelectedProjectId(newProject.project_id); // 新規作成後、そのプロジェクトを選択
        setNewProjectName(''); // 入力をリセット
        setIsModalVisible(false); // モーダルを閉じる
        onProjectChange(); // プロジェクトが作成されたら親コンポーネントに通知
        message.success('プロジェクトが作成されました');
      } catch (error) {
        message.error('プロジェクトの作成に失敗しました');
      }
    } else {
      message.error('ユーザー情報が取得できませんでした');
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
        onProjectChange(); // プロジェクトが選択されたら親コンポーネントに通知
        message.success('プロジェクトが選択されました');
      } catch (error) {
        message.error('プロジェクトの選択に失敗しました');
      }
    }
  };

  // コンポーネントのマウント時にプロジェクトを取得
  useEffect(() => {
    fetchProjects();
    fetchSelectedProject(); // 選択されたプロジェクトを取得して初期値に設定
  }, []);

  const openModal = () => {
    setNewProjectName(''); // 過去の入力値をクリア
    setIsModalVisible(true);
  };

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

        {/* プロジェクトを選択するドロップダウン */}
        <Space style={{ marginBottom: 20 }}>
          {/* 新規作成ボタン */}
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
            value={selectedProjectId} // 初期値に選択されたプロジェクトを表示
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

      {/* 新規プロジェクト作成モーダル */}
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
