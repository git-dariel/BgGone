import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = int(os.getenv("WEB_WORKERS", "1"))
threads = int(os.getenv("WEB_THREADS", "4"))
timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120"))
graceful_timeout = 30
accesslog = "-"
errorlog = "-"
