from google.cloud import tasks_v2
import json


def create_task_payload(worker_url, payload):
    """
    Cloud Tasks用のタスクペイロードを作成
    """
    return {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": worker_url,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(payload.dict()).encode('utf-8'),
        }
    }