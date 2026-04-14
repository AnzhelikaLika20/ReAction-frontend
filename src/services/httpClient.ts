const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.re-action.site";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function tryRefreshTokens(): Promise<boolean> {
  try {
    const { authService } = await import("./authService");
    await authService.refreshTokens();
    return true;
  } catch {
    return false;
  }
}

export class HttpClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = localStorage.getItem("jwt_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private redirectToAuth(): void {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("refresh_token");
    if (window.location.pathname !== "/auth") {
      window.location.href = "/auth";
    }
  }

  private async handleUnauthorized(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      this.redirectToAuth();
      return false;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = tryRefreshTokens().finally(() => {
        this.refreshPromise = null;
      });
    }

    const ok = await this.refreshPromise;
    if (!ok) {
      this.redirectToAuth();
    }
    return ok;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.get<T>(endpoint);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.post<T>(endpoint, data);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errBody: unknown = await response.json();
        if (
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
        ) {
          message = (errBody as { error: string }).error;
        }
      } catch {
        /* ignore non-JSON body */
      }
      throw new ApiError(response.status, message);
    }

    return response.json();
  }

  async postSkipRefresh<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errBody: unknown = await response.json();
        if (
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
        ) {
          message = (errBody as { error: string }).error;
        }
      } catch {
        /* ignore non-JSON body */
      }
      throw new ApiError(response.status, message);
    }

    return response.json();
  }

  async postVoid(endpoint: string, data?: unknown): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.postVoid(endpoint, data);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errBody: unknown = await response.json();
        if (
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
        ) {
          message = (errBody as { error: string }).error;
        }
      } catch {
        /* ignore */
      }
      throw new ApiError(response.status, message);
    }
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.put<T>(endpoint, data);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.delete(endpoint);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }
  }

  /** DELETE с JSON-телом (например удаление аккаунта с паролем). */
  async deleteJson(endpoint: string, data: unknown): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.deleteJson(endpoint, data);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errBody: unknown = await response.json();
        if (
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
        ) {
          message = (errBody as { error: string }).error;
        }
      } catch {
        /* ignore */
      }
      throw new ApiError(response.status, message);
    }
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (response.status === 401) {
      const retry = await this.handleUnauthorized();
      if (retry) {
        return this.downloadFile(endpoint);
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.blob();
  }
}

export const httpClient = new HttpClient(API_BASE_URL);
