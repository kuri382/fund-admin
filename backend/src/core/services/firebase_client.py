from functools import lru_cache
from firebase_admin import credentials, initialize_app, get_app, firestore, storage, _apps

class FirebaseClient:
    _instance = None

    def __init__(self):
        self._firestore = None
        self._storage = None
        self._app = self._initialize_firebase()

    @staticmethod
    def _initialize_firebase():
        """
        Firebase アプリケーションを初期化または取得します。
        既に初期化されている場合は既存のアプリケーションを返します。
        """
        if not _apps:
            cred = credentials.Certificate("env.bak/granite-dev-2024-firebase-adminsdk-77135-c8b037965d.json")
            return initialize_app(cred)
        return get_app()

    @property
    def firestore(self):
        """Firestore クライアントを遅延初期化して返します。"""
        if self._firestore is None:
            self._firestore = firestore.client(app=self._app)
        return self._firestore

    @property
    def storage(self):
        """Storage クライアントを遅延初期化して返します。"""
        if self._storage is None:
            self._storage = storage.bucket(app=self._app)
        return self._storage

    @classmethod
    def get_instance(cls):
        """FirebaseClient のシングルトンインスタンスを返します。"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

@lru_cache()
def get_firebase_client():
    """FirebaseClient のインスタンスをキャッシュして返します。"""
    return FirebaseClient.get_instance()

# FastAPI dependencies
def get_firestore():
    """Firestore クライアントを返すための依存関係。"""
    return get_firebase_client().firestore

def get_storage():
    """Storage クライアントを返すための依存関係。"""
    return get_firebase_client().storage
