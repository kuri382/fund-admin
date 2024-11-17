"""`routers` package-level base implementations.
"""

import functools

from inflection import camelize
from pydantic import BaseModel


class BaseJSONSchema(BaseModel):
    """Base schema for JSON payloads in HTTP requests/responses."""

    class Config:
        """Extra configurations."""

        alias_generator = functools.partial(camelize, uppercase_first_letter=False)
        populate_by_name = True
