import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ArrowLeft} from 'lucide-react';
import {
  getLegalDocument,
  isLegalDocumentSlug,
  legalDocumentSlugs
} from '@/lib/legal-documents';
import {routing} from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    legalDocumentSlugs.map((document) => ({locale, document}))
  );
}

export default async function LegalDocumentPage({
  params
}: {
  params: Promise<{locale: string; document: string}>;
}) {
  const {locale, document} = await params;

  if (!isLegalDocumentSlug(document)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({locale, namespace: 'legal'});
  const legalDocument = getLegalDocument(locale, document);

  return (
    <main className="min-h-screen bg-[#0F0F17] px-5 py-6 text-[#F5F3FF] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#171726] px-4 py-2 text-sm font-medium text-white/85 transition hover:border-[#9B87F5]/50 hover:text-white"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t('back')}
        </Link>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white px-5 py-8 text-[#222] shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-8 md:px-12 md:py-12">
          <h1 className="text-3xl font-bold tracking-tight text-[#15131F] sm:text-4xl">
            {legalDocument.title}
          </h1>

          <article
            className="legal-content mt-8"
            dangerouslySetInnerHTML={{__html: legalDocument.html}}
          />
        </section>
      </div>
    </main>
  );
}
