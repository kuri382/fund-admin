'''
import io
import os
import uuid
import pandas as pd
import numpy as np
import faiss
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.dependencies import get_openai_client

from src.core.services import auth_service
from typing import List
import traceback
from pydantic import BaseModel
import openai

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings

from src.core.services.openai_client import stream_generate_dd_answer_test

router = APIRouter()

class TableProcessor:
    def __init__(self, storage_client, user_id, project_id):
        self.storage_client = storage_client
        self.user_id = user_id
        self.project_id = project_id

    def process_table(self, file_info) -> str:
        # ファイルのUUIDと拡張子を取得
        file_uuid = file_info['file_uuid']  # Firestoreなどに保存されているUUIDを使用
        file_name = file_info.get('file_name', 'Unknown File')

        # ファイル拡張子を確認し、適切なblobパスを構築
        _, file_extension = os.path.splitext(file_name)
        unique_filename = f"{file_uuid}_{file_name}"  # UUIDを使ったユニークなファイル名

        # Firebase Storage内のファイルパスを構築
        blob_path = f"{self.user_id}/{unique_filename}"
        blob = self.storage_client.blob(blob_path)

        # ストレージにファイルが存在しない場合はスキップ
        if not blob.exists():
            return ""

        # バイナリデータとしてExcelファイルをダウンロードし、メモリ上で処理
        excel_bytes = blob.download_as_bytes()
        excel_io = io.BytesIO(excel_bytes)

        # pandasでExcelファイルを読み込む
        df = pd.read_excel(excel_io, engine="openpyxl")
        df = df.replace('^Unnamed.*', '', regex=True).fillna('')

        # DataFrameを文字列形式に変換して返す
        return df.to_string()


class DocumentProcessor:
    def __init__(self, storage_client, user_id, project_id):
        self.storage_client = storage_client
        self.user_id = user_id
        self.project_id = project_id

    def process_document(self, file_info) -> str:
        file_uuid = file_info['file_uuid']  # Firestoreなどに保存されているUUIDを使用
        file_name = file_info.get('file_name', 'Unknown File')
        blob_path = f"{self.user_id}/{file_uuid}_{file_name}"
        blob = self.storage_client.blob(blob_path)

        if not blob.exists():
            return ""

        abstract = file_info.get("abstract", "")
        feature = file_info.get("feature", "")
        return f"{abstract} {feature}"


class FaissManager:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        self.index = faiss.IndexFlatL2(1536)  # OpenAI's embeddings are 1536 dimensions

    def add_texts(self, texts: List[str]):
        chunks = self.text_splitter.split_text("\n".join(texts))
        embeddings = self.embeddings.embed_documents(chunks)
        self.index.add(np.array(embeddings))

    def save_index(self, file_path: str):
        faiss.write_index(self.index, file_path)

    def load_index(self, file_path: str):
        self.index = faiss.read_index(file_path)


@router.post("/explorer/create")
async def create_faiss_database(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # Get selected project
        selected_project = firestore_client.collection('users').document(user_id).collection('projects').where('is_selected', '==', True).limit(1).get()
        if not selected_project:
            raise HTTPException(status_code=204, detail="No selected project found.")

        selected_project_id = selected_project[0].id

        # Initialize processors and FAISS manager
        table_processor = TableProcessor(storage_client, user_id, selected_project_id)
        document_processor = DocumentProcessor(storage_client, user_id, selected_project_id)
        faiss_manager = FaissManager()

        # Process tables
        tables_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('tables')
        for doc in tables_ref.stream():
            file_info = doc.to_dict()
            file_uuid = file_info.get('file_uuid')
            file_name = file_info.get('file_name')
            if file_uuid and file_name:
                table_text = table_processor.process_table(file_info)
                if table_text:
                    faiss_manager.add_texts([table_text])

        # Process documents
        documents_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('documents')
        for doc in documents_ref.stream():
            file_info = doc.to_dict()
            document_text = document_processor.process_document(file_info)
            if document_text:
                faiss_manager.add_texts([document_text])

        index_filename = f"faiss_index_{selected_project_id}.index"
        local_index_path = f"/tmp/{index_filename}"
        faiss_manager.save_index(local_index_path)

        # Upload to Cloud Storage
        destination_blob_name = f"{user_id}/{index_filename}"
        blob = storage_client.blob(destination_blob_name)
        blob.upload_from_filename(local_index_path)

        # Clean up local files
        os.remove(local_index_path)

        # Save reference to the index in Firestore
        firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).set({
            'faiss_index_path': destination_blob_name
        }, merge=True)

        return JSONResponse(content={"message": "FAISS index created and saved successfully"})

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating FAISS index: {str(e)}")


@router.get("/explorer/query")
async def query_rag(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # Get selected project
        selected_project = firestore_client.collection('users').document(user_id).collection('projects').where('is_selected', '==', True).limit(1).get()
        if not selected_project:
            raise HTTPException(status_code=204, detail="No selected project found.")

        selected_project_id = selected_project[0].id

        # Initialize processors
        table_processor = TableProcessor(storage_client, user_id, selected_project_id)
        document_processor = DocumentProcessor(storage_client, user_id, selected_project_id)

        # Process tables
        tables_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('tables')
        table_texts = []
        for doc in tables_ref.stream():
            file_info = doc.to_dict()
            table_text = table_processor.process_table(file_info)
            if table_text:
                table_texts.append(table_text)

        # Process documents
        documents_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('documents')
        document_texts = []
        for doc in documents_ref.stream():
            file_info = doc.to_dict()
            document_text = document_processor.process_document(file_info)
            if document_text:
                document_texts.append(document_text)

        # Combine all texts
        all_texts = table_texts + document_texts
        combined_text = "\n\n".join(all_texts)

        # Get user query from request body
        #request_body = await request.json()
        #user_query = request_body.get("query", "")

        #if not user_query:
        #    raise HTTPException(status_code=400, detail="Query is required")

        # Use OpenAI API to get the response
        def create_dd_report_prompt():
            outline = [
                {"chapter": "1. Executive Summary（概要）",
                "description": "本報告書の要約と、デューデリジェンス全体の結論。主要なリスクや重要ポイントをハイライトし、次のステップを提示。"},
                {"chapter": "2. Company Overview（企業概要）",
                "description": "対象企業の基本情報と歴史、業界や市場の位置づけ、企業の規模、事業モデルについて説明。"},
                {"chapter": "3. Financial Analysis（財務分析）",
                "description": "企業の財務状況の詳細な分析。過去の収益、キャッシュフロー、利益率、資産・負債のバランスを評価。"},
                {"chapter": "4. Business Operations（事業運営）",
                "description": "企業のオペレーション、サプライチェーン、プロセス効率に関する評価。主要事業活動とその効率性を分析。"},
                {"chapter": "5. Market and Competitive Positioning（市場および競合分析）",
                "description": "対象企業が属する市場や競合状況の分析。市場シェア、成長性、競争優位性を評価。"},
                {"chapter": "6. Legal and Compliance（法務およびコンプライアンス）",
                "description": "対象企業の法的側面とコンプライアンス状況を評価。契約書、知的財産、法的リスク、規制遵守を確認。"},
                {"chapter": "7. Risk Assessment（リスク評価）", 
                "description": "企業が抱える財務、オペレーション、法的リスクなどの詳細な分析。"},
                {"chapter": "8. Human Resources and Organizational Structure（人事および組織体制）", 
                "description": "経営陣の能力、組織体制、人材の流出リスクを評価。"},
                {"chapter": "9. Technology and Product Development（技術および製品開発）", 
                "description": "企業の技術力、研究開発、特許や知的財産に関連する評価。"},
                {"chapter": "10. Customer and Partner Relationships（顧客およびパートナー関係）", 
                "description": "主要な顧客ベースやパートナーシップについての評価。顧客満足度やパートナーとの契約内容を分析。"},
                {"chapter": "11. Conclusion and Recommendations（結論および提言）", 
                "description": "報告書全体をまとめ、主要なリスクとチャンスに基づいた推奨事項を提示。"},
                {"chapter": "12. Appendix（付録）",
                "description": "追加資料や詳細なデータ、参考文献、グラフや表などの補足情報を提供。"}
            ]

            # プロンプト用の文字列として結合
            prompt = "以下の章立てに基づいて、DD（デューデリジェンス）報告書を作成してください。\n\n"
            for chapter in outline:
                prompt += f"{chapter['chapter']}: {chapter['description']}\n"

            return prompt

        dd_prompt = create_dd_report_prompt()
        generator = stream_generate_dd_answer_test(openai_client, combined_text, dd_prompt)

        async def stream_wrapper():
            for chunk in generator:
                yield chunk

        #return JSONResponse(content={"answer": answer})
        return StreamingResponse(stream_wrapper(), media_type="text/plain")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying RAG: {str(e)}")



@router.get("/explorer/query/qa")
async def query_qa(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # Get selected project
        selected_project = firestore_client.collection('users').document(user_id).collection('projects').where('is_selected', '==', True).limit(1).get()
        if not selected_project:
            raise HTTPException(status_code=204, detail="No selected project found.")

        selected_project_id = selected_project[0].id

        # Initialize processors
        table_processor = TableProcessor(storage_client, user_id, selected_project_id)
        document_processor = DocumentProcessor(storage_client, user_id, selected_project_id)

        # Process tables
        tables_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('tables')
        table_texts = []
        for doc in tables_ref.stream():
            file_info = doc.to_dict()
            table_text = table_processor.process_table(file_info)
            if table_text:
                table_texts.append(table_text)

        # Process documents
        documents_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('documents')
        document_texts = []
        for doc in documents_ref.stream():
            file_info = doc.to_dict()
            document_text = document_processor.process_document(file_info)
            if document_text:
                document_texts.append(document_text)

        # Combine all texts
        all_texts = table_texts + document_texts
        combined_text = "\n\n".join(all_texts)

        # Get user query from request body
        #request_body = await request.json()
        #user_query = request_body.get("query", "")

        #if not user_query:
        #    raise HTTPException(status_code=400, detail="Query is required")

        # Use OpenAI API to get the response
        dd_prompt = """
            DDプロセスにおけるQAシートを作成してください
            入力データ
            事業や対象企業に関する情報（例: 財務データ、組織構造、業務プロセス、法的文書、契約書）
            対象企業が属する業界や市場に関するデータ
            各ステップにおける分析や評価の要点

            以下のDDプロセスに基づいてQAシートを作成してください。

            1. 財務分析
            - 企業の財務状況を評価するために、以下の質問を含む。
            例: 「過去3年間のキャッシュフローの変動要因は何か？」

            2. 事業運営とオペレーション
            - サプライチェーンやプロセス効率に関する質問を作成してください。
            例: 「現在のサプライチェーンにはどのようなリスクが存在していますか？」

            3. 法務とコンプライアンス
            - 企業の法的状況を確認するための質問を作成してください。
            例: 「現在有効な主要な契約の一覧を提供してください。」

            4. 市場および競合分析
            - 企業が属する市場や競合状況を分析するための質問を作成してください。
            例: 「市場シェアの推移を教えてください。」

            5. リスク評価
            - 企業の財務やオペレーションにおけるリスクを確認する質問を作成してください。
            例: 「事業継続に対するリスクは何ですか？」

            6. 人事と組織体制
            - 組織の構造や人材の流出についての質問を作成してください。
            例: 「組織の中で人材の流出率が高い部署はありますか？」

            7. 技術および製品開発
            - 企業の技術力や知的財産に関連する質問を作成してください。
            例: 「主要な技術的強みは何ですか？」

            8. 顧客およびパートナー
            - 企業の顧客やパートナーシップに関連する質問を作成してください。
            例: 「主要な顧客のリストとそれぞれの売上貢献度を教えてください。」

            QAシートは各セクションごとに「質問内容」「カバーする領域」「重要性」を含む形式で作成してください。
            """
        generator = stream_generate_dd_answer_test(openai_client, combined_text, dd_prompt)

        async def stream_wrapper():
            for chunk in generator:
                yield chunk

        #return JSONResponse(content={"answer": answer})
        return StreamingResponse(stream_wrapper(), media_type="text/plain")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying RAG: {str(e)}")



@router.get("/explorer/query/ia")
async def query_ia(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # Get selected project
        selected_project = firestore_client.collection('users').document(user_id).collection('projects').where('is_selected', '==', True).limit(1).get()
        if not selected_project:
            raise HTTPException(status_code=204, detail="No selected project found.")

        selected_project_id = selected_project[0].id

        # Initialize processors
        table_processor = TableProcessor(storage_client, user_id, selected_project_id)
        document_processor = DocumentProcessor(storage_client, user_id, selected_project_id)

        # Process tables
        tables_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('tables')
        table_texts = []
        for doc in tables_ref.stream():
            file_info = doc.to_dict()
            table_text = table_processor.process_table(file_info)
            if table_text:
                table_texts.append(table_text)

        # Process documents
        documents_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('documents')
        document_texts = []
        for doc in documents_ref.stream():
            file_info = doc.to_dict()
            document_text = document_processor.process_document(file_info)
            if document_text:
                document_texts.append(document_text)

        # Combine all texts
        all_texts = table_texts + document_texts
        combined_text = "\n\n".join(all_texts)

        # Get user query from request body
        #request_body = await request.json()
        #user_query = request_body.get("query", "")

        #if not user_query:
        #    raise HTTPException(status_code=400, detail="Query is required")

        # Use OpenAI API to get the response
        issue_analysis_prompt = """
            以下の項目に基づいて、データからIssue Analysisの一覧を作成してください。各Issueには、問題の詳細、影響範囲、推奨される対策を記述してください。

            1. データの異常値検出
            - 売上、コスト、利益、顧客満足度などの数値に、異常な変動があるか確認し、その詳細を示してください。
            例: 「2023年3月の売上が前年同月比で30%減少しています。」

            2. データの欠損や不整合
            - 重要なデータが不足している部分や、データに不整合がある箇所を指摘し、その理由を説明してください。
            例: 「2022年5月の顧客満足度データが欠落しています。」

            3. リスクと不確実性
            - 事業運営上のリスクや不確実性がある部分を特定し、詳細を記述してください。財務リスク、法的リスク、オペレーションリスクに焦点を当ててください。
            例: 「利益率の低下が継続しており、特に2022年以降のコスト増加が原因です。」

            4. 市場や競合からの影響
            - 市場の変動や競合の動きにより、売上やシェアに影響を受けている箇所を特定し、その対応策を提案してください。
            例: 「競合B社が2023年に新製品を発売し、2023年のQ2以降の売上が15%減少しました。」

            5. 顧客からのフィードバックやクレーム
            - 顧客データから、フィードバックやクレームに基づく問題点を特定し、対応策を記述してください。
            例: 「2022年の顧客満足度が10ポイント低下しています。」

            6. プロセスの効率性
            - 業務プロセスにおけるボトルネックやリソースの過剰使用がある部分を特定し、改善策を提案してください。
            例: 「製品Aの生産ラインで生産遅延が頻発しており、平均遅延時間が20%増加しています。」

            7. 財務データの分析
            - 財務データにおける異常な動きを分析し、その原因と影響を説明してください。
            例: 「2023年Q1の利益が前年同期比で15%減少しています。」

            8. 今後の予測
            - データに基づいて、今後のリスクやチャンスを予測し、推奨される対策を提案してください。
            例: 「2024年には利益率がさらに5%低下する可能性があります。コスト削減策の実施が推奨されます。」

            各Issueについて、「Issue名」「詳細」「影響範囲」「推奨される対策」をMarkdown形式で出力してください。
            """
        # answer = generate_dd_answer_test(openai_client, combined_text, issue_analysis_prompt)
        generator = stream_generate_dd_answer_test(openai_client, combined_text, issue_analysis_prompt)

        async def stream_wrapper():
            for chunk in generator:
                yield chunk

        #return JSONResponse(content={"answer": answer})
        return StreamingResponse(stream_wrapper(), media_type="text/plain")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error querying RAG: {str(e)}")

class QueryModel(BaseModel):
    query: str

class RAGManager:
    def __init__(self, index_path: str):
        self.embeddings = OpenAIEmbeddings()
        self.index = faiss.read_index(index_path)
        self.vectorstore = LangchainFAISS(self.embeddings.embed_query, self.index, None, None)
        self.llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        self.qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(),
            memory=self.memory
        )

    def query(self, query: str) -> str:
        result = self.qa_chain({"question": query})
        return result["answer"]


@router.post("/explorer/query")
async def query_rag(
    query_model: QueryModel,
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        firestore_client = firebase_client.get_firestore()
        storage_client = firebase_client.get_storage()

        # Get selected project
        selected_project = firestore_client.collection('users').document(user_id).collection('projects').where('is_selected', '==', True).limit(1).get()
        if not selected_project:
            raise HTTPException(status_code=204, detail="No selected project found.")

        selected_project_id = selected_project[0].id
        project_data = selected_project[0].to_dict()

        # Get FAISS index path
        faiss_index_path = project_data.get('faiss_index_path')
        if not faiss_index_path:
            raise HTTPException(status_code=404, detail="FAISS index not found for this project.")

        # Download FAISS index from Cloud Storage
        local_index_path = f"/tmp/faiss_index_{selected_project_id}.index"
        blob = storage_client.blob(faiss_index_path)
        blob.download_to_filename(local_index_path)

        # Initialize RAG manager
        rag_manager = RAGManager(local_index_path)

        # Process query
        response = rag_manager.query(query_model.query)

        # Clean up local index file
        os.remove(local_index_path)

        return JSONResponse(content={"answer": response})

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")
'''
