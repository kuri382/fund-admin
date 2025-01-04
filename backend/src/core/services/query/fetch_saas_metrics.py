from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Literal, Optional

from fastapi import HTTPException, UploadFile
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from openpyxl import load_workbook
from pydantic import BaseModel, Field, validator

from src.core.services.firebase_driver import get_selected_project_id


def fetch_saas_metrics_by_year_month(
    firestore_client: firestore.Client,
    user_id: str,
    year: int = 2024,
    month: int = 8,
) -> list:
    selected_project_id = get_selected_project_id(firestore_client, user_id)
    try:
        documents = (
            firestore_client.collection('users')
            .document(user_id)
            .collection('projects')
            .document(selected_project_id)
            .collection('projection')
            .document('period')
            .collection('year')
            .document(str(year))
            .collection('month')
            .document(str(month))
            .collection('option')
            .stream()
        )
        print([doc.to_dict() for doc in documents])
        return [doc.to_dict() for doc in documents]

    except Exception as e:
        raise ValueError(f"Error while fetching data: {str(e)}")


def fetch_saas_metrics_by_year(
    firestore_client: firestore.Client,
    user_id: str,
    year: int,
) -> list:
    """
    指定された年に紐づくすべての月のデータを取得する。

    Args:
        firestore_client (firestore.Client): Firestoreクライアントインスタンス。
        user_id (str): ユーザーID。
        year (int): 対象年。

    Returns:
        list: 取得したドキュメントのリスト。
    """
    selected_project_id = get_selected_project_id(firestore_client, user_id)
    try:
        # 年の月コレクションを取得
        months_ref = (
            firestore_client.collection('users')
            .document(user_id)
            .collection('projects')
            .document(selected_project_id)
            .collection('projection')
            .document('period')
            .collection('year')
            .document(str(year))
            .collection('month')
        )

        # サブコレクション "option" からデータを収集
        all_data = []
        for month in range(1, 13):  # 1月から12月まで確認
            month_ref = months_ref.document(str(month))
            options_ref = month_ref.collection('option')
            option_documents = options_ref.stream()
            # サブコレクションが空でない場合にデータを追加
            for doc in option_documents:
                doc_data = doc.to_dict()
                doc_data['month'] = month
                print('------', doc_data)
                all_data.append(doc_data)

        return all_data

    except Exception as e:
        raise ValueError(f"Error while fetching data by year: {str(e)}")
