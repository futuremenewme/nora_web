'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {GoogleMap, Marker, useJsApiLoader} from '@react-google-maps/api';
import {
  collection,
  getDocs,
  getFirestore,
  initializeFirestore,
  query,
  Timestamp,
  where
} from 'firebase/firestore';
import {getApps, initializeApp} from 'firebase/app';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';

const EVENT_TYPES = [
  'concert',
  'party',
  'festival',
  'sport',
  'theatre',
  'cinema',
  'art',
  'food',
  'kids',
  'family',
  'workshop',
  'lecture',
  'networking',
  'market',
  'community',
  'charity',
  'outdoor',
  'wellness',
  'other'
] as const;

type EventType = (typeof EVENT_TYPES)[number];
type DateFilter = 'any' | 'today' | 'tomorrow' | 'week' | 'custom';
type EventModeFilter = 'all' | 'single' | 'recurring';
type PriceFilter = 'all' | 'free' | 'paid';

type EventItem = {
  id: string;
  title: string;
  locationText: string;
  imageUrl: string;
  type: EventType;
  visibility: string;
  createdBy: string;
  creatorUsername: string;
  eventMode: 'single' | 'recurring';
  isFree: boolean;
  priceFrom: number | null;
  time?: string;
  timeStart?: string;
  timeEnd?: string;
  lat: number;
  lng: number;
  date: Date | null;
  raw: Record<string, unknown>;
};

type SuggestionItem = {
  id: string;
  label: string;
  secondary?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  source: 'event' | 'place';
};

const DEFAULT_CENTER = {lat: 50.0755, lng: 14.4378};

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    {elementType: 'geometry', stylers: [{color: '#121018'}]},
    {elementType: 'labels.text.fill', stylers: [{color: '#d8d2ee'}]},
    {elementType: 'labels.text.stroke', stylers: [{color: '#121018'}]},
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels',
      stylers: [{visibility: 'off'}]
    },
    {featureType: 'poi', elementType: 'geometry', stylers: [{color: '#1E1B29'}]},
    {
      featureType: 'poi',
      elementType: 'labels.icon',
      stylers: [{visibility: 'off'}]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{color: '#1A1724'}]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{color: '#C9BCFF'}]
    },
    {featureType: 'road', elementType: 'geometry', stylers: [{color: '#1A1822'}]},
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{visibility: 'off'}]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{color: '#232034'}]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{color: '#2B2541'}]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{color: '#C9BCFF'}]
    },
    {featureType: 'transit', stylers: [{visibility: 'off'}]},
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{color: '#191727'}]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{color: '#b9b2d9'}]
    }
  ]
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

function getFirebaseDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  try {
    return getFirestore(app);
  } catch {
    return initializeFirestore(app, {});
  }
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as {seconds?: unknown}).seconds);
    if (!Number.isNaN(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  return null;
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getNestedDate(data: Record<string, unknown>, key: 'startDate' | 'endDate') {
  const recurrence = data.recurrence;
  if (!recurrence || typeof recurrence !== 'object') return null;
  return toDateSafe((recurrence as Record<string, unknown>)[key]);
}

function getWeekdays(data: Record<string, unknown>) {
  const recurrence = data.recurrence;
  if (!recurrence || typeof recurrence !== 'object') return new Set<number>();

  const weekdays = (recurrence as Record<string, unknown>).weekdays;
  if (!Array.isArray(weekdays)) return new Set<number>();

  return new Set(
    weekdays
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isFreeEvent(data: Record<string, unknown>) {
  const priceFrom = data.priceFrom;
  return data.isFree === true || (typeof priceFrom === 'number' && priceFrom === 0);
}

function matchesSingleDateFilter(date: Date | null, filter: DateFilter, customDate: Date | null) {
  if (!date) return false;

  const now = new Date();
  const today = dateOnly(now);
  const eventDate = dateOnly(date);

  if (eventDate < today) return false;

  if (filter === 'any') return true;
  if (filter === 'today') return isSameDay(date, today);

  if (filter === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(date, tomorrow);
  }

  if (filter === 'week') {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return eventDate >= today && eventDate <= end;
  }

  if (filter === 'custom' && customDate) {
    return isSameDay(date, customDate);
  }

  if (filter === 'custom') return false;

  return true;
}

function matchesRecurringOnDate(event: EventItem, targetDate: Date) {
  const start = getNestedDate(event.raw, 'startDate');
  const end = getNestedDate(event.raw, 'endDate');
  const weekdays = getWeekdays(event.raw);
  if (!start || !end || weekdays.size === 0) return false;

  const day = dateOnly(targetDate);
  if (day < dateOnly(start) || day > dateOnly(end)) return false;
  return weekdays.has(day.getDay() === 0 ? 7 : day.getDay());
}

function matchesRecurringInRange(event: EventItem, from: Date, to: Date) {
  let cursor = dateOnly(from);
  const last = dateOnly(to);

  while (cursor <= last) {
    if (matchesRecurringOnDate(event, cursor)) return true;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  return false;
}

function matchesDateFilter(event: EventItem, filter: DateFilter, customDate: Date | null) {
  const now = new Date();
  const today = dateOnly(now);

  if (event.eventMode === 'recurring') {
    const recurrenceEnd = getNestedDate(event.raw, 'endDate');
    if (filter === 'any') return recurrenceEnd ? dateOnly(recurrenceEnd) >= today : false;
    if (filter === 'today') return matchesRecurringOnDate(event, today);
    if (filter === 'tomorrow') {
      return matchesRecurringOnDate(
        event,
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      );
    }
    if (filter === 'week') {
      return matchesRecurringInRange(
        event,
        today,
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)
      );
    }
    if (filter === 'custom') {
      return customDate ? matchesRecurringOnDate(event, customDate) : false;
    }
    return true;
  }

  return matchesSingleDateFilter(event.date, filter, customDate);
}

function normalizeEvent(id: string, data: Record<string, unknown>): EventItem | null {
  const locationValue =
    data.location && typeof data.location === 'object'
      ? (data.location as {lat?: unknown; lng?: unknown})
      : null;

  const lat =
    typeof data.lat === 'number'
      ? data.lat
      : typeof locationValue?.lat === 'number'
        ? (locationValue.lat as number)
        : null;

  const lng =
    typeof data.lng === 'number'
      ? data.lng
      : typeof locationValue?.lng === 'number'
        ? (locationValue.lng as number)
        : null;

  if (lat === null || lng === null) return null;

  const rawType = String(data.type ?? 'other');
  const normalizedType: EventType = EVENT_TYPES.includes(rawType as EventType)
    ? (rawType as EventType)
    : 'other';
  const eventMode = String(data.eventMode ?? 'single') === 'recurring' ? 'recurring' : 'single';
  const priceFrom = typeof data.priceFrom === 'number' ? data.priceFrom : null;

  return {
    id,
    title: String(data.title ?? ''),
    locationText:
      typeof data.location === 'string'
        ? data.location
        : String(data.address ?? data.place ?? ''),
    imageUrl: String(data.imageUrl ?? ''),
    type: normalizedType,
    visibility: String(data.visibility ?? 'public'),
    createdBy: String(data.createdBy ?? ''),
    creatorUsername: String(data.creatorUsername ?? ''),
    eventMode,
    isFree: isFreeEvent(data),
    priceFrom,
    time: data.time ? String(data.time) : '',
    timeStart: data.timeStart ? String(data.timeStart) : '',
    timeEnd: data.timeEnd ? String(data.timeEnd) : '',
    lat,
    lng,
    date: toDateSafe(data.date),
    raw: data
  };
}

function getTimeRange(event: EventItem) {
  const timeStart = event.timeStart?.trim() ?? '';
  const timeEnd = event.timeEnd?.trim() ?? '';
  const legacyTime = event.time?.trim() ?? '';
  const hhmm = /^\d{2}:\d{2}$/;

  if (hhmm.test(timeStart) && hhmm.test(timeEnd)) {
    return `${timeStart} – ${timeEnd}`;
  }

  if (legacyTime) return legacyTime;
  return '';
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function FilterSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/10 bg-[#0F0F17] p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {children}
    </section>
  );
}

function FilterChip({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'border-[#9B87F5] bg-[#9B87F5]/15 text-white shadow-[0_8px_20px_rgba(124,94,255,0.18)]'
          : 'border-white/10 bg-[#171726] text-[#CFC9E6] hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

export default function MapPage() {
  const t = useTranslations('mapPage');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const dbRef = useRef<ReturnType<typeof getFirebaseDb> | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const autocompleteRequestIdRef = useRef(0);

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventType[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [customDate, setCustomDate] = useState<string>('');
  const [eventModeFilter, setEventModeFilter] = useState<EventModeFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<SuggestionItem[]>([]);

  const {isLoaded, loadError} = useJsApiLoader({
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const formatDate = useCallback(
    (date: Date | null) => {
      if (!date) return '';
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    },
    [locale]
  );

  const activeFilterCount =
    selectedCategories.length +
    (dateFilter === 'any' ? 0 : 1) +
    (eventModeFilter === 'all' ? 0 : 1) +
    (priceFilter === 'all' ? 0 : 1);

  const toggleCategory = useCallback((category: EventType) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }, []);

  const filteredEvents = useMemo(() => {
    const customDateValue = customDate ? new Date(`${customDate}T00:00:00`) : null;

    return events.filter((event) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.type)) {
        return false;
      }

      if (eventModeFilter !== 'all' && event.eventMode !== eventModeFilter) {
        return false;
      }

      if (priceFilter === 'free' && !event.isFree) return false;
      if (priceFilter === 'paid' && event.isFree) return false;

      if (!matchesDateFilter(event, dateFilter, customDateValue)) {
        return false;
      }

      return true;
    });
  }, [events, customDate, dateFilter, eventModeFilter, priceFilter, selectedCategories]);

  const eventSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];

    const out: SuggestionItem[] = [];
    const seen = new Set<string>();

    for (const event of filteredEvents) {
      const haystack = [event.title, event.locationText, event.creatorUsername]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) continue;

      const key = `${event.lat}:${event.lng}:${event.locationText}:${event.title}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: event.id,
        label: event.locationText || event.title,
        secondary: event.locationText ? event.title : event.creatorUsername,
        lat: event.lat,
        lng: event.lng,
        source: 'event'
      });

      if (out.length >= 6) break;
    }

    return out;
  }, [filteredEvents, searchTerm]);

  const searchSuggestions = useMemo(() => {
    const merged: SuggestionItem[] = [];
    const seen = new Set<string>();

    for (const item of [...eventSuggestions, ...placeSuggestions]) {
      const key = item.placeId
        ? `place:${item.placeId}`
        : `event:${item.id}:${item.lat}:${item.lng}:${item.label}`;

      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);

      if (merged.length >= 8) break;
    }

    return merged;
  }, [eventSuggestions, placeSuggestions]);

  const getTypeLabel = useCallback(
    (type: EventType) => {
      return t(`categories.${type}`);
    },
    [t]
  );

  const focusMapLocation = useCallback((lat: number, lng: number, zoom = 13) => {
    const nextCenter = {lat, lng};
    setCenter(nextCenter);
    mapRef.current?.panTo(nextCenter);
    mapRef.current?.setZoom(zoom);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const db = dbRef.current ?? getFirebaseDb();
      dbRef.current = db;

      const now = new Date();
      const q = query(collection(db, 'events'), where('visibility', '==', 'public'));

      const snap = await getDocs(q);

      const items = snap.docs
        .map((doc) => normalizeEvent(doc.id, doc.data() as Record<string, unknown>))
        .filter((item): item is EventItem => item !== null)
        .filter((item) => {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return (
            matchesDateFilter(item, 'any', null) ||
            Boolean(item.date && dateOnly(item.date) >= today)
          );
        })
        .sort((a, b) => {
          const aDate = a.date ?? getNestedDate(a.raw, 'startDate');
          const bDate = b.date ?? getNestedDate(b.raw, 'startDate');
          return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
        });

      setEvents(items);
    } catch (e) {
      console.error(e);
      setError(t('errors.firestore'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return;

    const q = searchTerm.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }

    const requestId = ++autocompleteRequestIdRef.current;

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: q,
        componentRestrictions: {country: 'cz'}
      },
      (predictions, status) => {
        if (requestId !== autocompleteRequestIdRef.current) return;

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.length
        ) {
          setPlaceSuggestions([]);
          return;
        }

        const items: SuggestionItem[] = predictions.slice(0, 6).map((prediction) => ({
          id: prediction.place_id,
          placeId: prediction.place_id,
          label:
            prediction.structured_formatting?.main_text ||
            prediction.description,
          secondary:
            prediction.structured_formatting?.secondary_text ||
            prediction.description,
          source: 'place'
        }));

        setPlaceSuggestions(items);
      }
    );
  }, [isLoaded, searchTerm]);

  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (window.google?.maps?.places) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }
  }, []);

  const requestMyLocation = useCallback(() => {
    setIsLocationPromptOpen(true);
  }, []);

  const confirmMyLocation = useCallback(() => {
    setIsLocationPromptOpen(false);

    if (!navigator.geolocation) {
      setError(t('errors.locationUnavailable'));
      return;
    }

    setLocationLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCenter = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        setCenter(nextCenter);
        mapRef.current?.panTo(nextCenter);
        mapRef.current?.setZoom(14);
        setLocationLoading(false);
      },
      (geoError) => {
        setLocationLoading(false);
        setError(t('errors.locationDenied'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [t]);

  const selectSuggestion = useCallback(
    (suggestion: SuggestionItem) => {
      setSearchTerm(suggestion.label);
      setShowSuggestions(false);

      if (
        suggestion.source === 'event' &&
        typeof suggestion.lat === 'number' &&
        typeof suggestion.lng === 'number'
      ) {
        focusMapLocation(suggestion.lat, suggestion.lng, 14);

        const match = filteredEvents.find((event) => event.id === suggestion.id);
        if (match) {
          setSelectedEvent(match);
        }
        return;
      }

      setSelectedEvent(null);

      if (
        suggestion.source === 'place' &&
        suggestion.placeId &&
        placesServiceRef.current
      ) {
        placesServiceRef.current.getDetails(
          {
            placeId: suggestion.placeId,
            fields: ['geometry', 'name', 'formatted_address']
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place?.geometry?.location
            ) {
              focusMapLocation(
                place.geometry.location.lat(),
                place.geometry.location.lng(),
                14
              );
            } else {
              setError(t('errors.placeNotFound'));
            }
          }
        );
      }
    },
    [filteredEvents, focusMapLocation, t]
  );

  const handleSearchSubmit = useCallback(() => {
    const queryValue = searchTerm.trim();
    if (!queryValue) return;

    const directMatch = searchSuggestions[0];
    if (directMatch) {
      selectSuggestion(directMatch);
      return;
    }

    setError(t('errors.placeNotFound'));
  }, [searchSuggestions, searchTerm, selectSuggestion, t]);

  const changeLocale = useCallback(
    (nextLocale: string) => {
      const segments = pathname.split('/').filter(Boolean);
      const rest = segments.slice(1);
      const newPath = `/${nextLocale}${rest.length ? `/${rest.join('/')}` : ''}`;

      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        window.location.href = `${newPath}${hash}`;
      }
    },
    [pathname]
  );

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#0F0F17] text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="rounded-[28px] border border-red-400/20 bg-[#171726] p-6">
            {t('errors.googleMaps')}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F0F17] text-[#F5F3FF]">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0F0F17]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/${locale}`}
              aria-label={t('back')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#171726] text-white transition hover:border-[#9B87F5]/50 hover:bg-white/5"
            >
              <ArrowLeftIcon />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-white md:text-2xl">
                {t('title')}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
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
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl flex-col px-4 py-4 sm:px-6">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[#171726] shadow-[0_16px_50px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(15,15,23,0.18),transparent)] pointer-events-none" />
          <div className="absolute -left-16 top-10 z-0 h-44 w-44 rounded-full bg-[#9B87F5]/12 blur-3xl pointer-events-none" />
          <div className="absolute -right-16 bottom-12 z-0 h-44 w-44 rounded-full bg-[#7C5EFF]/10 blur-3xl pointer-events-none" />

          <div className="absolute left-4 right-4 top-4 z-30 md:left-6 md:right-6">
            <div className="rounded-[28px] border border-white/10 bg-[#171726]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="relative flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <div className="group flex h-14 items-center rounded-[22px] border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,rgba(183,156,255,0.14),rgba(255,255,255,0.03))] px-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_12px_32px_rgba(0,0,0,0.28)] transition focus-within:border-[#B79CFF]/80 focus-within:shadow-[0_0_0_1px_rgba(183,156,255,0.25)_inset,0_0_22px_rgba(155,135,245,0.16),0_16px_36px_rgba(0,0,0,0.34)]">
                    <span className="mr-3 shrink-0 text-[#C9BCFF]">
                      <SearchIcon />
                    </span>

                    <input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                        setError('');
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setShowSuggestions(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      placeholder={t('searchPlaceholder')}
                      className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-[#A8A0C4] sm:text-[0.96rem]"
                    />
                  </div>

                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-[62px] z-40 overflow-hidden rounded-2xl border border-white/10 bg-[#171726] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.source}-${suggestion.id}-${suggestion.placeId ?? ''}`}
                          type="button"
                          onClick={() => selectSuggestion(suggestion)}
                          className="flex w-full flex-col px-4 py-3 text-left transition hover:bg-white/5"
                        >
                          <span className="text-sm font-semibold text-white">
                            {suggestion.label}
                          </span>
                          {suggestion.secondary ? (
                            <span className="mt-1 text-xs text-[#CFC9E6]">
                              {suggestion.secondary}
                            </span>
                          ) : null}
                          <span className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#B79CFF]">
                            {suggestion.source === 'event' ? 'Event' : 'Místo'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  aria-label={t('filters.open')}
                  className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] text-white shadow-[0_10px_24px_rgba(124,94,255,0.34),0_2px_0_rgba(255,255,255,0.16)_inset,0_-8px_18px_rgba(76,34,171,0.24)_inset] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(124,94,255,0.44),0_2px_0_rgba(255,255,255,0.2)_inset,0_-10px_22px_rgba(76,34,171,0.28)_inset]"
                >
                  <FilterIcon />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-[#7357E8]">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          {!isLoaded ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="mt-4 text-sm text-[#CFC9E6]">{t('loadingMap')}</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              onLoad={onMapLoad}
              options={mapOptions}
              onClick={() => {
                setSelectedEvent(null);
                setShowSuggestions(false);
              }}
            >
              {filteredEvents.map((event) => (
                <Marker
                  key={event.id}
                  position={{lat: event.lat, lng: event.lng}}
                  title={event.title}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
            </GoogleMap>
          )}

          <button
            type="button"
            onClick={requestMyLocation}
            className="absolute bottom-4 right-4 z-20 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,94,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(124,94,255,0.42)]"
          >
            <LocationIcon />
            {t('myLocation')}
          </button>

          {(loading || locationLoading) && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#0F0F17]/40 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-white/10 bg-[#171726]/95 px-5 py-4 text-sm text-[#F5F3FF] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                {loading ? t('loadingData') : t('loadingLocation')}
              </div>
            </div>
          )}

          {selectedEvent && (
            <div className="absolute bottom-4 left-4 right-4 z-30 md:left-6 md:right-auto md:w-[430px]">
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#171726]/95 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur">
                <div className="flex items-start gap-4 p-4">
                  <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-[#0F0F17]">
                    {selectedEvent.imageUrl ? (
                      <img
                        src={selectedEvent.imageUrl}
                        alt={selectedEvent.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-[#CFC9E6]">
                        {t('noImage')}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold">
                      {selectedEvent.title}
                    </h2>

                    {selectedEvent.locationText ? (
                      <p className="mt-1 truncate text-sm text-[#CFC9E6]">
                        {selectedEvent.locationText}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-[#CFC9E6]">
                      {[formatDate(selectedEvent.date), getTimeRange(selectedEvent)]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>

                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#B79CFF]">
                      {getTypeLabel(selectedEvent.type)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    aria-label={t('close')}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/80 transition hover:bg-white/10"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="border-t border-white/10 p-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/event/${selectedEvent.id}`)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[18px] border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] px-6 py-3 text-center text-[1rem] font-semibold text-white shadow-[0_10px_24px_rgba(124,94,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(124,94,255,0.46)]"
                  >
                    {t('detail')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && filteredEvents.length === 0 && (
            <div className="pointer-events-none absolute left-4 top-28 z-20 rounded-2xl border border-white/10 bg-[#171726]/95 px-4 py-3 text-sm text-[#CFC9E6] shadow-[0_12px_40px_rgba(0,0,0,0.35)] md:top-24">
              {t('empty')}
            </div>
          )}
        </div>
      </section>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 md:items-center">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#171726] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{t('filters.title')}</h2>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                aria-label={t('close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
              <FilterSection title={t('filters.categoriesTitle')}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {EVENT_TYPES.map((category) => (
                    <FilterChip
                      key={category}
                      active={selectedCategories.includes(category)}
                      onClick={() => toggleCategory(category)}
                    >
                      {t(`categories.${category}`)}
                    </FilterChip>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title={t('filters.eventModeTitle')}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(['all', 'single', 'recurring'] as const).map((item) => (
                    <FilterChip
                      key={item}
                      active={eventModeFilter === item}
                      onClick={() => setEventModeFilter(item)}
                    >
                      {t(`eventModeFilters.${item}`)}
                    </FilterChip>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title={t('filters.priceTitle')}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(['all', 'free', 'paid'] as const).map((item) => (
                    <FilterChip
                      key={item}
                      active={priceFilter === item}
                      onClick={() => setPriceFilter(item)}
                    >
                      {t(`priceFilters.${item}`)}
                    </FilterChip>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title={t('filters.dateTitle')}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(['any', 'today', 'tomorrow', 'week', 'custom'] as const).map((item) => (
                    <FilterChip
                      key={item}
                      active={dateFilter === item}
                      onClick={() => {
                        setDateFilter(item);
                        if (item === 'custom' && !customDate) {
                          setCustomDate(new Date().toISOString().slice(0, 10));
                        }
                      }}
                    >
                      {t(`dateFilters.${item}`)}
                    </FilterChip>
                  ))}
                </div>

                {dateFilter === 'custom' ? (
                  <label className="mt-3 block">
                    <span className="sr-only">{t('dateFilters.custom')}</span>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#171726] px-4 text-sm font-semibold text-white outline-none transition [color-scheme:dark] hover:border-[#9B87F5]/50 focus:border-[#9B87F5]"
                    />
                  </label>
                ) : null}
              </FilterSection>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    setDateFilter('any');
                    setCustomDate('');
                    setEventModeFilter('all');
                    setPriceFilter('all');
                  }}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0F0F17] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  {t('filters.reset')}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,94,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(124,94,255,0.42)]"
                >
                  {t('filters.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLocationPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-4 md:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#171726] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">{t('locationPrompt.title')}</h2>
              <button
                type="button"
                onClick={() => setIsLocationPromptOpen(false)}
                aria-label={t('close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="text-sm leading-6 text-[#CFC9E6]">
              {t('locationPrompt.description')}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsLocationPromptOpen(false)}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0F0F17] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                {t('locationPrompt.cancel')}
              </button>

              <button
                type="button"
                onClick={confirmMyLocation}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-[#CDBBFF]/20 bg-[linear-gradient(180deg,#B79CFF_0%,#9B87F5_45%,#8468F4_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,94,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(124,94,255,0.42)]"
              >
                {t('locationPrompt.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
