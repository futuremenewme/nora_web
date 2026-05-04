import {readFileSync} from 'node:fs';
import path from 'node:path';

export const legalDocumentSlugs = ['terms', 'privacy'] as const;

export type LegalDocumentSlug = (typeof legalDocumentSlugs)[number];

export function isLegalDocumentSlug(value: string): value is LegalDocumentSlug {
  return legalDocumentSlugs.includes(value as LegalDocumentSlug);
}

export function getLegalDocument(locale: string, document: LegalDocumentSlug) {
  const filePath = path.join(
    process.cwd(),
    'public',
    'legal',
    locale,
    `${document}.html`
  );
  const source = readFileSync(filePath, 'utf8');
  const mainMatch = source.match(/<main\s+class=["']container["']>([\s\S]*?)<\/main>/i);

  if (!mainMatch) {
    throw new Error(`Legal document ${locale}/${document} is missing a main container.`);
  }

  const fullHtml = mainMatch[1].trim();
  const titleMatch = fullHtml.match(/<h1>([\s\S]*?)<\/h1>/i);
  const rawTitle = titleMatch ? stripTags(titleMatch[1]) : 'NORA';
  const title = rawTitle.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const html = fullHtml.replace(/<h1>[\s\S]*?<\/h1>/i, '').trim();

  return {
    html,
    title
  };
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
