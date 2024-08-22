#!/bin/bash

gunicorn -w 1 -k "uvicorn.workers.UvicornWorker" --timeout 300 -b 0.0.0.0:${PORT:-8080} "src.server:app"