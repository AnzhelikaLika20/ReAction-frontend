export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1]));

    if (!payload.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error("Failed to parse token:", error);
    return true;
  }
}

export function getTokenUserId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    if (payload.user_id) {
      return payload.user_id as string;
    }
    if (payload.sub) {
      return payload.sub as string;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse token:", error);
    return null;
  }
}
