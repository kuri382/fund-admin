from fastapi import Depends
from google.cloud import tasks_v2

from src.settings import Settings


def get_cloud_tasks_client():
    """
    CloudTasksClient を生成して返す依存関数
    """
    return tasks_v2.CloudTasksClient()


def get_queue_path(client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client)):
    """
    CloudTasksClient を使って queue_path を返す依存関数
    """
    return client.queue_path(
        Settings.google_cloud.project_id,
        Settings.google_cloud.location_id,
        Settings.google_cloud.queue_id,
    )
