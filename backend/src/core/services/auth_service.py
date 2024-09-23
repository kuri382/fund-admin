from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt

from src.settings import settings


app = FastAPI()

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
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.firebase_auth_secret_key, algorithms=[settings.algorithm])
        uid: str = payload.get("uid")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenData(uid=uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
