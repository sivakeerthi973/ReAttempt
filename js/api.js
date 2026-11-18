(function () {
  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }

  async function readResponse(response, redirectOnUnauthorized) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (redirectOnUnauthorized && response.status === 401 && !/\/api\/auth\/(login|register)$/.test(response.url)) {
        window.location.replace("/login.html?expired=1");
      }
      throw new ApiError(body.message || "The request could not be completed.", response.status, body.error);
    }
    return body;
  }

  async function getCsrfToken() {
    const response = await fetch("/api/auth/csrf-token", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const result = await readResponse(response);
    return result.csrfToken;
  }

  async function request(url, options) {
    const settings = options || {};
    const method = String(settings.method || "GET").toUpperCase();
    const headers = new Headers(settings.headers || {});
    headers.set("Accept", "application/json");
    const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (settings.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    async function send(token) {
      if (token) headers.set("X-CSRFToken", token);
      const response = await fetch(url, {
        ...settings,
        method,
        headers,
        credentials: "same-origin"
      });
      return readResponse(response, settings.redirectOnUnauthorized !== false);
    }

    try {
      return await send(isMutation ? await getCsrfToken() : "");
    } catch (error) {
      if (isMutation && error instanceof ApiError && error.code === "csrf_failed") {
        return send(await getCsrfToken());
      }
      throw error;
    }
  }

  window.ReAttemptApi = { request, ApiError };
})();
