from fastapi import HTTPException, Request

from src.core.services.firebase_client import verify_user_token


def get_user_id(request: Request) -> str:
    """
    Authorization ヘッダーからトークンを検証し、user_id を取得する依存関数。
    """
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid format")

    token = authorization.split("Bearer ")[1]
    try:
        user_id = verify_user_token(token)
        return user_id
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
