from functools import wraps

from flask import g, jsonify, session

from extensions import db
from models import User


def current_user():
    if hasattr(g, "reattempt_user"):
        return g.reattempt_user
    user_id = session.get("user_id")
    user = db.session.get(User, user_id) if isinstance(user_id, int) else None
    if user is None:
        session.pop("user_id", None)
    g.reattempt_user = user
    return user


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify(
                error="authentication_required",
                message="Your session has ended. Please sign in again.",
            ), 401
        g.current_user = user
        return view(*args, **kwargs)

    return wrapped
