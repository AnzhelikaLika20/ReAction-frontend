import { httpClient } from "./httpClient";
import type { AuthTokenResponse, SessionState, User } from "../types";
import { isTokenExpired, getTokenUserId } from "./tokenUtils";

export const authService = {
  async getToken(phone: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>("/auth/token", {
      phone_number: phone,
    });
    const token = response.token;

    localStorage.setItem("jwt_token", token);
    localStorage.setItem("auth_phone", phone);

    return token;
  },

  async initTelegramAuth(): Promise<void> {
    await httpClient.post("/auth/telegram/init");
    await this.waitForStatusChange("wait_phone", 5, 1000);
  },

  async sendPhone(phone: string): Promise<void> {
    localStorage.setItem("auth_phone", phone);
    await httpClient.post("/auth/telegram/phone", { phone_number: phone });
    await this.waitForStatusChange("wait_code", 5, 1000);
  },

  async sendCode(code: string): Promise<void> {
    await httpClient.post("/auth/telegram/code", { code: code });
    const status = await this.waitForStatusChange(
      ["ready", "wait_password"],
      5,
      1000,
    );
    if (!status) {
      throw new Error("Failed to verify code status");
    }
  },

  async sendPassword(password: string): Promise<void> {
    await httpClient.post("/auth/telegram/password", { password: password });
    await this.waitForStatusChange("ready", 5, 1000);
  },

  async getSessionStatus(): Promise<SessionState> {
    const response = await httpClient.get<SessionState>("/auth/session/status");
    return response;
  },

  async waitForStatusChange(
    expectedStatus: string | string[],
    maxAttempts: number = 5,
    delayMs: number = 1000,
  ): Promise<SessionState | null> {
    const expectedStatuses = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const status = await this.getSessionStatus();
      if (expectedStatuses.includes(status.auth_state)) {
        return status;
      }
    }

    return null;
  },

  async logout(): Promise<void> {
    await httpClient.delete("/auth/session");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("auth_phone");
  },

  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>("/users/me");
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_phone");
      return false;
    }

    return true;
  },

  validateTokenForPhone(phone: string): boolean {
    const token = localStorage.getItem("jwt_token");
    const storedPhone = localStorage.getItem("auth_phone");

    if (!token || !storedPhone) {
      return false;
    }

    if (storedPhone !== phone) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_phone");
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_phone");
      return false;
    }

    const tokenUserId = getTokenUserId(token);
    if (tokenUserId && tokenUserId !== phone && tokenUserId !== storedPhone) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_phone");
      return false;
    }

    return true;
  },
};
