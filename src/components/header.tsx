'use client';

import Link from 'next/link';
import {useParams, usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useState} from 'react';

export default function Header() {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;

  const changeLocale = (nextLocale: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const rest = segments.slice(1);
    const newPath = `/${nextLocale}${rest.length ? `/${rest.join('/')}` : ''}`;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      window.location.href = `${newPath}${hash}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0F0F17]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* LOGO */}
        <Link href={`/${locale}#home`} className="shrink-0">
<span
  className="text-2xl font-semibold tracking-[0.25em] text-white md:text-3xl"
  style={{
    textShadow:
      '0 0 12px rgba(155, 135, 245, 0.9), 0 0 28px rgba(155, 135, 245, 0.5)'
  }}
>
  nora
</span>
        </Link>

        {/* DESKTOP MENU */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${locale}#about`}
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            {t('about')}
          </Link>
          <Link
            href={`/${locale}/map`}
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            {t('map')}
          </Link>
          <Link
            href={`/${locale}#download`}
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            {t('download')}
          </Link>
          <Link
            href={`/${locale}#qa`}
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            {t('qa')}
          </Link>
        </nav>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* LANGUAGE SWITCHER */}
          <div className="relative">
            <select
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#171726] px-3 py-2 text-sm font-medium text-white outline-none transition hover:border-[#9B87F5]/50"
              aria-label="Language switcher"
            >
              <option value="cs">CZ</option>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
          </div>

          {/* HAMBURGER */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#171726] md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <div className="flex flex-col gap-1.5">
              <span className="block h-[2px] w-5 rounded-full bg-white"></span>
              <span className="block h-[2px] w-5 rounded-full bg-white"></span>
              <span className="block h-[2px] w-5 rounded-full bg-white"></span>
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="border-t border-white/10 bg-[#0F0F17] px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link
              href={`/${locale}#about`}
              onClick={() => setOpen(false)}
              className="text-white/85 transition hover:text-white"
            >
              {t('about')}
            </Link>
            <Link
              href={`/${locale}/map`}
              onClick={() => setOpen(false)}
              className="text-white/85 transition hover:text-white"
            >
              {t('map')}
            </Link>
            <Link
              href={`/${locale}#download`}
              onClick={() => setOpen(false)}
              className="text-white/85 transition hover:text-white"
            >
              {t('download')}
            </Link>
            <Link
              href={`/${locale}#qa`}
              onClick={() => setOpen(false)}
              className="text-white/85 transition hover:text-white"
            >
              {t('qa')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}