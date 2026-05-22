export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}
