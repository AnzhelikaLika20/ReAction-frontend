import { httpClient } from "./httpClient";
import type {
  AuthTokenResponse,
  RegisterPendingResponse,
  SessionState,
  TelegramInitResponse,
  User,
} from "../types";
import { isTokenExpired, getTokenUserId } from "./tokenUtils";

export const TELEGRAM_CONNECT_WIP_KEY = "reaction_telegram_connect_wip";

const LEGACY_TELEGRAM_KEY = "reaction_telegram_messenger_account_id";
const CHATS_MESSENGER_ACCOUNT_STORAGE_KEY =
  "reaction_chats_messenger_account_id";

const REFRESH_TOKEN_KEY = "refresh_token";

function persistToken(token: string) {
  localStorage.setItem("jwt_token", token);
}

function persistTokenPair(accessToken: string, refreshToken?: string) {
  localStorage.setItem("jwt_token", accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

const emailVerifyByToken = new Map<string, Promise<string>>();

export const authService = {
  async register(email: string, password: string): Promise<RegisterPendingResponse> {
    return httpClient.post<RegisterPendingResponse>("/auth/register", {
      email,
      password,
    });
  },

  async verifyEmailFromQueryToken(token: string): Promise<string> {
    const key = token.trim();
    const cached = emailVerifyByToken.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const p = (async () => {
      const response = await httpClient.get<AuthTokenResponse>(
        `/auth/verify-email?token=${encodeURIComponent(key)}`,
      );
      persistTokenPair(response.token, response.refresh_token);
      return response.token;
    })();
    emailVerifyByToken.set(key, p);
    p.catch(() => {
      emailVerifyByToken.delete(key);
    });
    return p;
  },

  async resendVerificationEmail(email: string): Promise<void> {
    await httpClient.postVoid("/auth/resend-verification", { email });
  },

  async login(email: string, password: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>("/auth/login", {
      email,
      password,
    });
    persistTokenPair(response.token, response.refresh_token);
    return response.token;
  },

  async refreshTokens(): Promise<string> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await httpClient.postSkipRefresh<AuthTokenResponse>(
      "/auth/refresh",
      { refresh_token: refreshToken },
    );
    persistTokenPair(response.token, response.refresh_token);
    return response.token;
  },

  async initTelegramAuth(phoneNumber: string): Promise<string> {
    const res = await httpClient.post<TelegramInitResponse>(
      "/auth/telegram/init",
      { phone_number: phoneNumber },
    );
    if (!res.messenger_account_id) {
      throw new Error("Ответ init без messenger_account_id");
    }
    return res.messenger_account_id;
  },

  async sendPhone(phone: string, messengerAccountId: string): Promise<void> {
    await httpClient.post("/auth/telegram/phone", {
      phone_number: phone,
      messenger_account_id: messengerAccountId,
    });
    await this.waitForStatusChange(messengerAccountId, "wait_code", 5, 1000);
  },

  async sendCode(code: string, messengerAccountId: string): Promise<void> {
    await httpClient.post("/auth/telegram/code", {
      code,
      messenger_account_id: messengerAccountId,
    });
    const status = await this.waitForStatusChange(
      messengerAccountId,
      ["ready", "wait_password"],
      5,
      1000,
    );
    if (!status) {
      throw new Error("Failed to verify code status");
    }
  },

  async sendTelegramPassword(
    password: string,
    messengerAccountId: string,
  ): Promise<void> {
    await httpClient.post("/auth/telegram/password", {
      password,
      messenger_account_id: messengerAccountId,
    });
    await this.waitForStatusChange(messengerAccountId, "ready", 5, 1000);
  },

  async getSessionStatusForMessenger(
    messengerAccountId: string,
  ): Promise<SessionState> {
    return httpClient.get<SessionState>(
      `/auth/session/status?messenger_account_id=${encodeURIComponent(messengerAccountId)}`,
    );
  },

  async waitForStatusChange(
    messengerAccountId: string,
    expectedStatus: string | string[],
    maxAttempts: number = 5,
    delayMs: number = 1000,
  ): Promise<SessionState | null> {
    const expectedStatuses = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const status =
        await this.getSessionStatusForMessenger(messengerAccountId);
      if (expectedStatuses.includes(status.auth_state)) {
        return status;
      }
    }

    return null;
  },

  clearTelegramConnectWip(): void {
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
  },

  clearSession(): void {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
    sessionStorage.removeItem(LEGACY_TELEGRAM_KEY);
    sessionStorage.removeItem(CHATS_MESSENGER_ACCOUNT_STORAGE_KEY);
  },

  async deleteAccount(password: string): Promise<void> {
    await httpClient.deleteJson("/users/me", { password });
    this.clearSession();
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
      return false;
    }

    return true;
  },

  getCurrentUserId(): string | null {
    const token = localStorage.getItem("jwt_token");
    if (!token) return null;
    return getTokenUserId(token);
  },
};
