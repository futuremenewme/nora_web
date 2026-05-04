import Header from '@/components/header';
import Link from 'next/link';
import {getTranslations, setRequestLocale} from 'next-intl/server';

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=cz.nora.app';

const APP_STORE_URL =
  'https://apps.apple.com/cz/app/nora-event-map/id6755952471?l=cs';

function ButtonBase({
  href,
  children,
  target,
  rel,
  className = ''
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-[18px] border border-white/20 bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-white/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.46)] ${className}`}
    >
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <span className="absolute inset-[1px] rounded-[16px] border border-white/10" />
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_48%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <span className="relative z-10 flex items-center gap-3">{children}</span>
    </Link>
  );
}

function StoreButton({
  platform,
  href
}: {
  platform: 'google' | 'apple';
  href: string;
}) {
  const isGoogle = platform === 'google';

  return (
    <ButtonBase
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="min-h-[64px] w-full justify-center px-4 py-3 sm:min-w-[235px] sm:flex-1"
    >
      {isGoogle ? (
        <svg
          width="26"
          height="30"
          viewBox="0 0 36 40"
          fill="none"
          className="shrink-0"
          aria-hidden="true"
        >
          <path
            d="M2.1 1.8C1.4 2.5 1 3.7 1 5.4V34.6C1 36.3 1.4 37.5 2.1 38.2L2.3 38.4L18.7 22L18.8 20L2.3 1.6L2.1 1.8Z"
            fill="#00C4FF"
          />
          <path
            d="M24.2 27.5L18.7 22L2.1 38.2C3.2 39.3 5 39.4 7.1 38.3L24.2 27.5Z"
            fill="#00D26A"
          />
          <path
            d="M24.7 12.5L7.1 1.7C5 0.6 3.2 0.7 2.1 1.8L18.7 22L24.7 12.5Z"
            fill="#FF4D67"
          />
          <path
            d="M34.2 18.1L24.7 12.5L18.7 18.5L24.2 27.5L34.2 21.2C36.9 19.5 36.9 19.8 34.2 18.1Z"
            fill="#FFC400"
          />
        </svg>
      ) : (
        <svg
          width="24"
          height="28"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="shrink-0 text-white"
          aria-hidden="true"
        >
          <path d="M16.365 1.43c0 1.14-.414 2.234-1.16 3.08-.9 1.02-2.37 1.8-3.64 1.7-.16-1.09.37-2.27 1.11-3.08.82-.92 2.28-1.59 3.69-1.7zm4.27 16.24c-.55 1.23-.81 1.78-1.52 2.86-.99 1.51-2.38 3.4-4.11 3.42-1.54.02-1.94-.99-4.03-.98-2.1.01-2.55 1-4.09.98-1.73-.02-3.04-1.72-4.03-3.23C.1 16.74-.16 12.06 2.13 8.53c1.62-2.5 4.2-3.95 6.63-3.95 2.48 0 4.04 1.02 6.09 1.02 1.98 0 3.19-1.02 6.08-1.02.42 0 .84.03 1.26.09-3.54 2.12-2.97 7.16.44 8.54-.33.97-.68 1.7-1.01 2.46z" />
        </svg>
      )}

      <span className="text-center leading-none">
        <span className="block text-[9px] uppercase tracking-[0.16em] text-white/72 sm:text-[10px]">
          {isGoogle ? 'Get it on' : 'Download on the'}
        </span>
        <span className="mt-1 block text-[1.2rem] font-semibold tracking-tight text-white sm:text-[1.28rem]">
          {isGoogle ? 'Google Play' : 'App Store'}
        </span>
      </span>
    </ButtonBase>
  );
}

function ActionButton({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-flex min-h-[62px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] px-6 py-4 text-center text-[1rem] font-semibold text-white shadow-[0_10px_24px_rgba(124,94,255,0.34),0_2px_0_rgba(255,255,255,0.18)_inset,0_-8px_18px_rgba(76,34,171,0.28)_inset] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_18px_36px_rgba(124,94,255,0.46),0_2px_0_rgba(255,255,255,0.24)_inset,0_-10px_22px_rgba(76,34,171,0.34)_inset] sm:min-w-[220px] sm:w-auto sm:text-[1.04rem]"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.30),transparent_45%),linear-gradient(180deg,transparent,rgba(80,45,180,0.16))]" />
      <span className="absolute inset-[1px] rounded-[17px] border border-white/10" />
      <span className="absolute -inset-x-10 top-0 h-[55%] bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.22)_35%,transparent_60%)] opacity-0 blur-md transition duration-500 group-hover:translate-x-8 group-hover:opacity-100" />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export default async function HomePage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  setRequestLocale(locale);

  const t = await getTranslations({locale, namespace: 'homepage'});
  const about = await getTranslations({locale, namespace: 'aboutPage'});
  const download = await getTranslations({locale, namespace: 'downloadPage'});
  const mapSection = await getTranslations({locale, namespace: 'mapSection'});
  const qaSection = await getTranslations({locale, namespace: 'qaSection'});
  const legal = await getTranslations({locale, namespace: 'legal'});

  const aboutCards = [
    {
      title: about('why.title'),
      text: about('why.text')
    },
    {
      title: about('forWhom.title'),
      text: about('forWhom.text')
    },
    {
      title: about('easy.title'),
      text: about('easy.text')
    },
    {
      title: about('benefit.title'),
      text: about('benefit.text')
    }
  ];

  const downloadBenefits = [
    {
      title: download('benefits.always.title'),
      text: download('benefits.always.text')
    },
    {
      title: download('benefits.fast.title'),
      text: download('benefits.fast.text')
    },
    {
      title: download('benefits.clear.title'),
      text: download('benefits.clear.text')
    }
  ];

  const qaItems = [
    {
      title: about('why.title'),
      text: about('why.text')
    },
    {
      title: about('forWhom.title'),
      text: about('forWhom.text')
    },
    {
      title: about('easy.title'),
      text: about('easy.text')
    },
    {
      title: about('benefit.title'),
      text: about('benefit.text')
    },
    {
      title: about('future.title'),
      text: about('future.text')
    }
  ];

  return (
    <main className="min-h-screen bg-[#0F0F17] text-[#F5F3FF]">
      <Header />

      <section
        id="home"
        className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 lg:gap-14"
      >
        <div className="relative z-20">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('title')}
          </h1>

          <p className="mt-6 max-w-lg text-[#CFC9E6] sm:text-lg">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <ActionButton href={`/${locale}/map`} label={t('map')} />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-nowrap">
              <StoreButton platform="google" href={GOOGLE_PLAY_URL} />
              <StoreButton platform="apple" href={APP_STORE_URL} />
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center md:justify-end">
          <div className="absolute h-[420px] w-[420px] rounded-full bg-[#9B87F5]/50 blur-[120px] md:h-[520px] md:w-[520px]" />
          <div className="absolute h-[260px] w-[260px] rounded-full bg-[#7C5EFF]/40 blur-[90px] md:h-[320px] md:w-[320px]" />

          <img
            src="/images/phone.png"
            alt="Nora app preview"
            className="relative z-10 w-[340px] max-w-none object-contain drop-shadow-[0_50px_120px_rgba(0,0,0,0.9)] sm:w-[420px] md:w-[520px] lg:w-[620px]"
          />
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-bold sm:text-4xl">{about('title')}</h2>

        <p className="mt-6 max-w-3xl text-[#CFC9E6]">
          {about('intro')}
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {aboutCards.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#2A2A3D] bg-[#171726] p-6 transition hover:border-[#9B87F5]/50"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#CFC9E6]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              {mapSection('title')}
            </h2>

            <p className="mt-6 text-[#CFC9E6]">
              {mapSection('text')}
            </p>

            <div className="mt-8">
              <ActionButton href={`/${locale}/map`} label={t('map')} />
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute h-80 w-80 rounded-full bg-[#9B87F5]/30 blur-3xl" />

            <div className="relative w-full max-w-md">
              <img
                src="/images/map-preview.png"
                alt="Mapa událostí"
                className="h-auto w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="download"
        className="mx-auto max-w-6xl px-6 py-24 text-center"
      >
        <h2 className="text-3xl font-bold sm:text-4xl">
          {download('title')}
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-[#CFC9E6]">
          {download('intro')}
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {downloadBenefits.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#2A2A3D] bg-[#171726] p-6"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#CFC9E6]">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <StoreButton platform="google" href={GOOGLE_PLAY_URL} />
          <StoreButton platform="apple" href={APP_STORE_URL} />
        </div>

        <p className="mt-6 text-sm text-[#CFC9E6]">
          {download('outro')}
        </p>
      </section>

      <section id="qa" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {qaSection('title')}
        </h2>

        <div className="space-y-6">
          {qaItems.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#2A2A3D] bg-[#171726] p-6"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#CFC9E6]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#CFC9E6] sm:flex-row">
          <span className="font-semibold tracking-[0.22em] text-white/80">
            nora
          </span>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href={`/${locale}/terms`}
              className="transition hover:text-white"
            >
              {legal('terms')}
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="transition hover:text-white"
            >
              {legal('privacy')}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
