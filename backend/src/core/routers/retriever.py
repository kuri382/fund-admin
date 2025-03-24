import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from typing import Literal
from google.cloud import firestore
from pydantic import BaseModel, Field
from typing import Optional

from src.repositories.abstract import DocumentRepository
from src.dependencies.document_repository import get_document_repository
from src.dependencies.auth import get_user_id
import src.core.services.firebase_driver as firebase_driver
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

from ._base import BaseJSONSchema


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix='/retriever', tags=['retriever'])


class Files(BaseJSONSchema):
    file_uuid: str
    file_name: str

class ResGetRetrieverFiles(BaseJSONSchema):
    files: list[Files]


@router.get('/files')
async def get_retriever_files(
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
    sort_by: str = Query(default='file_name'),  # ソート対象のフィールド
    order: Literal['asc', 'desc'] = Query(default='asc')  # 昇順 or 降順
):
    """
    プロジェクトに関連付けられたドキュメントのfile_uuid, file_name一覧を返す
    """
    firestore_client = firebase_client.get_firestore()
    project_id = firebase_driver.get_project_id(user_id, firestore_client)

    try:
        documents_ref = (
            firestore_client.collection('users')
            .document(user_id)
            .collection('projects')
            .document(project_id)
            .collection('documents')
        )
        query_ref = documents_ref.order_by(sort_by, direction=firestore.Query.ASCENDING if order == 'asc' else firestore.Query.DESCENDING)
        docs = query_ref.stream()

        files = [
            Files(
                file_uuid=doc.id,
                file_name=doc.to_dict().get('file_name', '')
            )
            for doc in docs
        ]

        result = ResGetRetrieverFiles(files=files)

    except Exception as e:
        logger.error(e)
        return ORJSONResponse(
            content={"detail": str(e)},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return ORJSONResponse(content=jsonable_encoder(result), status_code=status.HTTP_200_OK)


# ===================================
# Pydantic モデル (TypeScript との対応)
# ===================================
class ChatReference(BaseJSONSchema):
    fileUuid: str
    fileName: str
    pageNumber: int
    sourceText: str = ""

class ChatMessage(BaseJSONSchema):
    messageId: str
    text: str
    sender: Literal["user", "system"]
    timestamp: str
    references: list[ChatReference] = Field(default_factory=list)

class ChatSession(BaseJSONSchema):
    sessionId: str
    sessionName: str
    messages: list[ChatMessage] = Field(default_factory=list)
    selectedFileUuids: list[str] = Field(default_factory=list)

# ---- Request Body
class CreateSessionRequest(BaseModel):
    sessionName: str
    selectedFileUuids: list[str] = Field(default_factory=list)

class CreateSessionResponse(BaseModel):
    sessionId: str

class SendMessageRequest(BaseModel):
    sessionId: str
    text: str
    selectedFileUuids: Optional[list[str]] = []

class SendMessageResponse(BaseModel):
    message: ChatMessage

# ===================================
# ユーティリティ関数
# ===================================
def _get_project_id(user_id: str, firestore_client: firestore.Client) -> str:
    """
    既存のロジック (firebase_driver.get_project_id など) で
    user_id に対応する project_id を取得する想定
    """
    project_id = firebase_driver.get_project_id(user_id, firestore_client)
    return project_id

def _now_iso() -> str:
    """現在時刻を ISO8601 文字列で返す"""
    return datetime.utcnow().isoformat() + "Z"


# ===================================
# エンドポイント実装
# ===================================

@router.get("/chat/sessions")
async def list_chat_sessions(
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    """
    ユーザーの全チャットセッションを一覧取得。
    セッションのメタ情報のみ返す (messages は含まない)。
    """
    firestore_client = firebase_client.get_firestore()
    project_id = _get_project_id(user_id, firestore_client)

    sessions_ref = (
        firestore_client.collection("users")
        .document(user_id)
        .collection("projects")
        .document(project_id)
        .collection("chat_sessions")
    )

    docs = sessions_ref.stream()
    sessions_list = []
    for doc in docs:
        data = doc.to_dict()
        if not data:
            continue
        # Firestore上、messagesはサブコレクションになるので基本ここには含まれない
        session_id = doc.id
        session_name = data.get("sessionName", "")
        selected_file_uuids = data.get("selectedFileUuids", [])
        sessions_list.append(
            ChatSession(
                sessionId=session_id,
                sessionName=session_name,
                selectedFileUuids=selected_file_uuids,
                messages=[],
            )
        )

    return ORJSONResponse(
        content=jsonable_encoder(sessions_list),
        status_code=status.HTTP_200_OK
    )


@router.post("/chat/sessions")
async def create_chat_session(
    request: CreateSessionRequest,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    """
    新規チャットセッションを作成する。
    """
    firestore_client = firebase_client.get_firestore()
    project_id = _get_project_id(user_id, firestore_client)
    session_id = str(uuid.uuid4())

    sessions_ref = (
        firestore_client.collection("users")
        .document(user_id)
        .collection("projects")
        .document(project_id)
        .collection("chat_sessions")
    )

    # セッションのメタ情報を保存
    doc_data = {
        "sessionName": request.sessionName,
        "selectedFileUuids": request.selectedFileUuids,
        "createdAt": _now_iso(),
    }
    sessions_ref.document(session_id).set(doc_data)

    return ORJSONResponse(
        content=jsonable_encoder(CreateSessionResponse(sessionId=session_id)),
        status_code=status.HTTP_201_CREATED
    )


@router.get("/chat/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    """
    指定した session_id のチャットセッション情報とメッセージを取得する。
    """
    firestore_client = firebase_client.get_firestore()
    project_id = _get_project_id(user_id, firestore_client)

    session_doc_ref = (
        firestore_client.collection("users")
        .document(user_id)
        .collection("projects")
        .document(project_id)
        .collection("chat_sessions")
        .document(session_id)
    )

    session_doc = session_doc_ref.get()
    if not session_doc.exists:
        return ORJSONResponse(
            content={"detail": f"Session {session_id} not found."},
            status_code=status.HTTP_404_NOT_FOUND
        )
    session_data = session_doc.to_dict()

    # messages サブコレクションを取得
    messages_ref = session_doc_ref.collection("messages")
    message_docs = messages_ref.order_by("timestamp", direction=firestore.Query.ASCENDING).stream()

    messages: list[ChatMessage] = []
    for m_doc in message_docs:
        m_data = m_doc.to_dict()
        references_data = m_data.get("references", [])
        references = [ChatReference(**r) for r in references_data]
        msg = ChatMessage(
            messageId = m_data["messageId"],
            text = m_data["text"],
            sender = m_data["sender"],
            timestamp = m_data["timestamp"],
            references = references
        )
        messages.append(msg)

    session = ChatSession(
        sessionId = session_id,
        sessionName = session_data.get("sessionName", ""),
        selectedFileUuids = session_data.get("selectedFileUuids", []),
        messages = messages
    )

    return ORJSONResponse(
        content=jsonable_encoder(session),
        status_code=status.HTTP_200_OK
    )


@router.post("/chat/send_message")
async def send_chat_message(
    request: SendMessageRequest,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
    doc_repository: DocumentRepository = Depends(get_document_repository),
):
    """
    ユーザーがメッセージを送信。
    1. userメッセージを Firestore に保存
    2. AI 等で処理(ここではダミー)
    3. systemメッセージを Firestore に保存
    4. systemメッセージをレスポンスとして返す
    """
    firestore_client = firebase_client.get_firestore()
    project_id = _get_project_id(user_id, firestore_client)

    # セッション確認
    session_id = request.sessionId
    session_doc_ref = (
        firestore_client.collection("users")
        .document(user_id)
        .collection("projects")
        .document(project_id)
        .collection("chat_sessions")
        .document(session_id)
    )
    if not session_doc_ref.get().exists:
        return ORJSONResponse(
            content={"detail": f"Session {session_id} not found."},
            status_code=status.HTTP_404_NOT_FOUND
        )

    # selectedFileUuids が渡された場合、セッションを更新(必要に応じて)
    if request.selectedFileUuids is not None:
        session_doc_ref.update({"selectedFileUuids": request.selectedFileUuids})

    # 1) ユーザーのメッセージを保存
    user_msg_id = str(uuid.uuid4())
    user_msg_data = {
        "messageId": user_msg_id,
        "text": request.text,
        "sender": "user",
        "timestamp": _now_iso(),
        "references": []  # ユーザー投稿なので最初は参照情報なし
    }
    session_doc_ref.collection("messages").document(user_msg_id).set(user_msg_data)

    # 2) AI 等で処理（ダミーで固定のテキストを返す）
    #    実際には LLM への問い合わせや Retriever 処理を行い、参照情報を生成する。
    try:
        query='ビジネス'
        response = doc_repository.search_documents(
            query=query,
            user_id=user_id,
            project_id=project_id,
            grouped_task=request.text,
            file_uuid_list=request.selectedFileUuids,
            limit=5,
        )

    finally:
        doc_repository.client.close()

    if response:
        references = []
        for obj in response.objects:
            file_name = obj.properties['file_name']
            transcription = obj.properties['transcription']

            references.append({
                "fileUuid": obj.properties['file_uuid'],
                "fileName": file_name,
                "pageNumber": obj.properties['page_number'],
                "sourceText": transcription
            })
        system_text = response.generated

        # 3) systemメッセージを Firestore に保存
        system_msg_id = str(uuid.uuid4())
        system_msg_data = {
            "messageId": system_msg_id,
            "text": system_text,
            "sender": "system",
            "timestamp": _now_iso(),
            "references": references,
        }
        session_doc_ref.collection("messages").document(system_msg_id).set(system_msg_data)

        # 4) systemメッセージをレスポンス
        response_message = ChatMessage(
            messageId=system_msg_id,
            text=system_text,
            sender="system",
            timestamp=system_msg_data["timestamp"],
            references=[ChatReference(**ref) for ref in references]
        )

        return ORJSONResponse(
            content=jsonable_encoder(SendMessageResponse(message=response_message)),
            status_code=status.HTTP_200_OK
        )

    else:
        return None
