import React, { useEffect, useState, useCallback } from "react";
import { Alert, Space, Typography } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import axios from "axios";
import { apiUrlGetWorkerCount } from "@/utils/api"; // 実際には適切にimport

const { Text } = Typography;

interface TaskCountResponse {
  queue: string;
  task_count: number;
}

const MAX_TASK_COUNT = 50;

const messages = [
  "読み込んだドキュメントを構造化しています",
  "数値情報から事業計画を整理しています",
  "テキストを画像から抽出しています",
  "数値データの参照元を整理しています",
  "数値データの読み取りを行っています",
  "元の資料から正確な文字起こしを行っています",
  "資料から重要なKPIを抽出しています",
  "セクションごとの要点を解析しています",
  "文章構造を分析してキーワードを抽出しています",
  "財務データの整合性を確認しています",
  "関連性の高い項目をグルーピングしています",
  "過去のデータとの比較を行っています",
  "関連資料とのリンクを生成しています",
  "表やグラフのデータを再構成しています",
  "ドキュメント全体のサマリーを作成しています",
  "分量の多い箇所を効率的に要約しています",
  "事業戦略のトレンドを抽出しています",
  "競合情報を関連付けて分析しています",
  "データの欠損部分を検索し、候補をリストアップしています",
  "業界ごとの特性を比較しています",
  "予測モデルに基づいて分析を進めています",
  "データの分類を行っています",
  "関連情報を横断的に探索しています",
  "複数ドキュメントの統合を進めています",
];

const TaskCount = () => {
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ランダムメッセージを保持するステートを用意
  const [randomMessage, setRandomMessage] = useState<string>("");

  // タスク数を取得する関数
  const fetchTaskCount = useCallback(async () => {
    try {
      const response = await axios.get<TaskCountResponse>(apiUrlGetWorkerCount);
      setTaskCount(response.data.task_count);
      setError(null);

      // データ更新ごとにランダムメッセージを選ぶ
      const idx = Math.floor(Math.random() * messages.length);
      setRandomMessage(messages[idx]);

    } catch (err) {
      setError("タスクのカウント取得に失敗した");
      setTaskCount(null);
      // エラー時はメッセージも空にしておく
      setRandomMessage("");
    }
  }, []);

  // コンポーネントマウント時 + 10秒ごとのポーリング
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTaskCount();
      }
    };

    const startPolling = () => {
      fetchTaskCount();
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchTaskCount();
        }
      }, 10000);
    };

    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTaskCount]);

  // 進捗の計算 (タスク数が多いほどバーが減る想定)
  const computeProgress = (count: number | null): number => {
    if (count === null) {
      // API取得前やエラー時は0%にしている
      return 0;
    }
    if (count === 0) {
      // タスク数ゼロなら100%
      return 100;
    }
    // MAX_TASK_COUNT以上は0%にクリップ
    const progress = ((MAX_TASK_COUNT - count) / MAX_TASK_COUNT) * 100;
    return Math.max(progress, 0);
  };

  const progressPercentage = computeProgress(taskCount);

  return (
    <div style={{ padding: 8, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 'auto',
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* タスク数の表示 */}
          {taskCount === 0 && !error ? (
            <Text>解析スタンバイ中: 0</Text>
          ) : (
            <>{/*<Space align="center">*/}
              <SyncOutlined spin style={{ color: "#262260", fontSize: 16 }} />
              <Text>1ページごとに解析中です。残り {taskCount === null ? "..." : Math.floor(taskCount / 3)} 分ほどで全てのページの分析が完了します。</Text>
            </>
          )}

          {/*

          <div
            style={{
              width: 200,
              height: 10,
              background: "#e0e0e0",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: "100%",
                background: taskCount === 0 ? "#4caf50" : "#262260",
                transition: "width 0.5s ease",
              }}
            />
          </div>
             */}


          {/* ランダムに表示する文章。ステートが空でなければ表示する */}
          {taskCount !== 0 && randomMessage && (
            <>
              <Text style={{ marginLeft: 8 }}>
                {randomMessage}
              </Text>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCount;
