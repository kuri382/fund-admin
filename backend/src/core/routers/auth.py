import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, EmailStr

from ._base import BaseJSONSchema


router = APIRouter(prefix='/auth', tags=['auth'])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


INVITATION_CODES = {
    "S39H23": True,
    "XZ98H7": True,
    "RX39DS": True,
    "DE332X": True,
    "A35VS0": True,
}

class ReqInvitationCheck(BaseJSONSchema):
    invitationCode: str


class ResInvitationCheck(BaseJSONSchema):
    message: str


@router.post(
    "/invitation/check",
    response_model=ResInvitationCheck,
    status_code=status.HTTP_200_OK
)
async def post_auth_check_invitation(
    req: ReqInvitationCheck,
):
    invitation_code = req.invitationCode
    if invitation_code not in INVITATION_CODES or not INVITATION_CODES[invitation_code]:
        raise HTTPException(status_code=400, detail="招待コードが無効です")
    content = ResInvitationCheck(
        message="招待コードが確認されました"
    )
    return ORJSONResponse(content=jsonable_encoder(content))
