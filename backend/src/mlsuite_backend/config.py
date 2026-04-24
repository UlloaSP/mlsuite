"""Runtime configuration."""

import os

CORS_ALLOW_ORIGINS = os.environ.get("CORS_ALLOW_ORIGINS", "https://localhost:8443").split(",")
HOST = "0.0.0.0"
PORT = 8000
JOBLIB_SUFFIX = ".joblib"
