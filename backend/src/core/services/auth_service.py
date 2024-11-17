from datetime import datetime, timedelta

from fastapi import HTTPException
from firebase_admin import auth as firebase_auth
from jose import jwt
from pydantic import BaseModel

from src.settings import settings


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenData(BaseModel):
    uid: str


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_token(authorization: str):
    try:
        token = authorization.split(" ")[1]
        try:
            decoded_token = firebase_auth.verify_id_token(token)

        except firebase_auth.InvalidIdTokenError:
            print("Invalid ID token")

        except firebase_auth.ExpiredIdTokenError:
            print("Token has expired")

        except firebase_auth.RevokedIdTokenError:
            print("Token has been revoked")

        except Exception as e:
            print(f"Unexpected error: {e}")

        user_id = decoded_token["uid"]
        return user_id

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
