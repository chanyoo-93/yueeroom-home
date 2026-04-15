export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    search: (q: string) => ['products', 'search', q] as const,
  },
  categories: {
    all: ['categories'] as const,
    tree: () => ['categories', 'tree'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    me: ['users', 'me'] as const,
    children: ['users', 'me', 'children'] as const,
    addresses: ['users', 'me', 'addresses'] as const,
  },
  inventory: {
    detail: (variantId: string) => ['inventory', variantId] as const,
  },
} as const;
