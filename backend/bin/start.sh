#!/bin/bash

gunicorn -w 10 -k "uvicorn.workers.UvicornWorker" --timeout 1200 -b 0.0.0.0:${PORT:-8080} "src.server:app"
