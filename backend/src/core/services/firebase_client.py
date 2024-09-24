from functools import lru_cache
from firebase_admin import credentials, initialize_app, get_app, firestore, storage, _apps

from src.settings import settings
class FirebaseClient:
    _firestore = None
    _storage = None
    _app = None

    @classmethod
    def initialize_firebase(cls):
        if not _apps:
            cred = credentials.Certificate(settings.firebase_credentials)
            cls._app = initialize_app(cred, {'storageBucket': f"{cred.project_id}.appspot.com"})
        else:
            cls._app = get_app()

        cls._firestore = firestore.client(app=cls._app)
        cls._storage = storage.bucket(app=cls._app)

    @classmethod
    def get_instance(cls):
        if cls._firestore is None or cls._storage is None:
            cls.initialize_firebase()
        return cls

    @classmethod
    def get_firestore(cls):
        if cls._firestore is None:
            raise RuntimeError("Firebase is not initialized. Call initialize_firebase() first.")
        return cls._firestore

    @classmethod
    def get_storage(cls):
        if cls._storage is None:
            raise RuntimeError("Firebase is not initialized. Call initialize_firebase() first.")
        return cls._storage

@lru_cache()
def get_firebase_client():
    """FirebaseClient のインスタンスをキャッシュして返します。"""
    return FirebaseClient.get_instance()

# FastAPI dependencies
def get_firestore():
    """Firestore クライアントを返すための依存関係。"""
    return FirebaseClient.get_firestore()

def get_storage():
    """Storage クライアントを返すための依存関係。"""
    return FirebaseClient.get_storage()
