from fastapi import APIRouter  # , Depends, HTTPException
from pydantic import BaseModel, EmailStr

# from fastapi import APIRouter  # , Depends, HTTPException
# from firebase_admin import auth as firebase_auth
# from jose import JWTError, jwt
# from src.core.services.auth_service import create_access_token
# from src.settings import settings

router = APIRouter()


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenData(BaseModel):
    uid: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


'''
@router.post("/signup", response_model=TokenResponse)
async def signup(signup_request: SignUpRequest, firebase=Depends(get_firebase)):
    try:
        # Firebaseで新規ユーザー作成
        user = firebase_auth.create_user(
            email=signup_request.email,
            password=signup_request.password
        )

        # JWTトークンの発行
        access_token = create_access_token({"uid": user.uid})

        firebase.firestore.collection('users').document(user.uid).set({
            "email": signup_request.email,
            "uid": user.uid,
            "created_at": "test"
        })

        return {"access_token": access_token}
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already exists")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Sign-up failed")


@router.post("/signin", response_model=TokenResponse)
async def login(login_request: LoginRequest, firebase=Depends(get_firebase)):
    """
    クライアントから送信されたFirebase IDトークンを検証し、
    ユーザーが認証されている場合にJWTアクセストークンを発行する。
    """
    try:
        # 1. Firebase IDトークンを検証
        decoded_token = firebase_auth.verify_id_token(login_request.id_token)

        # 2. ユーザーのUIDを取得
        uid = decoded_token.get('uid')

        if not uid:
            raise HTTPException(status_code=400, detail="Invalid token")

        # 3. JWTアクセストークンを生成
        access_token = create_access_token({"uid": uid})

        return {"access_token": access_token}

    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")

    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")

    except firebase_auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Revoked ID token")

    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed: An unexpected error occurred")
'''
