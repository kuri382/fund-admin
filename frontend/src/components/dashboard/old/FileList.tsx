"use client"

import React from 'react';
import { Collapse, Tag } from 'antd';

interface Item {
    name: string;
    isObtained: boolean;
}

interface Section {
    title: string;
    items: Item[];
}

const data: Section[] = [
    {
        title: '会社概要',
        items: [
            { name: '会社登記簿謄本', isObtained: true },
            { name: '定款', isObtained: false },
            { name: '会社案内資料', isObtained: true },
            { name: 'ウェブサイト情報', isObtained: false },
        ],
    },
    {
        title: '業績ハイライト',
        items: [
            { name: '決算短信', isObtained: false },
            { name: '有価証券報告書', isObtained: true },
            { name: '月次・四半期財務データ', isObtained: true },
            { name: '過去数年分の財務諸表', isObtained: false },
        ],
    },
    {
        title: '事業分析',
        items: [
            { name: '事業計画書', isObtained: false },
            { name: '製品・サービスカタログ', isObtained: true },
            { name: '市場調査レポート', isObtained: true },
            { name: '競合分析資料', isObtained: false },
        ],
    },
    {
        title: '技術・研究開発',
        items: [
            { name: '研究開発計画書', isObtained: false },
            { name: '特許一覧', isObtained: false },
            { name: '技術ロードマップ', isObtained: false },
            { name: '研究開発費の内訳資料', isObtained: false },
        ],
    },
    {
        title: 'マーケット分析',
        items: [
            { name: '市場調査レポート', isObtained: false },
            { name: '業界統計データ', isObtained: false },
            { name: '競合他社の公開情報', isObtained: false },
            { name: 'アナリストレポート', isObtained: false },
        ],
    },
    {
        title: 'リスク評価',
        items: [
            { name: 'リスク管理関連の内部文書', isObtained: false },
            { name: '訴訟関連資料', isObtained: false },
            { name: 'コンプライアンス報告書', isObtained: false },
            { name: '外部監査報告書', isObtained: false },
        ],
    },
    {
        title: 'Issue Analysis',
        items: [
            { name: '各分析領域（財務、法務、業務、人事）からの問題点リスト', isObtained: false },
            { name: '経営陣へのインタビュー結果', isObtained: false },
            { name: '従業員満足度調査結果', isObtained: false },
            { name: '顧客フィードバックデータ', isObtained: false },
            { name: '業界のベストプラクティス情報', isObtained: false },
        ],
    },
    {
        title: '将来予測・評価',
        items: [
            { name: '中長期事業計画', isObtained: false },
            { name: '財務予測モデル', isObtained: false },
            { name: '投資計画書', isObtained: false },
            { name: '過去の企業価値評価資料', isObtained: false },
        ],
    },
];

const divContainer: React.CSSProperties = {
    height: '300px',
    minHeight: '100%',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
};

const divFileList: React.CSSProperties = {
    height: '100%',
    minHeight: '100%',
    overflowY: 'scroll',
};

const FileList: React.FC = () => {
    const collapseItems = data.map((section, index) => {
        const obtainedCount = section.items.filter(item => item.isObtained).length;
        const totalCount = section.items.length;

        return {
            key: index.toString(),
            label: (
                <div style={{ margin: '0px' }}>
                    {section.title} ({obtainedCount}/{totalCount})
                </div>
            ),
            children: (
                <div style={{ padding: '0px 30px' }}>
                    <ul>
                        {section.items.map((item, idx) => (
                            <li key={idx}>
                                {item.name}{' '}
                                {item.isObtained && <Tag color="green">取得済み</Tag>}
                            </li>
                        ))}
                    </ul>
                </div>
            ),
        };
    });

    return (
        <>
            <div style={divContainer}>
                <p style={{ paddingBottom: '10px' }}><b>読込済みデータ一覧</b></p>
                <div style={divFileList}>
                    <Collapse
                        accordion
                        items={collapseItems}
                        size='small'
                        ghost
                        style={{ margin: '0px' }}
                    />
                </div>
            </div>
        </>
    );
};

export default FileList;
