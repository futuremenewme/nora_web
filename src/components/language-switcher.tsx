'use client';

import Link from 'next/link';
import {useParams, usePathname} from 'next/navigation';

const locales = ['cs', 'en', 'de'] as const;

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const pathnameWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';

  return (
    <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-2 py-1">
      {locales.map((locale) => {
        const isActive = locale === currentLocale;

        return (
          <Link
            key={locale}
            href={`/${locale}${pathnameWithoutLocale === '/' ? '' : pathnameWithoutLocale}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              isActive
                ? 'bg-[#B8A9FF] text-[#121018]'
                : 'text-black/60 hover:bg-[#F1EBFF] hover:text-[#121018]'
            }`}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}