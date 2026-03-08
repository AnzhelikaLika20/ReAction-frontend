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
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.user_id || payload.sub || payload.phone || null;
  } catch (error) {
    console.error('Failed to parse token:', error);
    return null;
  }
}