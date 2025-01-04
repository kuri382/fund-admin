"""`/data` endpoints.
"""

from fastapi import APIRouter

from . import profit_and_loss as _profit_and_loss
from . import saas as _saas

router = APIRouter(prefix='/projection', tags=['projection'])
router.include_router(_profit_and_loss.router, prefix='/profit_and_loss')
router.include_router(_saas.router, prefix='/saas')
