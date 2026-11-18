import re
from datetime import date, time
from urllib.parse import urlsplit


class ApiValidationError(ValueError):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def json_object(request):
    value = request.get_json(silent=True)
    if not isinstance(value, dict):
        raise ApiValidationError("Send a JSON object in the request body.")
    return value


def required_text(value, label, maximum, minimum=1):
    if not isinstance(value, str):
        raise ApiValidationError(f"{label} is required.")
    result = value.strip()
    if len(result) < minimum or len(result) > maximum:
        raise ApiValidationError(f"{label} must be between {minimum} and {maximum} characters.")
    if any(ord(character) < 32 and character not in "\t\n\r" for character in result):
        raise ApiValidationError(f"{label} contains unsupported control characters.")
    return result


def optional_text(value, label, maximum):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ApiValidationError(f"{label} must be text.")
    result = value.strip()
    if len(result) > maximum:
        raise ApiValidationError(f"{label} must be no more than {maximum} characters.")
    return result


def validate_email(value):
    email = required_text(value, "Email address", 254).lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ApiValidationError("Enter a valid email address.")
    return email


def validate_password(value, label="Password", minimum=8):
    if not isinstance(value, str) or value != value.strip():
        raise ApiValidationError(f"{label} must be a password without leading or trailing spaces.")
    password = required_text(value, label, 128, minimum)
    if any(character.isspace() for character in password):
        raise ApiValidationError(f"{label} cannot contain spaces.")
    return password


def validate_year(value):
    allowed = {"1st year", "2nd year", "3rd year", "4th year"}
    result = required_text(value, "Year of study", 20)
    if result not in allowed:
        raise ApiValidationError("Choose a valid year of study.")
    return result


def validate_semester(value):
    result = required_text(value, "Semester", 20)
    if not re.fullmatch(r"Semester [1-8]", result):
        raise ApiValidationError("Choose a semester from Semester 1 to Semester 8.")
    return result


def validate_date(value, label, optional=False):
    if optional and value in (None, ""):
        return None
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ApiValidationError(f"{label} must use YYYY-MM-DD format.")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ApiValidationError(f"{label} is not a valid date.") from error


def validate_time(value, label):
    if not isinstance(value, str) or not re.fullmatch(r"\d{2}:\d{2}", value):
        raise ApiValidationError(f"{label} must use HH:MM format.")
    try:
        return time.fromisoformat(value)
    except ValueError as error:
        raise ApiValidationError(f"{label} is not a valid time.") from error


def validate_url(value):
    url = required_text(value, "Resource URL", 2048)
    parts = urlsplit(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ApiValidationError("Resource URLs must start with http:// or https://.")
    if parts.username or parts.password:
        raise ApiValidationError("Resource URLs cannot contain embedded credentials.")
    try:
        parts.port
    except ValueError as error:
        raise ApiValidationError("The resource URL contains an invalid port.") from error
    return url


def validate_bool(value, label):
    if not isinstance(value, bool):
        raise ApiValidationError(f"{label} must be true or false.")
    return value
