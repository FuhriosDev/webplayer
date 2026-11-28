export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,23}$/;

export function getUsernameValidationError(value: string): string | null {
  const username = value.trim();

  if (!username) return "Username cannot be empty.";
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be no more than ${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use letters, numbers, dots, underscores, or hyphens; start with a letter or number.";
  }

  return null;
}
