from flask import jsonify, request
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


def register_errors(app):
    @app.errorhandler(APIError)
    def api_error(error):
        return jsonify(error={"code": error.code, "message": error.message}, request_id=getattr(request, "request_id", None)), error.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        code = "payload_too_large" if error.code == 413 else "http_error"
        return jsonify(error={"code": code, "message": error.description}, request_id=getattr(request, "request_id", None)), error.code

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.exception("Unhandled error")
        return jsonify(error={"code": "internal_error", "message": "Internal server error"}, request_id=getattr(request, "request_id", None)), 500

