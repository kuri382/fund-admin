import React, { useState } from 'react';
import { Card, Spin, message, Button, Typography, Row, Col, Image } from 'antd';
import axios from 'axios';
import { apiUrlQueryRag } from '@/utils/api';
import { getAuth } from "firebase/auth";

import QADrawer from '@/components/dashboard/TableAnalysis/QADrawer';

const { Title, Paragraph } = Typography;


const formatText = (text: string | undefined) => {
    if (!text) return "";
    return text
        .replace(/####\s(.*?)(?:\n|$)/g, '<h3>$1</h3>') // ### を h3 タグに変換
        .replace(/###\s(.*?)(?:\n|$)/g, '<h3>$1</h3>') // ### を h3 タグに変換
        .replace(/##\s(.*?)(?:\n|$)/g, '<h2>$1</h2>') // ## を h2 タグに変換
        .replace(/#\s(.*?)(?:\n|$)/g, '<h2>$1</h2>') // # を h2 タグに変換
        //.replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>') // 番号付きリストに対応
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        //.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **text** を太字に変換
        .replace(/\n/g, '<br>'); // 改行に変換
};

const ResultReport: React.FC = () => {
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    const [drawerVisible, setDrawerVisible] = useState(false);

    const showDrawer = () => {
        setDrawerVisible(true);
    };

    const closeDrawer = () => {
        setDrawerVisible(false);
    };

    const imagePaths1 = Array.from({ length: 18 }, (_, i) => `/testImages/1/page_${i + 1}.jpg`);
    const imagePaths2 = Array.from({ length: 18 }, (_, i) => `/testImages/2/page_${i + 1}.jpg`);
    const imagePaths2024 = Array.from({ length: 18 }, (_, i) => `/testImages/2024/page_${i + 1}.jpg`);
    const summary = [
        `
        ### 1. 売上高の推移
        #### 売上高（百万円）
        - **FY21/3**: 3,500
        - **FY22/3**: 4,380
        - **FY23/3（予想）**: 5,550

        **分析**:
        - FY21/3からFY22/3にかけて、売上高は880百万円（25.1%）の増加。
        - FY22/3からFY23/3の予想では、1,170百万円（26.7%）の増加が見込まれています。
        - 売上高の増加は、主にオンラインメディア事業の成長によるものと考えられます。

        ### 2. 営業利益の推移
        #### 営業利益（百万円）
        - **FY21/3**: 700
        - **FY22/3**: 777
        - **FY23/3（予想）**: 830

        **分析**:
        - FY21/3からFY22/3にかけて、営業利益は77百万円（11.0%）の増加。
        - FY22/3からFY23/3の予想では、53百万円（6.8%）の増加が見込まれています。
        - 売上高の増加に対して営業利益の増加率が鈍化しているため、コスト管理の課題が示唆されます。

        ### 3. 経常利益の推移
        #### 経常利益（百万円）
        - **FY21/3**: 720
        - **FY22/3**: 784
        - **FY23/3（予想）**: 830

        **分析**:
        - FY21/3からFY22/3にかけて、経常利益は64百万円（8.9%）の増加。
        - FY22/3からFY23/3の予想では、46百万円（5.9%）の増加が見込まれています。
        - 経常利益も営業利益と同様に、増加率が鈍化していることが懸念されます。

        ### 4. 事業セグメント別の分析
        #### オンラインメディア事業
        - **FY22/3**: 売上高 3,000百万円（全体の68%）
        - **FY23/3（予想）**: 売上高 4,000百万円（全体の72%）

        **分析**:
        - オンラインメディア事業は、引き続き成長を続けており、全体の売上高に占める割合も増加しています。
        - 競争が激化している中で、広告収入やデジタルコンテンツの提供が影響していると考えられます。

        #### ITソリューション事業
        - **FY22/3**: 売上高 600百万円（全体の14%）
        - **FY23/3（予想）**: 売上高 800百万円（全体の14%）

        **分析**:
        - ITソリューション事業は、売上高の増加が見込まれていますが、全体に占める割合は横ばいです。
        - 競争環境の変化により、顧客のニーズに応じたサービス提供が求められています。

        #### 金融プラットフォーム事業
        - **FY22/3**: 売上高 780百万円（全体の18%）
        - **FY23/3（予想）**: 売上高 750百万円（全体の14%）

        **分析**:
        - 金融プラットフォーム事業は、売上高が減少する見込みであり、特に市場環境の変化や競争の激化が影響していると考えられます。
        - 収益性の改善が急務であり、戦略的な施策が必要です。

        ### 5. 異常検知のポイント
        - **売上高の増加率の鈍化**: 売上高は増加しているものの、営業利益や経常利益の増加率が鈍化していることは、コスト管理や競争環境の影響を示唆しています。
        - **金融プラットフォーム事業の減少**: 売上高が減少する見込みであり、特に競争が激化していることが懸念されます。
        - **ITソリューション事業の横ばい**: 売上高が増加する見込みであるものの、全体に占める割合が横ばいであることは、成長戦略の見直しが必要であることを示しています。

        ### 6. 結論
        ABEJA社は、全体的には売上高の増加を達成しているものの、利益面での成長が鈍化していることが懸念されます。特に金融プラットフォーム事業の減少や、ITソリューション事業の成長が横ばいであることは、今後の戦略において重要な課題となります。コスト管理や新たな収益源の確保が求められる中で、競争環境に適応した施策が必要です
        `,
        `### QAリスト

        #### 1. 質問: 2023年3月期第3四半期の業績に関する詳細なデータはありますか？
        - **質問背景**: 業績の詳細な数値が不明なため、正確な分析が困難です。
        - **必要なデータのタイトル**: 2023年3月期第3四半期決算詳細
        - **必要データのフォーマットや形式**: ExcelまたはCSV形式で、売上高、営業利益、経常利益、純利益などの項目を含む。

        #### 2. 質問: オンラインメディア事業のセグメント別売上高の推移を教えてください。
        - **質問背景**: オンラインメディア事業の成長を評価するために、セグメント別の詳細な売上高が必要です。
        - **必要なデータのタイトル**: オンラインメディア事業のセグメント別売上高推移
        - **必要データのフォーマットや形式**: グラフまたは表形式で、年度ごとの売上高を示す。

        #### 3. 質問: ITソリューション事業における顧客数の推移はどうなっていますか？
        - **質問背景**: 顧客数の推移が事業の成長を示すため、具体的な数値が必要です。
        - **必要なデータのタイトル**: ITソリューション事業の顧客数推移
        - **必要データのフォーマットや形式**: ExcelまたはCSV形式で、年度ごとの顧客数を含む。

        #### 4. 質問: 金融プラットフォーム事業の利益率に関するデータはありますか？
        - **質問背景**: 利益率の変動が事業の健全性を示すため、詳細なデータが必要です。
        - **必要なデータのタイトル**: 金融プラットフォーム事業の利益率推移
        - **必要データのフォーマットや形式**: 表形式で、年度ごとの売上高と利益を示す。

        #### 5. 質問: 過去のM&A活動に関する詳細な情報はありますか？
        - **質問背景**: M&Aが企業成長に与える影響を評価するため、具体的な情報が必要です。
        - **必要なデータのタイトル**: 過去のM&A活動の詳細
        - **必要データのフォーマットや形式**: 文書形式で、M&Aの対象企業、時期、目的、成果を含む。

        #### 6. 質問: 今後の業績予想に関する根拠や前提条件は何ですか？
        - **質問背景**: 業績予想の信頼性を評価するため、根拠や前提条件が必要です。
        - **必要なデータのタイトル**: 業績予想の根拠と前提条件
        - **必要データのフォーマットや形式**: 文書形式で、具体的な数値や市場動向を含む。

        #### 7. 質問: 競合他社との比較データはありますか？
        - **質問背景**: 競争環境を理解するために、競合他社との比較が必要です。
        - **必要なデータのタイトル**: 競合他社との業績比較データ
        - **必要データのフォーマットや形式**: 表形式で、主要な競合他社の売上高、利益、成長率を含む。
        `,
    ]

    const imageComments2023 = [
        'タイトルスライド',
        '各セクションでの詳細な分析やデータを示すための構成となっています。',
        'タイトルスライド',
        '### 結論\nABEJA社は、2023年3月期第3四半期において、売上高は前年同期比で増加したものの、営業利益や経常利益は減少しており、全体的には厳しい経営環境に直面しています。\n\n### 詳細な分析\n1. **売上高の増加**:\n   - 売上高は3,396百万円で、前年同期比で263百万円（8.4%）の増加を記録しています。これは、ITトレンドを中心としたオンラインメディア事業の成長によるものと考えられます。\n\n2. **営業利益の減少**:\n   - 営業利益は393百万円で、前年同期比で92百万円（19.0%）の減少となっています。この減少は、コストの増加や競争の激化が影響している可能性があります。\n\n3. **経常利益の減少**:\n   - 経常利益も395百万円で、前年同期比で94百万円（19.4%）の減少が見られます。これは、金融プラットフォーム事業が国内外の市場での影響を受けていることが要因とされています。\n\n4. **親会社株主に帰属する四半期純利益の減少**:\n   - 親会社株主に帰属する四半期純利益は222百万円で、前年同期比で39百万円（14.9%）の減少です。このことから、全体的な収益性が低下していることが示唆されます。\n\n### 結論の補足\n全体として、ABEJA社は売上の増加を達成したものの、利益面では厳しい状況にあり、特に営業利益と経常利益の減少が目立ちます。今後の戦略としては、コスト管理や新たな収益源の確保が求められるでしょう。',
        '### 結論\nABEJA社は、コスト削減施策の成果を上げつつ、M&Aや新規事業への投資を通じて成長を目指している。特にオンラインメディア事業の拡大に注力しており、ITソリューション事業も収益が回復しているが、VCファンド事業は前年同期比で減収となっている。\n\n### 詳細な分析\nスライドから読み取れる情報によると、ABEJA社は2019年3月期からコスト削減施策を進め、その結果として一定の成果を得ていることが示されています。2021年3月期以降は、M&Aや新規事業への投資を強化し、特にオンラインメディア事業の拡大に注力しています。\n\n売上高の推移を見ると、オンラインメディア事業は着実に成長しており、ITソリューション事業も収益が回復していることがわかります。一方で、金融プラットフォーム事業は大幅な成長を見せているものの、VCファンド事業は前年同期比で減収となっており、全体的な収益構造には課題が残る状況です。\n\nこのように、ABEJA社は新たな市場機会を捉えつつも、特定の事業セグメントにおいては厳しい環境に直面していることが伺えます。今後の成長戦略として、オンラインメディア事業のさらなる拡大と、収益性の改善が求められるでしょう。',
        '結論として、ABEJA社はオンラインメディア事業において成長を見せている一方で、販売費や人件費の増加が利益に影響を与えていることが示されています。\n\n詳細に見ると、売上原価はオンラインメディア事業におけるマーケティング投資の拡大や動画コンテンツの制作強化によって増加しています。特に、金融プラットフォーム事業の原価が大きな要因となっており、これが売上高の増加に寄与していることがわかります。\n\n一方で、販売費については、222の減少が見られ、これは人員増強や新たなVCファンドの設立に伴う採用費用の増加が影響しています。これにより、運営費用も増加しており、全体的な利益率に対する圧力がかかっている状況です。\n\nこのように、ABEJA社は成長の機会を追求しつつ、コスト管理や効率化が求められる局面にあると言えます。',
        '### 結論\nABEJA社は、2023年3月期第3四半期において、流動資産や固定資産の増加を示し、全体的に健全な財務状況を維持しています。特に、流動資産の増加率が高く、自己資本比率も安定していることから、成長戦略が順調に進行していることが伺えます。\n\n### 詳細な分析\nこのスライドは、ABEJA社の2023年3月期第3四半期のバランスシートを示しています。以下に主要なポイントをまとめます。\n\n1. **流動資産の増加**:\n   - FY22/3Qの流動資産は2,673百万円からFY23/3Qには3,031百万円に増加し、約13.4%の成長を記録しています。これは、資金の流動性が向上していることを示しており、短期的な支払い能力が強化されています。\n\n2. **固定資産の増加**:\n   - 固定資産も744百万円から773百万円に増加しており、約4.0%の成長を見せています。この増加は、長期的な投資や資産の拡充を反映していると考えられます。\n\n3. **資産合計の増加**:\n   - 資産合計は3,418百万円から3,805百万円に増加し、約11.3%の成長を示しています。全体的に資産が増加していることは、企業の成長を支える基盤が強化されていることを示唆しています。\n\n4. **負債の状況**:\n   - 流動負債は549百万円から427百万円に減少し、約22.2%の減少を示しています。一方、固定負債は17百万円から22百万円に増加していますが、全体的には負債の管理が適切に行われていることが伺えます。\n\n5. **自己資本比率**:\n   - 自己資本比率は82.0%と高水準を維持しており、企業の財務的な安定性を示しています。高い自己資本比率は、外部からの資金調達に依存せず、自己資本での運営が可能であることを意味します。\n\n6. **成長戦略の実施**:\n   - スライドには、マーケティングやシステム開発を中心とした成長投資が行われていることが記載されています。これにより、収益の創出が期待されており、今後の成長が見込まれます。\n\n総じて、ABEJA社は健全な財務状況を維持しつつ、成長戦略を積極的に推進していることが明らかです。',
        '### 結論\nABEJA社は、オンラインメディア、ITソリューション、金融プラットフォームの3つの主要セグメントで構成されており、2023年度第3四半期の売上高は3,396百万円で、前年同期比8.4%の成長を示しています。\n\n### 詳細な分析\nスライドには、ABEJA社の事業構成と売上の内訳が示されています。主な事業は以下の通りです：\n\n1. **オンラインメディア事業**：\n   - B2B商材のマッチングプラットフォーム（ITトレンド）\n   - B2B特化の動画プラットフォーム（bizplay）\n   - B2B特化のイベントプラットフォーム（ITトレンドEXPO）\n\n2. **ITソリューション事業**：\n   - マーケティング支援クラウド（List Finder MA）\n   - 営業支援クラウド（Sales Doc）\n   - オンラインセミナー支援クラウド（Cociripo）\n\n3. **金融プラットフォーム事業**：\n   - IFAサービス（International Financial Advisor）\n   - 事業承継M&Aサービス（IMAP）\n\n売上高の内訳では、オンラインメディア事業が74%を占め、最も大きな割合を示しています。次いでITソリューション事業が15%、金融プラットフォーム事業が11%となっています。この構成から、オンラインメディア事業が同社の収益の中心であることが明らかです。\n\nさらに、前年同期比で8.4%の成長を記録しており、全体的に堅調な業績を維持していることが示されています。これにより、ABEJA社は今後も成長が期待される企業であると言えるでしょう。',
        'このスライドは、ABEJA社のIR資料の一部であり、「オンラインメディア事業」に関する内容が示されています。具体的な情報は記載されていませんが、以下のような点が考えられます。\n\n1. **事業の重要性**: オンラインメディア事業は、現代のビジネス環境において非常に重要な分野であり、デジタルコンテンツの消費が増加していることを反映しています。この事業が企業全体の成長に寄与している可能性があります。\n\n2. **市場動向**: オンラインメディアは、広告収入やサブスクリプションモデルなど、収益化の多様な手段を持つため、競争が激しい市場であることが予想されます。ABEJA社がどのようにこの競争に対応しているのかが重要なポイントです。\n\n3. **戦略的アプローチ**: このスライドは、企業がオンラインメディア事業にどのような戦略を持っているのかを示唆しているかもしれません。例えば、新しいコンテンツの開発やパートナーシップの構築などが考えられます。\n\n4. **将来の展望**: オンラインメディア事業の成長が期待される中で、ABEJA社がどのようなビジョンを持っているのか、またその実現に向けた具体的な計画があるのかが重要です。\n\nこのスライドからは、ABEJA社がオンラインメディア事業に注力していることが伺えますが、具体的なデータや戦略については、他のスライドや資料を参照する必要があります。',
        '結論として、ABEJA社はオンラインメディア事業において着実な成長を遂げており、特に最近の四半期での売上高とセグメント利益が顕著に増加しています。\n\n詳細な分析として、スライドからは以下のポイントが読み取れます。\n\n1. **売上高の推移**:\n   - FY18/3QからFY23/3Qにかけて、オンラインメディア事業の売上高は着実に増加しています。特にFY22/3QからFY23/3Qにかけて、売上高は2,247百万円から2,510百万円に増加しており、成長が続いていることが示されています。\n\n2. **セグメント利益の推移**:\n   - セグメント利益も同様に増加しており、FY22/3Qの625百万円からFY23/3Qの959百万円へと大きく伸びています。このことは、事業の収益性が向上していることを示唆しています。\n\n3. **市場環境の影響**:\n   - コロナ禍におけるデジタルトランスフォーメーション（DX）の加速が、ITトレンドの影響で売上の増加に寄与していると考えられます。また、掲載製品数の拡大や口コミ機能の強化が、顧客からの資材請求数の増加に成功している要因とされています。\n\n4. **オンラインEXPOの影響**:\n   - FY23の第2四半期にはオンラインEXPOの開催がなかったことが影響し、売上に対する影響があったとされていますが、全体としては堅調な成長を維持しています。\n\nこのように、ABEJA社はオンラインメディア事業において、持続的な成長と収益性の向上を実現しており、今後の展望にも期待が持てる状況です。',
        'このスライドから読み取れるABEJA社の状況は、企業のデジタルトランスフォーメーション（DX）が進展していることを示しています。特に、コロナ禍の影響を受けて急増した来訪者数が、現在は安定した成長フェーズに入っていることが強調されています。\n\n### 詳細な分析\n\n1. **来訪者数の増加**:\n   - スライドには、過去数年間の来訪者数の推移が示されています。特にFY22/3 QからFY23/3 Qにかけて、来訪者数が大幅に増加しており、15,385,033人に達しています。この増加は、企業のDX化が進んだ結果と考えられます。\n\n2. **ITトレンドのメディア価値の向上**:\n   - 来訪者数の増加は、ITトレンドに対する関心の高まりを反映しており、メディア価値が向上していることを示唆しています。これは、企業がデジタル技術を活用することで、より多くのユーザーを引き付けていることを意味します。\n\n3. **マッチング数の増加**:\n   - 2022年3月期第4四半期において、特に顕著な成長を見せたカテゴリがいくつかあります。例えば、アカウント電子化やWeb・クラウド請求書の分野では、421%と412%の成長率を記録しています。これにより、企業のデジタルサービスへの需要が高まっていることがわかります。\n\n4. **その他の成長カテゴリ**:\n   - ナレッジマネジメント（280%）、購買管理（204%）、オンラインストレージ（150%）など、他のカテゴリでも成長が見られます。これらのデータは、企業がデジタルツールを導入し、業務効率を向上させようとしていることを示しています。\n\n### 結論\nABEJA社は、コロナ禍を経てDXの進展に伴い、来訪者数やマッチング数が大幅に増加しています。これにより、ITトレンドのメディア価値が向上し、企業のデジタルサービスへの需要が高まっていることが明らかです。今後もこの成長が続くことが期待されます。',
        'このスライドから読み取れるABEJA社の状況は、会員ユーザー数が着実に増加していることです。具体的には、2018年から2022年11月までの期間において、会員数は増加傾向にあり、最終的には92,778人に達しています。この成長は、日経IDとの連携や他メディアとのアライアンス施策が功を奏していることを示唆しています。\n\nまた、ビジネス書の紹介動画などのコンテンツ拡充が、会員獲得に寄与していることが強調されています。さらに、マネタイズに向けた取り組みや、会員向けのカンファレンス開催への注力も見られ、今後の成長が期待されます。全体として、ABEJA社は戦略的な施策を通じて会員基盤を拡大し、収益化の道を模索している状況です。',
        '申し訳ありませんが、画像の内容を直接読み取ることはできません。しかし、IR資料の「ITソリューション事業」に関する一般的な情報や分析を提供することはできます。具体的なデータや内容について教えていただければ、それに基づいて詳細な解説を行うことができます。どのような情報が必要ですか？',
        '結論として、ABEJA社はITソリューション事業において売上高とセグメント利益の両方で成長を遂げているが、競合環境の変化に直面していることが示されています。\n\n詳細に見ると、スライドにはITソリューション事業の売上高とセグメント利益の推移が示されています。売上高はFY18/3QからFY23/3Qにかけて着実に増加しており、特にFY21/3QからFY23/3Qにかけては359百万円に達しています。この成長は、顧客単価の向上やサービスの差別化戦略によるものと考えられます。\n\n一方で、セグメント利益も同様に増加しており、FY23/3Qには107百万円に達しています。これは、収益性の向上を示しており、効率的なコスト管理や高付加価値サービスの提供が寄与していると推測されます。\n\nしかし、Cocriポの競合が激化していることも指摘されており、今後の利用者数の拡大に向けた戦略が求められています。特に、前期のコロナ禍からの回復期において、競争が厳しくなる可能性があるため、さらなる差別化や新たな市場開拓が重要になるでしょう。\n\n総じて、ABEJA社は成長を続けているものの、競争環境においては慎重な戦略が必要とされています。',
        'このスライドから読み取れるABEJA社の状況は、顧客アカウント数の安定した推移と、収益性の向上に向けた戦略的な取り組みが示されています。\n\nまず、2020年3月以降、同社はアカウント数の増加から収益強化へと戦略をシフトしています。グラフを見ると、アカウント数は横ばいで推移しているものの、顧客単価（ARPU）は徐々に上昇していることがわかります。これは、顧客満足度を高めるための施策が功を奏していることを示唆しています。\n\nまた、アカウント数が安定している中で、ARPUの増加は、既存顧客からの収益を最大化するための努力が実を結んでいることを意味します。これにより、引き続き収益力の向上を目指していることが伺えます。\n\n総じて、ABEJA社は顧客基盤の拡大を図りつつ、収益性の向上に成功している状況であり、今後もこの戦略を継続することでさらなる成長が期待されます。',
        'このスライドから読み取れるABEJA社の状況は、Cocoripoというサービスの累計アカウント数が着実に増加していることです。特に、2020年のコロナ禍においてリモートワークの需要が高まり、同社のウェブ会議ツールの利用が促進されたことが背景にあります。\n\nグラフを見ると、アカウント数は2019年から2022年にかけて一貫して増加しており、特に2020年の初めから急激な成長を見せています。この成長は、リモートワークの普及に伴い、ウェブ会議ツールの必要性が高まったことを示唆しています。\n\nしかし、競合が激化しているため、新規ユーザーの獲得が難しくなっていることも指摘されています。これに対処するために、同社は差別化施策として、オンデマンド配信機能やウェビナー開催支援サービスの構築を進めているとのことです。これにより、競争の中での優位性を確保し、さらなる成長を目指していると考えられます。\n\n総じて、ABEJA社はリモートワークの需要を背景に成長を遂げているものの、競争の激化に直面しており、差別化戦略を強化する必要がある状況にあると言えます。',
        'このスライドはABEJA社の「金融プラットフォーム事業」に関するものであり、会社の戦略や方向性を示唆しています。\n\nまず、金融プラットフォーム事業は、企業が金融サービスを提供するための基盤を構築することを目的としていると考えられます。この事業は、デジタル化が進む現代において、顧客のニーズに応えるための重要な要素です。特に、金融業界ではテクノロジーの進化が急速であり、競争が激化しています。\n\nまた、このスライドが示すように、ABEJA社は金融プラットフォーム事業に注力することで、収益の多様化や新たな市場機会の創出を目指している可能性があります。これにより、既存のビジネスモデルを強化し、持続可能な成長を図る戦略が見て取れます。\n\n総じて、ABEJA社の金融プラットフォーム事業は、今後の成長戦略の中心的な役割を果たすことが期待されており、業界内での競争力を高めるための重要なステップであると言えるでしょう。',
        '### 結論\nABEJA社は、金融プラットフォーム事業において売上高の回復を目指しているものの、利益面では厳しい状況に直面しています。\n\n### 詳細な分析\nスライドには、ABEJA社の金融プラットフォーム事業の売上高とセグメント利益の推移が示されています。売上高は、FY21/3QからFY23/3Qにかけて増加傾向にあり、特にFY22/3Qには210百万円とピークを迎えています。しかし、FY23/3Qには133百万円に減少しており、前期比での落ち込みが見られます。\n\n一方、セグメント利益はFY21/3Qに57百万円の最高値を記録した後、FY22/3Qには10百万円に減少し、FY23/3Qには29百万円の損失を計上しています。このことから、売上高は一時的に増加したものの、利益面では持続的な成長が難しい状況にあることが伺えます。\n\nまた、スライドの説明文からは、前期の株式市場の影響で収益力が低下していることが示唆されており、引き続き採用や人材育成の強化を通じて、営業力の向上と独自商材の開発を推進する方針が明記されています。これにより、再浮上を目指していることが強調されています。\n\n総じて、ABEJA社は売上高の回復を図る一方で、利益の改善が急務であることが明らかです。今後の戦略がどのように展開されるかが注目されます。',
        'このスライドは、ABEJA社のIR資料の一部であり、業績予想や配当についての情報が含まれていることが示唆されています。具体的な内容は記載されていませんが、以下のような点が考えられます。\n\n1. **業績予想**: 会社の将来の収益や成長見込みについての予測が示される可能性があります。これには、売上高や利益率、成長率などの指標が含まれることが一般的です。\n\n2. **配当政策**: 株主への利益還元の方針についても触れられるでしょう。配当の支払い方針やその変更、配当利回りなどが重要な情報となります。\n\nこのスライドは、投資家やステークホルダーに対して、会社の財務状況や将来の見通しを明確にするための重要な要素を含んでいると考えられます。具体的な数値や詳細な分析がないため、全体像を把握するには他のスライドや資料との併せての確認が必要です。',
        'ABEJA社の2023年3月期業績予想は、全体的に好調な成長を示しています。以下に、各指標の詳細をまとめます。\n\n1. **売上高**: FY22/3実績は4,380百万円に対し、FY23/3予想は5,550百万円となっており、前年同期比で1,169百万円（+26.7%）の増加が見込まれています。この成長率は、会社の市場での競争力や需要の増加を反映していると考えられます。\n\n2. **営業利益**: FY22/3実績は777百万円で、FY23/3予想は830百万円です。営業利益は52百万円（+6.7%）の増加が見込まれています。これは、売上の増加に伴い、効率的なコスト管理が行われていることを示唆しています。\n\n3. **経常利益**: FY22/3実績は784百万円、FY23/3予想は830百万円で、45百万円（+5.8%）の増加が見込まれています。営業利益と同様に、安定した利益成長が期待されています。\n\n4. **親会社株主に帰属する四半期純利益**: FY22/3実績は448百万円に対し、FY23/3予想は475百万円で、26百万円（+6.0%）の増加が見込まれています。これも、全体的な業績向上に寄与しています。\n\n5. **配当**: FY22/3の配当は38.00円で、FY23/3の予想は39.00円となっており、1.00円の増加が見込まれています。これは、株主還元の意向を示しており、投資家にとってもポジティブな要素です。\n\n総じて、ABEJA社は前年に比べて売上、利益ともに堅調な成長を見込んでおり、今後の業績に対する期待が高まっています。',
        '### 結論\nABEJA社は、既存事業の利益水準を高めつつ、積極的な投資を通じて成長を図っており、特に金融プラットフォーム事業に注力しています。今後は新規事業開発やM&Aを通じてシナジーの最大化を目指し、CVC投資にも力を入れる方針です。\n\n### 詳細な分析\nスライドには、ABEJA社の連結売上高と営業利益の推移が示されています。連結売上高は、FY18/3からFY23/3にかけて着実に増加しており、特にFY22/3には5,550百万円の予測が立てられています。この成長は、既存事業の利益水準を向上させる施策や、金融プラットフォーム事業の強化によるものと考えられます。\n\n営業利益も同様に増加傾向にあり、FY23/3には830百万円の予測がされています。これは、効率的なコスト管理や新規事業の収益化が進んでいることを示唆しています。\n\nさらに、会社はM&Aを通じて既存事業とのシナジーを最大化することを目指しており、これにより事業の幅を広げる意向が見受けられます。また、CVC（コーポレート・ベンチャー・キャピタル）投資に注力することで、新たなビジネスチャンスを創出し、リーダーシップを強化する狙いがあります。\n\n総じて、ABEJA社は持続的な成長を追求し、既存事業の強化と新規事業の開発を両立させる戦略を展開していることが明らかです。',
        '株式会社ABEJAは、東京都渋谷区に本社を構える企業で、代表者は富田直人氏です。2022年12月末時点での従業員数は159名であり、資本金は1,113,418千円となっています。\n\nこの会社は、複数の子会社を持ち、具体的には「Innovation & Co.」「Innovation X Solutions」「Innovation IFA Consulting」「Innovation M&A Partners」といった企業が存在します。これにより、ABEJA社は多様なサービスを提供し、ビジネスの幅を広げていることが伺えます。\n\n全体として、ABEJA社は安定した資本金と一定の従業員数を持つ企業であり、成長を目指す姿勢が見受けられます。',
        'このスライドは、ABEJA社のIR資料における情報提供の取り扱いについて説明しています。主なポイントは以下の通りです。\n\nまず、資料は投資家に対する情報提供を目的としており、売買の勧誘を意図したものではないことが明記されています。これは、投資家が資料を利用する際に、誤解を避けるための重要な注意点です。\n\n次に、将来の業績予想に関する記載があり、目標や予測についての情報が提供されていますが、これらの情報には確実性がないことが強調されています。具体的には、現在の業績予想と異なる結果が生じる可能性があるため、投資家は慎重に判断する必要があります。\n\nさらに、業界データに基づく情報も含まれており、これに関しても完全な正確性や保証はないとされています。したがって、投資家は自己の判断と責任において情報を利用することが求められています。\n\n総じて、このスライドは投資家に対して透明性を持たせつつ、リスクを理解した上での情報利用を促す内容となっています。']

    const imageComments2024 = [
        `タイトルスライド`,
        `各セクションでの詳細な分析やデータを示すための構成となっています。`,
        'タイトルスライドです',
        'このIR資料は、ABEJAの今後の成長戦略と「ABEJA Platform」の拡充に関する内容を詳述しています。\n\n### 結論\nABEJAは、プラットフォームの機能を強化し、顧客ニーズに応じた価値提供を目指しています。特に、LLM（大規模言語モデル）を活用した新たなサービスの展開や、技術者の採用と育成に注力しています。\n\n### 詳細な内容\n\n1. **ABEJA Platformの拡充**\n   - ABEJA Platformは、顧客の多様なニーズに応えるために機能を追加しています。具体的には、BaaS（Backend as a Service）レイヤーやセキュリティレイヤー、コネクトレイヤーなどが含まれています。\n   - UI/UXの改善や業界特化型のソリューション提供を通じて、顧客体験の向上を図っています。\n\n2. **LLMの活用**\n   - LLMを活用した「ABEJA LLM Series」の提供により、企業のDX（デジタルトランスフォーメーション）を支援します。これにより、業務プロセスの効率化や新たな価値創出を目指しています。\n\n3. **人材の採用と育成**\n   - 技術者の採用と育成に力を入れ、専門性の高い人材を確保することで、技術力の向上を図っています。これにより、企業の成長を支える基盤を強化しています。\n\n4. **周辺領域を含めたサポート**\n   - ABEJA Platformは、ERPやCRMなどのシステムとの連携を強化し、企業全体の業務効率を向上させることを目指しています。\n\nこの資料は、ABEJAがどのようにして市場の変化に対応し、持続可能な成長を実現しようとしているかを示しています。',
        'このスライドは、ABEJAの2024年8月期の業績予想と、同社が注力するミッションクリティカルな領域に関する情報を提供しています。\n\n### 結論\nABEJAは、2024年8月期において売上高3,470百万円を見込んでおり、前年同期比で25.0%の増加を目指しています。また、ミッションクリティカルな領域においてAI技術を活用し、サービスの提供を強化する方針です。\n\n### 詳細内容\n1. **ミッションクリティカルな領域**:\n   - ABEJAは、AI技術を駆使して、ミッションクリティカルな領域に特化したサービスを提供しています。この領域は、他のシステムと連携し、実用性が高いデータの活用を促進することが求められます。\n\n2. **業績予想**:\n   - 2024年8月期の業績予想では、売上高が3,470百万円、営業利益が450百万円、経常利益が447百万円、当期純利益が388百万円とされています。\n   - これらの数値は、前年同期比でそれぞれ25.0%、11.7%、17.7%、-8.0%の変化を示しています。\n\n3. **成長戦略**:\n   - ABEJAは、事業基盤の強化と採用を中心にした投資を進める計画を立てています。特に、2023年8月期の実績を踏まえた上で、さらなる成長を目指しています。\n\nこのスライドは、ABEJAの戦略的な方向性と業績見通しを明確に示しており、今後の成長に向けた取り組みが強調されています。',
        'この画像は、株式会社ABEJAの2023年8月期の決算説明資料の一部です。以下に内容を詳細にまとめます。\n\n### 1. 会社概要\n- **会社名**: 株式会社ABEJA\n- **本社所在地**: 東京都港区芝二丁目1番14号\n- **設立**: 2012年9月10日（決算期は8月）\n- **事業内容**: デジタルプラットフォーム事業（全般的なDXの推進を目的とした事業）\n- **代表者**: 代表取締役CEO 同時に取締役COO 小野雅裕\n- **資本金**: 732万7千円\n- **従業員数**: 103人\n\n### 2. 株主構成\n- **主要株主**:\n  - SOMPO Light Vortex株式会社: 19.7%\n  - 関口朋子: 16.4%\n  - ヒューリック株式会社: 5.0%\n  - 株式会社インシネイティブ・インベストメント: 3.8%\n  - 株式会社NTTファイナンス: 3.8%\n  - その他の株主も含まれています。\n\nこの資料は、ABEJAの企業の基本情報や株主構成を示しており、投資家や関係者に向けた重要な情報を提供しています。今後の成長戦略や業績予想についても言及される予定です。',
        'このIR資料は、ABEJAの企業理念、ミッション、ビジョン、及びデジタルプラットフォーム事業に関する内容を詳述しています。\n\n### 企業理念、ミッション、ビジョン\n- **企業理念**: 「ゆたかな世界を、実装する」\n- **ミッション**: 「テクノロジーの力で産業構造を変革する」\n- **ビジョン**: 「ABEJAで世界を変える」\n\nこれらの理念は、ABEJAが目指す方向性を示しており、テクノロジーを駆使して社会に貢献し、持続可能な発展を促進することを強調しています。\n\n### デジタルプラットフォーム事業\nABEJA Platformを中心に、デジタルトランスフォーメーション（DX）を推進しています。具体的には、以下のような取り組みが示されています。\n\n- **トランスフォーメーション領域**: DXの推進により、企業の業務を効率化し、価値を創出することを目指しています。\n- **オペレーション領域**: ABEJA Platformを利用して、製造業のデジタル化を進め、業務の最適化を図ります。\n\n### Technopreneurship\n資料では「Technopreneurship」という概念が紹介されています。これは、テクノロジーを活用し、リベラルアーツの視点を取り入れた起業家精神を指します。社会のニーズに応じた技術の適用を通じて、持続可能な発展を促進することが強調されています。\n\n### ABEJAのビジネスモデル\nABEJAのビジネスモデルは、電子機器製造サービス（EMS）に近い形態をとっており、ABEJA Platformを活用して製造ラインを構築し、効率的な生産を実現しています。これにより、新たな課題への対応が可能となり、ビジネスの成長を支援します。\n\nこの資料は、ABEJAがテクノロジーとリベラルアーツを融合させ、持続可能な社会の実現を目指す姿勢を示す重要な文書です。',
        'このスライドは、ABEJAの2023年8月期の業績ハイライトをまとめたIR資料です。以下に主要なポイントを詳述します。\n\n### 1. 2023年8月期の業績\n- **売上高**: 2,775百万円\n- **売上前年同期比**: 40.3%の増加\n- **売上総利益率**: 62.2%\n- **営業利益**: 402百万円\n- **営業利益率**: 14.5%\n\n### 2. 事業の状況\n- 事業は順調に推移しており、PwCコンサルティングとの連携を強化し、デジタルトランスフォーメーション（DX）支援に注力しています。\n- 2023年8月期には、103社の新規顧客を獲得し、前年同期比での成長が見込まれています。\n\n### 3. 2024年8月期の業績予想\n- 売上高は3,470百万円を見込んでおり、前年同期比で25.0%の成長を目指しています。\n- 営業利益は505百万円（前年同期比11.7%増）、営業利益率は13.0%を予想しています。\n\n### 4. デジタルプラットフォーム事業\n- 2016年6月からのDX推進支援実績は300社以上。\n- Platform関連の売上高は84.9%の成長を記録。\n- 機械学習の平均稼働上昇率は91.8%、データ分析の平均稼働上昇率は160.3%に達しています。\n\n### 5. 結論\nABEJAは、デジタルトランスフォーメーションの推進を通じて、顧客基盤を拡大し、業績を大きく伸ばしています。2024年に向けても成長を続ける見込みであり、特にDX支援において強力なパートナーシップを築いていることが強調されています。',
        'このIR資料は、ABEJA社のSDGs（持続可能な開発目標）への取り組みと、同社のサービスがどのようにこれらの目標に貢献しているかを示しています。\n\n### SDGsへの取り組み\nABEJA社は、テクノロジーのプレナリシップを基盤に、SDGsの達成を目指し、開発と企業の取り組みを支援しています。具体的には、以下のような項目が挙げられています：\n\n1. **企業の持続可能性**：企業活動が持続可能であることを促進するための支援。\n2. **データ分析**：ABEJA Platformを通じて、データの活用を促進し、企業の意思決定を支援。\n3. **パートナーシップ**：他の企業との協力を通じて、持続可能な社会の実現を目指す。\n\n### ユニークなポジショニング\n資料では、ABEJA社が提供するサービスのユニークなポジショニングも示されています。特に、コアなビジネスプロセスのデジタルトランスフォーメーション（DX）を低負荷で推進することに焦点を当てています。これにより、企業は効率的に業務を進めることが可能になります。\n\n### サービスの具体例\nスライドには、ABEJA社のサービスが利用されている具体的な事例も示されています。これにより、企業がどのようにSDGsに貢献しているかが具体的に理解できるようになっています。\n\n### 免責事項\n最後に、資料には情報の利用に関する免責事項が記載されています。これは、提供される情報の正確性や将来の見通しに関する責任を明確にするためのものです。\n\nこのように、ABEJA社はテクノロジーを活用して持続可能な社会の実現に向けた取り組みを行っており、その具体的なサービスや事例を通じて、SDGsへの貢献を示しています。',
        'このスライドは、ABEJAの今後の成長戦略について詳述しています。以下にその内容をまとめます。\n\n### 1. 市場規模\n- **サービス可能な市場（SAM）**は、2021年度から2025年度にかけて年平均成長率が15.3%と予測されています。\n- **国内エンタープライズIT市場（TAM）**は、2023年度から2030年度にかけて年平均成長率が12.2%と見込まれています。\n- 2025年度には、SAMが約4,100億円、TAMが約15,494億円に達する見込みです。\n\n### 2. 成長戦略の柱\nABEJAは以下の4つの戦略を掲げています：\n1. **顧客基盤の拡大と深化**：300以上のDX推進案件を通じて、顧客基盤の拡大を目指します。\n2. **ABEJA Platformの拡充**：プラットフォームの機能を強化し、収益基盤の拡大を図ります。\n3. **人材の採用、育成とカルチャーの醸成**：優秀な人材の確保と育成を重視し、企業文化の強化を目指します。\n4. **ミッションクリティカルな領域でのサービス提供拡大**：重要なビジネス領域におけるサービスの提供を強化します。\n\n### 3. 取引規模の拡大\n- 取引規模の拡大には、取引領域の拡大やビジネスの深化、パートナー企業との連携強化が含まれます。\n- 新規顧客の獲得には、ブランディング・マーケティング戦略やDX人材の育成が重要視されています。\n\nこのスライドは、ABEJAがデジタルトランスフォーメーション市場での成長を目指し、具体的な戦略を示していることを強調しています。',
        'このIR資料は、ABEJAの2023年8月期の業績と事業状況を示しています。以下に主要なポイントをまとめます。\n\n### 1. 業績概要\n- **売上高**: 2022年8月期は2,152百万円、2023年8月期は3,971百万円で、前年比で1,819百万円の増加（84.5%増）。\n- **営業利益**: 2022年8月期は-56百万円、2023年8月期は-206百万円で、損失が拡大。\n- **経常利益**: 2022年8月期は-107百万円、2023年8月期は-310百万円で、こちらも損失が増加。\n- **当期純利益**: 2022年8月期は-1,159百万円、2023年8月期は-1,950百万円で、純損失が拡大。\n\n### 2. 事業の状況\n- **PwCコンサルティング**: ABEJAは、PwCと連携し、生成AIを活用したDX推進を支援するサービスを提供。\n- **市場機会**: 事業の拡大に向けた機会を捉え、取引規模の拡大に注力。\n\n### 3. 具体的な数値データ\n- **売上構成**: 主要な売上は、デジタルソリューションに関連するサービスから得られている。\n- **顧客基盤**: さまざまな業種にわたる顧客に対してサービスを提供しており、特に中部エリアに注力。\n\n### 4. 今後の展望\n- **DX推進の取り組み**: 自治体や地域のDXを支援するための具体的な施策を展開予定。\n- **生成AIの活用**: デジタル化の推進に向けた生成AIの活用を強化し、地域経済の活性化を図る。\n\nこの資料は、ABEJAの現在の業績と将来の戦略を示しており、特に生成AIを活用したDX推進に注力していることが強調されています。',
        'このIR資料は、ABEJA Platformが提供する価値とその活用事例について詳述しています。\n\n### 結論\nABEJA Platformは、デジタルトランスフォーメーション（DX）を加速させるための多層的なサービスを提供し、実際のビジネスプロセスにおいてAI技術を活用した事例を示しています。\n\n### 詳細な内容\n\n1. **ABEJA Platformの価値**\n   - ABEJA Platformは、複数のビジネスプロセスに取り組み、顧客のDXを迅速に推進することを目指しています。これにより、サービスの質を向上させ、顧客満足度を高めることが期待されています。\n\n2. **DXの進展**\n   - スライドでは、DXの進展が段階的に示されており、各プロジェクト（PJ）を通じてサービスが積み重なり、全体としての進行が促進される様子が描かれています。\n\n3. **具体的な事例**\n   - ABEJA Platformを活用した具体的な事例として、工場内の暗視度の定量化や、AIを用いた人とAIの協働による業務の効率化が挙げられています。これにより、現場でのデータ収集や分析が自動化され、業務プロセスが改善されることが示されています。\n\n4. **導入プロセス**\n   - 導入プロセスは、従来の手法からABEJA Platformを利用した新しい手法へと移行する過程が示されています。これにより、データの可視化や分析が効率的に行われ、業務の最適化が図られます。\n\n5. **業種別の取組事例**\n   - 様々な業種における具体的な取組事例が紹介されており、小売業や製造業、物流業などでのデータ活用やAIシステムの導入が例示されています。これにより、業務の効率化やコスト削減、サービス向上が実現されています。\n\nこの資料は、ABEJA Platformの機能とその実用性を強調し、企業がデジタルトランスフォーメーションを進めるための有力なツールであることを示しています。',
        'このIR資料は、ABEJAのAIに関する進展と課題を詳細に示しています。\n\n### ABEJAの歩み\n- **2012年**: ディープラーニング技術の発表に伴い、ABEJAが設立され、AIの進化とともに成長を始めました。\n- **2014年～2022年**: ABEJAは、AIプラットフォームの開発や、Googleとの提携を通じて技術を進化させ、さまざまなプロジェクトを展開しています。特に、2019年にはAutoMLの導入があり、2022年には新たなプラットフォームの発表がありました。\n\n### AIの課題\n- AI導入には「魔法の川」「データの谷」「精度の壁」「オペレーションのデコボコ道」という4つの課題が存在します。これらは、AIの実用化における障壁を示しています。\n- 特に、63%のAI導入企業がPoC（Proof of Concept）で止まってしまうというデータがあり、これは多くの企業がAIを実用化する際の課題を浮き彫りにしています。\n\n### マネジメント体制\n- ABEJAのCEOである岡田陽介氏と小間基裕氏が紹介されており、それぞれの役割や経歴が記載されています。岡田氏は技術研究と情報発信を担当し、小間氏は業務執行全般を管理しています。\n\n### AI導入のステップ\n- 通常のAI導入企業のステップとして、テーマ選定から始まり、BPR（Business Process Reengineering）、複数のPoCを経て、最終的な実用化に至るプロセスが示されています。\n\nこの資料は、ABEJAの成長とAI導入における課題を明確にし、企業が直面する現実的な問題を理解するための重要な情報を提供しています。',
        'このIR資料は、ABEJAの業績に関する情報を提供しています。以下に、スライドから読み取れる主要な内容を詳細にまとめます。\n\n### 売上高の推移\n- **通期売上高**: 2023年度の売上高は2,775万円で、前年同期比で40.3%の成長を示しています。特に、トランスフォーメーション事業が36.4%増、オンライン事業が60.8%増加しています。\n- **四半期売上高**: 2023年第4四半期の売上高は1,674万円で、前年同期比54.4%の成長を記録しています。\n\n### 営業利益の推移\n- **通期営業利益**: 2023年度の営業利益は402万円で、前年同期の-163万円から改善しています。これは、トランスフォーメーション事業の成長が寄与しています。\n- **四半期営業利益**: 2023年第4四半期の営業利益は162万円で、前年同期の-93万円から大幅に改善されています。\n\n### 売上高の内訳\n- 売上高は、トランスフォーメーション事業とオンライン事業に分かれており、特にオンライン事業の成長が目立ちます。\n- 2022年度と2023年度の比較では、トランスフォーメーション事業が762万円から802万円に増加し、オンライン事業も1,215万円から1,972万円に増加しています。\n\n### 取引規模別の状況\n- 取引規模が5,000万円以上の取引が増加しており、取引先の拡大が進んでいます。\n- 新たな取引の獲得により、今後の成長が期待されています。\n\n### 結論\nABEJAは、売上高と営業利益の両方で前年同期比での大幅な成長を達成しており、特にオンライン事業の成長が顕著です。取引規模の拡大も見られ、今後の業績向上が期待されます。',
        'このIR資料は、ABEJAのコスト構造や販売費、従業員の推移に関する詳細な情報を提供しています。\n\n### 1. コスト構造\n- **売上原価**: 2023年第3四半期は前年同期比で増加しており、特に第4四半期においてはコストコントロールが重要視されています。第4四半期の売上高に対する売上原価の比率は38%に達しています。\n- **販売費**: 2023年第4四半期において、販売費は前年同期比で増加しています。特に、営業活動における人員の増加が影響していると考えられます。\n\n### 2. 販管費の推移\n- 販管費は、2022年から2023年にかけて増加傾向にあり、特に2023年第4四半期には大幅な増加が見られます。具体的には、販売員数が増加しており、これに伴い販管費も増加しています。\n\n### 3. 従業員の推移\n- 現在の従業員数は103人で、前年同期比で増加しています。特に、エンジニアやデータサイエンティストの割合が高く、専門性の高い人材が採用されています。\n- 従業員の内訳としては、コンサルタントが最も多く、次いでエンジニアやプロジェクトマネージャーが続いています。\n\n### 4. まとめ\n全体として、ABEJAは売上原価や販売費の管理に注力しつつ、専門性の高い人材の採用を進めていることが示されています。これにより、今後の成長が期待される状況です。',
        'このIR資料は、ABEJAが提供する「ABEJA Platform」に関する内容を詳述しています。以下にその要点をまとめます。\n\n### ABEJA Platformの概要\n- **目的**: ABEJA Platformは、デジタルトランスフォーメーション（DX）を推進するためのプラットフォームであり、企業の業務改善を支援します。\n- **構成**: 5つのモジュールレイヤーから成り立っており、顧客のニーズに応じたソフトウェアを提供します。\n\n### 各レイヤーの機能\n1. **BaaSレイヤー**: AIモデルの提供やデータ管理を行います。\n2. **コレクレーターレイヤー**: ソフトウェアの支援を行い、データの収集を促進します。\n3. **セキュリティレイヤー**: データの保護と管理を担当します。\n4. **コンピューティングレイヤー**: データ処理や分析を行います。\n5. **コネクトレイヤー**: 各種デバイスとの接続を可能にします。\n\n### トランスフォーメーションのプロセス\n- **ステップ1**: 人とAIの協働によるプロセスの特定。\n- **ステップ2**: データ収集と分析の実施。\n- **ステップ3**: AIによる実行と結果の評価。\n- **ステップ4**: フィードバックを基にした改善。\n\n### 「Human in the Loop」の重要性\n- 人とAIの協働により、実用的なPoC（Proof of Concept）が実現され、プロジェクトの成功率が向上します。\n\n### まとめ\nABEJA Platformは、企業のDX推進を支援するために設計されており、各レイヤーが連携してデータの収集、分析、実行を行います。また、人とAIの協働を重視することで、より効果的なビジネスプロセスの実現を目指しています。'
    ]
    const imageComments2025 = [
        `タイトルスライド`,
        `各セクションでの詳細な分析やデータを示すための構成となっています。`,
        'タイトルスライドです',
        '2025年3月期第1四半期の業績サマリによると、オンラインメディア事業および金融プラットフォーム事業において、売上高は前年同期比で20.3%増の1,215百万円となりました。しかし、営業利益と経常利益はそれぞれ前年同期比で64.9%および65.4%の減少を示しており、特に広告単価と顧客獲得単価の上昇が影響していると考えられます。親会社株主に帰属する四半期純利益も前年同期比で減少しています。',
        `売上高と営業利益の推移を示しています。主な内容は以下の通りです。

        1. **売上高の増加**: オンラインメディア事業の収益が増加しており、特にFY23/3QからFY25/3Qにかけて顕著な成長が見られます。ITソリューション事業や金融プラットフォーム事業も一定の売上を上げています。
        2. **営業利益の変動**: 営業利益はFY23/3Qに151百万円とピークを迎えた後、FY24/3QおよびFY25/3Qでは減少傾向にあります。特にFY25/3Qでは31百万円と大幅に減少しています。
        3. **投資の影響**: 集客コストの増加やデジタルマーケティングへの投資が影響しており、前年同期比での収益減少が見込まれています。

        全体として、オンラインメディア事業の成長が目立つ一方で、営業利益の減少が懸念される状況です。`,
        `営業利益分析を示しています。以下のポイントが読み取れます。

        1. **売上高の増加**: 売上高はITトレンドとIFA（国際家電見本市）の拡大により増加しており、204の数値が示されています。

        2. **売上原価の増加**: 売上原価は233となっており、これが利益に影響を与えていることが示唆されています。
        
        3. **顧客獲得単価の上昇**: 顧客獲得単価が上昇したことが、売上高の増加に寄与していると考えられます。
        
        4. **販売管理費の減少**: 販売管理費は28に減少しており、コスト管理が進んでいることが示されています。
        
        全体として、ABEJA社は売上高の増加とコスト管理の改善により、営業利益の向上を目指している状況が伺えます。`,

        `### 結論
        ABEJA社の2025年3月期第1四半期の財務状況は、流動資産の増加や負債の増加が見られる一方で、固定資産の減少が目立ち、全体的には成長を示しているものの、資産構成の変化には注意が必要です。
        
        ### 詳細な分析
        1. **流動資産の増加**:
           - FY24/3期の流動資産は3,109百万円からFY25/3期には3,937百万円に増加し、26.6%の成長を示しています。これは、短期的な資金繰りが改善されていることを示唆しています。
        
        2. **固定資産の減少**:
           - 固定資産は713百万円から437百万円に減少し、38.7%の減少を記録しています。これは、資産の売却や減損があった可能性が考えられ、長期的な投資戦略に影響を及ぼすかもしれません。
        
        3. **資産合計の増加**:
           - 資産合計は3,823百万円から4,374百万円に増加し、14.4%の成長を示しています。流動資産の増加が主な要因ですが、固定資産の減少が全体の資産構成に影響を与えています。
        
        4. **負債の増加**:
           - 流動負債は548百万円から669百万円に増加し、22.1%の成長を見せています。また、固定負債は25百万円から206百万円に694.8%の大幅な増加を記録しています。これは、借入や負債の増加があったことを示しており、財務リスクの増大が懸念されます。
        
        5. **自己資本比率の安定**:
           - 自己資本比率は83.8%から78.7%に若干の減少が見られますが、依然として高い水準を維持しています。これは、資本の安定性を示しており、将来的な投資に対する余力があることを示唆しています。
        
        ### 総括
        ABEJA社は流動資産の増加により短期的な財務状況は改善していますが、固定資産の減少や負債の大幅な増加が見られるため、今後の成長戦略や資産管理において慎重な対応が求められます。特に、固定資産の減少は長期的な成長に影響を与える可能性があるため、今後の動向に注目が必要です。`,
        `### 結論
        ABEJA社は、B2B市場に特化した多様なプラットフォームを展開しており、2024年度第1四半期には前年同期比で売上が20.3%増加し、1,215百万円を達成しました。特にオンラインメディア事業が売上の72%を占めており、成長が顕著です。
        
        ### 詳細な分析
        スライドには、ABEJA社の事業セグメントとその概要が示されています。主な事業は以下の通りです：
        
        1. **オンラインメディア事業**：
           - B2B商材のマーケティングプラットフォームやイベントプラットフォームを提供しており、特に「ITトレンド」や「ITトレンドEXPO」、「bizplay」などが含まれています。
           - このセグメントは売上の72%を占めており、会社の成長を牽引しています。
        
        2. **ITソリューション事業**：
           - マーケティング支援クラウドや営業支援クラウドなど、企業の業務効率化を図るサービスを展開しています。
        
        3. **金融プラットフォーム事業**：
           - IFAサービスや事業承継M&Aサービスを提供し、金融関連のニーズに応えています。
        
        4. **VCファンド事業**：
           - CVC（コーポレート・ベンチャー・キャピタル）を通じた投資活動を行い、成長企業への支援を行っています。
        
        2024年度第1四半期の売上は1,215百万円で、前年同期の1,010百万円から20.3%の増加を記録しています。これにより、会社全体の成長が確認でき、特にオンラインメディア事業の強さが際立っています。
        
        全体として、ABEJA社はB2B市場における多様なサービスを通じて、安定した成長を続けていることが示されています。`,
        `### 結論
        ABEJA社はオンラインメディア事業に注力しており、今後の成長戦略や市場動向に基づいた取り組みが期待されます。
        
        ### 詳細な分析
        1. **事業の重要性**: オンラインメディア事業は、デジタルコンテンツの配信や広告収入の獲得を通じて、企業の収益源として重要な役割を果たしています。この分野は急速に成長しており、ABEJA社もその波に乗ることを目指しています。
        
        2. **市場環境**: デジタルメディアの需要が高まる中、競争も激化しています。ABEJA社は、他社との差別化を図るために、独自のコンテンツやサービスを提供する必要があります。
        
        3. **戦略的アプローチ**: 企業は、オンラインメディア事業の拡大に向けて、技術革新やパートナーシップの構築を進めている可能性があります。また、ユーザーエクスペリエンスの向上やデータ分析を活用したマーケティング戦略も重要です。
        
        4. **将来の展望**: オンラインメディア事業は、今後も成長が見込まれる分野であり、ABEJA社がどのようにこの市場でのポジションを強化していくかが注目されます。
        
        このように、ABEJA社のオンラインメディア事業は、企業の成長戦略の中で重要な位置を占めており、今後の展開が期待されます。`,
        ``,
        ``,
        ``,
    ];


    const fetchAnswer = async () => {
        setLoading(true);
        setAnswer('');
        const user = auth.currentUser;

        if (user) {
            try {
                const accessToken = await user.getIdToken(/* forceRefresh */ true);
                const response = await axios.get(apiUrlQueryRag, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
                setAnswer(response.data.answer);
            } catch (error) {
                console.error('Error fetching answer:', error);
                message.error('Failed to get answer. Please try again later.');
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
            message.error('User not authenticated. Please log in and try again.');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            <Card title="AI Analysis Result" style={{ width: '100%' }}>
                {/*画像データを並べて表示
                <div style={{ padding: '24px' }}>
                    <Row gutter={[16, 16]}>
                        {imagePaths.map((src, index) => (
                            <Col key={index} xs={24} sm={12} md={8} lg={6}>
                                <Image
                                    width="100%"
                                    src={src}
                                    alt={`Page ${index + 1}`}
                                    style={{ objectFit: 'contain', maxHeight: '500px' }} // オプションで高さを制限
                                />
                            </Col>
                        ))}
                    </Row>
                    <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(summary[0]) }}></div>
                </div>
                 */}
                <Row gutter={24}>
                    <Col span={6}>
                        FY2023
                        {imagePaths2.map((src, index) => (
                            <div key={index} style={{ marginBottom: '16px' }}>  {/* 画像の間隔を少しあける */}
                                <Image
                                    width="100%"
                                    src={src}
                                    alt={`Page ${index + 1}`}
                                    style={{
                                        objectFit: 'contain',
                                        maxHeight: '500px',
                                        boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.2)',
                                        margin: '15px 0px',
                                    }}
                                />
                                <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(imageComments2023[index]) }}></div>
                            </div>
                        ))}
                    </Col>
                    <Col span={6}>
                        FY2024
                        {imagePaths2024.map((src, index) => (
                            <div key={index} style={{ marginBottom: '16px' }}>  {/* 画像の間隔を少しあける */}
                                <Image
                                    width="100%"
                                    src={src}
                                    alt={`Page ${index + 1}`}
                                    style={{
                                        objectFit: 'contain',
                                        maxHeight: '500px',
                                        boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.2)',
                                        margin: '15px 0px',
                                    }}
                                />
                                <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(imageComments2024[index]) }}></div>
                            </div>
                        ))}
                    </Col>
                    <Col span={6}>
                        FY2025
                        {imagePaths1.map((src, index) => (
                            <div key={index} style={{ marginBottom: '16px' }}>  {/* 画像の間隔を少しあける */}
                                <Image
                                    width="100%"
                                    src={src}
                                    alt={`Page ${index + 1}`}
                                    style={{
                                        objectFit: 'contain',
                                        maxHeight: '500px',
                                        boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.2)',
                                        margin: '15px 0px',
                                    }}
                                />
                                <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(imageComments2025[index]) }}></div>
                            </div>
                        ))}
                    </Col>
                    <Col span={6}>
                        summary
                        <br />
                        <br />
                        <Button type="primary" onClick={showDrawer} style={{}}>
                            QAリストを開く
                        </Button>
                        <QADrawer visible={drawerVisible} onClose={closeDrawer} summary={summary} />
                        <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(summary[0]) }}></div>
                        QA リスト
                        <div style={{ color: '#262260' }} dangerouslySetInnerHTML={{ __html: formatText(summary[1]) }}></div>
                    </Col>
                </Row>
                <Button
                    type="primary"
                    onClick={fetchAnswer}
                    loading={loading}
                    style={{ marginBottom: '16px' }}
                >
                    報告シートを作成する
                </Button>
                {loading ? (
                    <div style={{ textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    answer && (
                        <div>
                            <Title level={4} style={{ marginBottom: '8px' }}></Title>
                            <div style={{ textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: formatText(answer) }} />
                        </div>
                    )
                )}
            </Card>
        </div>
    );
};

export default ResultReport;