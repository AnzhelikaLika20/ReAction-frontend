import { getTokenUserId } from "./tokenUtils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.re-action.site";

export class HttpClient {
  private baseUrl: string;

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
      headers["X-Session-ID"] = getTokenUserId(token) || "";
    }

    return headers;
  }

  private handleUnauthorized(status: number): void {
    if (status === 401) {
      localStorage.removeItem("jwt_token");
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const httpClient = new HttpClient(API_BASE_URL);
