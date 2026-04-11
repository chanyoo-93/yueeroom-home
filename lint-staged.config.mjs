const config = {
  'apps/**/*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  'packages/**/*.ts': ['eslint --fix', 'prettier --write'],
  '**/*.{js,jsx,json,md,yaml,yml,css}': ['prettier --write'],
};

export default config;
