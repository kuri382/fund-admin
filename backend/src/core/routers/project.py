import logging
import traceback
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.core.services import auth_service
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

router = APIRouter()
logger = logging.getLogger(__name__)


class ProjectCreate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    project_id: str
    name: str
    is_selected: bool
    is_archived: bool


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    request: Request,
    project_data: ProjectCreate,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    project_id = str(uuid.uuid4())

    # Firestoreに保存するデータ
    project_data = {
        "project_id": project_id,
        "name": project_data.name,
        "is_selected": True,
        "is_archived": False,
    }
    try:
        # Firestoreにデータを保存（users/{user_id}/projects/{project_id}）
        firestore_client = firebase_client.get_firestore()
        doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(project_id)
        doc_ref.set(project_data)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    return ProjectResponse(
        project_id=project_id,
        name=project_data["name"],
        is_selected=project_data["is_selected"],
        is_archived=project_data["is_archived"],
    )


@router.patch("/projects/{project_id}/select")
async def select_project(
    project_id: str,
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        firestore_client = firebase_client.get_firestore()
        projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
        projects = projects_ref.stream()

        # すべてのプロジェクトの is_selected フラグを False にリセット
        for project in projects:
            project_ref = projects_ref.document(project.id)
            project_ref.update({"is_selected": False})

        # 選択されたプロジェクトの is_selected フラグを True に設定
        selected_project_ref = projects_ref.document(project_id)
        selected_project_ref.update({"is_selected": True})

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating project: {str(e)}")

    return {"detail": "Project selected successfully", "project_id": project_id}


@router.get("/projects", response_model=list[ProjectResponse])
async def get_projects(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        firestore_client = firebase_client.get_firestore()
        projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
        docs = projects_ref.where('is_archived', '==', False).stream()

        projects = []
        for doc in docs:
            project_data = doc.to_dict()
            projects.append(
                ProjectResponse(
                    project_id=doc.id,
                    name=project_data["name"],
                    is_archived=project_data["is_archived"],
                    is_selected=project_data["is_selected"],
                )
            )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error get projects: {str(e)}")

    return projects


@router.get("/projects/selected")
async def get_selected_project(request: Request, firebase_client: FirebaseClient = Depends(get_firebase_client)):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        # Firestore から選択されたプロジェクトを取得 (is_selected が True のもの)
        firestore_client = firebase_client.get_firestore()
        projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
        selected_project = projects_ref.where('is_selected', '==', True).limit(1).stream()

        selected_project_data = None
        for project in selected_project:
            selected_project_data = project.to_dict()
            selected_project_data['id'] = project.id

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error get projects: {str(e)}")

    if not selected_project_data:
        raise HTTPException(status_code=404, detail="Selected project not found")

    return selected_project_data


@router.patch("/projects/{project_id}/archive")
async def archive_project(
    project_id: str,
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    firestore_client = firebase_client.get_firestore()
    doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(project_id)

    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get('is_archived', False):
        raise HTTPException(status_code=400, detail="Project is already archived")

    # Firestoreで該当プロジェクトを更新し、is_archivedフラグをTrueにする
    logger.info('project archived', project_id)
    doc_ref.update({"is_archived": True})

    return {"detail": "Project archived successfully"}


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # トークンから user_id を取得
    user_id = auth_service.verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Firestoreからプロジェクトを削除
    firestore_client = firebase_client.get_firestore()
    doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(project_id)
    doc_ref.delete()

    return {"detail": "Project deleted successfully"}
