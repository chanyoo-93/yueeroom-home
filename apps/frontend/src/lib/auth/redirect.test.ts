import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirectToLogin } from './redirect';

describe('redirectToLogin', () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { replace },
      writable: true,
    });
  });

  it('/login으로 이동한다', () => {
    redirectToLogin();

    expect(replace).toHaveBeenCalledWith('/login');
  });
});
