const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a'];

export function sanitizeHtml(input: string): string {
  let result = input;

  result = result.replace(/<([^>]+)>/g, (match, tag) => {
    const tagName = tag.split(/\s/)[0].toLowerCase().replace(/^\//, '');

    if (!ALLOWED_TAGS.includes(tagName)) {
      return '';
    }

    if (tagName === 'a') {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/);
      if (hrefMatch) {
        const href = hrefMatch[1];
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return `<a href="${href}" rel="noopener noreferrer">`;
        }
      }
      return '';
    }

    return match;
  });

  return result.trim();
}

export function sanitizeMalayalam(input: string): string {
  return input.normalize('NFC').trim();
}
