import threading

from redis import Redis
from rq import Queue, Worker

from .batches import cleanup
from .config import Settings


def main():
    settings = Settings.from_env()
    connection = Redis.from_url(settings.redis_url)

    def periodic_cleanup():
        cleanup(settings)
        timer = threading.Timer(min(300, settings.batch_retention_seconds), periodic_cleanup)
        timer.daemon = True
        timer.start()

    periodic_cleanup()
    Worker([Queue("images", connection=connection)], connection=connection).work()


if __name__ == "__main__":
    main()
