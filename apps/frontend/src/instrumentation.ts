import type { captureRequestError } from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError: typeof captureRequestError = async (...args) => {
  const { captureRequestError: capture } = await import('@sentry/nextjs');
  return capture(...args);
};
