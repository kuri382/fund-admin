import openai

ORDER = """
## **1. 分析の基本構造**
**IR資料を分析する際の一貫した流れ**
1. **財務データの整理**
2. **ビジネスモデル・市場環境の考察**
3. **競争環境との比較**
4. **リスク要因の評価**
5. **結論と今後の注目点**

## **2. 分析のエッセンス**
### **① 目的の明確化**
- **この資料から何を読み取るべきか？**
  - 企業の成長性を評価するのか？
  - 収益性や財務の安定性を見るのか？
  - 競争優位性や市場シェアを確認するのか？
- **投資家・経営者の視点を意識**
  - 企業価値が高まる要素は何か？
  - 今後の成長ドライバーは何か？

### **② 財務データの整理**
**業界や企業規模を問わず共通する指標**
| 項目 | 意味 | 注目ポイント |
|------|------|------------|
| 売上高 | 事業の規模・成長度合い | 過去と比較して成長しているか？|
| 営業利益 | 事業の本業での収益性 | 収益構造が安定しているか？ |
| EPS (1株あたり利益) | 株主価値の増加 | 予想と比べてどうか？成長性は？ |
| 営業CF | キャッシュフローの健全性 | 事業活動で稼げているか？ |
| ROE / ROIC | 投資に対するリターン | 資本効率が高いか？ |

- **成長性の評価**
  - 前年同期比・市場予想との比較
  - 過去数年のトレンド分析
- **収益性の評価**
  - 売上と利益のバランス
  - 営業利益率の推移


### **③ ビジネスモデル・市場環境の考察**
- **収益源**
  - どの事業が主な売上・利益を生んでいるか？
  - 売上が一過性か、継続的なものか？
- **市場の成長性**
  - 企業が属する市場が成長しているか？
  - マクロ環境（景気、規制など）の影響は？
- **競争優位性**
  - 他社と比べた強み（技術、ブランド、シェア、コスト構造）
  - 参入障壁は高いか？

### **④ 競争環境との比較**
- **競合他社とどう違うか？**
  - 業界平均との比較
  - シェアの推移（市場でのポジション）
  - 他社と比較した成長率・利益率
- **競争戦略**
  - 価格競争型 vs 差別化戦略
  - 研究開発（R&D）の投資額

### **⑤ リスク要因の評価**
- **財務リスク**
  - 負債比率は適切か？（レバレッジが高すぎないか）
  - 資金繰りに問題はないか？（キャッシュフロー分析）
- **事業リスク**
  - 依存度の高い顧客・市場があるか？
  - 法規制や市場環境の変化による影響
- **競争リスク**
  - 新規参入の脅威はあるか？
  - 主要競争相手の動き

### **⑥ 結論と今後の注目点**
**✅ ポジティブ要因**
- **成長要素**（売上・利益・市場シェアが伸びている）
- **収益性向上**（利益率が安定、キャッシュフローが強い）
- **競争力強化**（差別化、ブランド、技術優位）

**⚠️ ネガティブ要因**
- **成長鈍化**（売上・利益成長が停滞）
- **コスト増加**（原材料費、R&D、人件費の負担増）
- **市場環境の悪化**（規制、景気後退、競争激化）

**🎯 今後の注目点**
- どの指標が次回の決算で注目されるか？
- 企業が抱える課題をどう改善するか？

"""

def create_response(
    openai_client: openai.ChatCompletion,
    fact_sentence: str,
    order: str = ORDER,
) -> str:

    system_prompt = '''
    - 次のフォーマットに従ってIR資料を分析し、7000字以上で丁寧かつわかりやすく整理すること
    - マークダウン形式でまとめること
    - 前置きなしで直接的な回答から開始せよ
    '''
    context = order
    sentence = f'次のドキュメントがIRを文字起こししたものである。:{fact_sentence}'

    response = openai_client.chat.completions.create(
        model='o1-2024-12-17',
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context},
            {"role": "user", "content": sentence},
        ],
    )
    parsed_response = response.choices[0].message.content

    return parsed_response


def create_rag_response(
    openai_client: openai.ChatCompletion,
    context: str,
    prompt: str,
) -> str:

    system_prompt = 'ユーザーからの指示に従って、丁寧に文章で回答してください。'
    response = openai_client.chat.completions.create(
        model='gpt-4o',
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context},
            {"role": "user", "content": prompt},
        ],
    )
    parsed_response = response.choices[0].message.content
    return parsed_response
