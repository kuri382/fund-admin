// src/pages/ChatMain.tsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Layout, message, Spin, Button } from 'antd';
import axios from 'axios';

import ChatTabs from '@/components/dashboard/Chat/ChatTabs';
import FileListPane from '@/components/dashboard/Chat/FileList';
import ChatPane from '@/components/dashboard/Chat/ChatPane';
import ChatInput from '@/components/dashboard/Chat/ChatInput';
import { getAuth } from 'firebase/auth';


import {
    apiUrlGetRetrieverChatSessions,
    apiUrlGetRetrieverChatSessionsSessionId,
    apiUrlPostRetrieverChatSessions,
    apiUrlPostRetrieverChatSendMessage
} from '@/utils/api';

import {
    ChatSession,
    ChatMessage,
    ChatReference
} from "@/components/dashboard/Chat/types";

const { Header, Content } = Layout;

const ChatMain: React.FC<{ projectChanged: boolean }> = ({ projectChanged }) =>  {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [creatingSession, setCreatingSession] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const auth = getAuth();
    const user = auth.currentUser;

    // 現在アクティブなセッション
    const activeSession = sessions.find(s => s.sessionId === activeSessionId);

    // ---------------------------
    // 1) セッション一覧の取得
    // ---------------------------
    const fetchSessionList = async () => {
        const user = auth.currentUser;
        if (!user) {
            setError('認証が必要です');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const accessToken = await user.getIdToken(true);
            const response = await axios.get<ChatSession[]>(apiUrlGetRetrieverChatSessions, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const sessionList = response.data;
            setSessions(sessionList);

            // 初回にアクティブセッションを自動選択
            if (sessionList.length > 0) {
                const firstSessionId = sessionList[0].sessionId;
                setActiveSessionId(firstSessionId);
                // 最初のセッションの詳細も自動的に取得する
                fetchSessionDetail(firstSessionId);
            }
        } catch (err) {
            console.error(err);
            message.error("セッション一覧の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------
    // 2) セッション詳細の取得
    //    (メッセージ履歴など)
    // ---------------------------
    const fetchSessionDetail = async (sessionId: string) => {
        setError(null);

        const user = auth.currentUser;
        if (!user) {
            setError('認証が必要です');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const accessToken = await user.getIdToken(true);
            const response = await axios.get<ChatSession>(apiUrlGetRetrieverChatSessionsSessionId(sessionId), {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const fullSession = response.data;
            // 取得したセッション情報を state に反映
            setSessions(prev => {
                const idx = prev.findIndex(s => s.sessionId === sessionId);
                if (idx >= 0) {
                    // 既存セッションを更新
                    const updated = [...prev];
                    updated[idx] = fullSession;
                    return updated;
                } else {
                    // リストになければ新しく追加
                    return [...prev, fullSession];
                }
            });
        } catch (err) {
            console.error(err);
            message.error("セッション詳細の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------
    // 3) 新規セッション作成
    // ---------------------------
    const handleCreateSession = async () => {
        setError(null);

        const user = auth.currentUser;
        if (!user) {
            setError('認証が必要です');
            setLoading(false);
            return;
        }
        try {
            setCreatingSession(true);
            const accessToken = await user.getIdToken(true);

            const sessionName = `会話${sessions.length + 1}`;
            const response = await axios.post<{ sessionId: string }>(
                apiUrlPostRetrieverChatSessions,
                {
                    sessionName,
                    selectedFileUuids: []
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            const { sessionId } = response.data;
            message.success(`新規セッションを作成しました: ${sessionId}`);

            // 新たに追加 (messages は空、selectedFileUuids も空)
            setSessions(prev => [
                ...prev,
                {
                    sessionId,
                    sessionName,
                    messages: [],
                    selectedFileUuids: []
                }
            ]);
            // そのままアクティブにするなら:
            setActiveSessionId(sessionId);
        } catch (err) {
            console.error(err);
            message.error("セッション作成に失敗しました");
        } finally {
            setCreatingSession(false);
        }
    };

    // ---------------------------
    // 4) タブ切り替え
    // ---------------------------
    const handleChangeTab = (newSessionId: string) => {
        setActiveSessionId(newSessionId);
        // 切り替え時にメッセージ履歴を再取得したい場合は:
        fetchSessionDetail(newSessionId);
    };

    // ---------------------------
    // 5) ファイル選択変更
    // ---------------------------
    const handleChangeSelectedFiles = (fileUuids: string[]) => {
        if (!activeSession) return;
        setSessions(prev =>
            prev.map(session =>
                session.sessionId === activeSessionId
                    ? { ...session, selectedFileUuids: fileUuids }
                    : session
            )
        );
        // 実際にはバックエンドで "selectedFileUuids" を更新する場合もある
        // e.g. axios.patch(`/retriever/chat/sessions/${activeSessionId}`, { selectedFileUuids: fileUuids })
    };

    // ---------------------------
    // 6) メッセージ送信
    // ---------------------------
    const handleSendMessage = async (text: string) => {
        if (!activeSession) {
            message.warning("アクティブなセッションがありません");
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            setError('認証が必要です');
            setLoading(false);
            return;
        }
        try {
            // まずユーザーメッセージをローカルに追加
            const userMsg: ChatMessage = {
                messageId: `msg-${Date.now()}`,
                text,
                sender: "user",
                timestamp: new Date().toISOString(),
                references: []
            };
            setSessions(prev =>
                prev.map(session =>
                    session.sessionId === activeSession.sessionId
                        ? { ...session, messages: [...session.messages, userMsg] }
                        : session
                )
            );

            const accessToken = await user.getIdToken(true);

            const response = await axios.post<{
                message: ChatMessage; // SendMessageResponse
            }>(
                apiUrlPostRetrieverChatSendMessage,
                {
                    sessionId: activeSession.sessionId,
                    text,
                    selectedFileUuids: activeSession.selectedFileUuids
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            // system(AI)メッセージを受け取り、state を更新
            const systemMessage = response.data.message;
            setSessions(prev =>
                prev.map(session =>
                    session.sessionId === activeSession.sessionId
                        ? { ...session, messages: [...session.messages, systemMessage] }
                        : session
                )
            );
        } catch (err) {
            console.error(err);
            message.error("メッセージ送信に失敗しました");
        }
    };

    // ---------------------------
    // 初期処理: セッション一覧取得
    // ---------------------------
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
          }
        fetchSessionList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectChanged, user]);

    return (
        <Layout style={{ height: "100vh" }}>
            {/* 上部 (10%) */}
            <Header style={{ height: "10%", background: "#fff", display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    {loading ? (
                        <Spin />
                    ) : (
                        <ChatTabs
                            sessions={sessions}
                            activeSessionId={activeSessionId}
                            onChangeTab={handleChangeTab}
                        />
                    )}
                </div>
                <Button
                    type="primary"
                    onClick={handleCreateSession}
                    loading={creatingSession}
                >
                    新規セッション
                </Button>
            </Header>

            {/* 下部 (90%) */}
            <Content style={{ height: "90%" }}>
                <Row style={{ height: "100%" }}>
                    {/* 左列 (30%)：ファイル一覧 */}
                    <Col span={6} style={{ height: "100%", borderRight: "1px solid #ccc" }}>
                        {/* アクティブセッションが未設定の場合を考慮 */}
                        {activeSession ? (
                            <FileListPane
                                selectedFileUuids={activeSession.selectedFileUuids}
                                onChangeSelectedFiles={handleChangeSelectedFiles}
                            />
                        ) : (
                            <div style={{ padding: 8 }}>セッションが選択されていません</div>
                        )}
                    </Col>

                    {/* 右列 (70%)：チャット画面 */}
                    <Col span={18} style={{ height: "100%" }}>
                        {/* 上～中部 (80%) */}
                        <div style={{ height: "90%", overflowY: "auto", padding: "8px" }}>
                            {activeSession ? (
                                <ChatPane messages={activeSession.messages} />
                            ) : (
                                <div>セッションが選択されていません</div>
                            )}
                        </div>

                        {/* 下部 (20%): チャット入力フォーム */}
                        <div style={{ height: "10%", borderTop: "1px solid #ccc", padding: "8px" }}>
                            {activeSession ? (
                                <ChatInput onSendMessage={handleSendMessage} />
                            ) : null}
                        </div>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
};

export default ChatMain;
