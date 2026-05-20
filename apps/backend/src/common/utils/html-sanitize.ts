import sanitizeHtml from 'sanitize-html';

// Product description policy mirrors ProductDetailContent.tsx and the rich text editor minimum set.
const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'br'];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'target'],
  img: ['src', 'alt'],
};

const ALLOWED_SCHEMES_BY_TAG = {
  a: ['http', 'https'],
  img: ['http', 'https', 'data'],
};

export function sanitizeProductDescription(html: string | undefined): string | undefined {
  if (!html) return html;

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG,
  });
}
