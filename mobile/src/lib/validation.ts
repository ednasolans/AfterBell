export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// True when the text is empty or only has spaces
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

// True when an errors object (one message per field) has at least one error
export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}