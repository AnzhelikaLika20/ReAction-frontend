export const CREDENTIAL_PASSWORD_HINT =
  "Не менее 8 символов, буквы в верхнем и нижнем регистре и хотя бы одна цифра.";

const MIN_LENGTH = 8;

export function getCredentialPasswordError(password: string): string | null {
  const chars = [...password];
  if (chars.length < MIN_LENGTH) {
    return "Пароль должен быть не короче 8 символов.";
  }

  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;

  for (const c of chars) {
    if (/\d/.test(c)) {
      hasDigit = true;
    }
    if (c !== c.toUpperCase()) {
      hasLower = true;
    }
    if (c !== c.toLowerCase()) {
      hasUpper = true;
    }
  }
  if (!hasLower || !hasUpper || !hasDigit) {
    return CREDENTIAL_PASSWORD_HINT;
  }
  return null;
}
