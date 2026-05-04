'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useState, useRef, useEffect } from 'react';

const PROPERTY_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL',  label: 'Commercial' },
  { value: 'LAND',        label: 'Land / Plot' },
  { value: 'MIXED_USE',   label: 'Mixed Use' },
];

const SORT_OPTIONS = [
  { value: 'publishedAt:desc', label: 'Newest First' },
  { value: 'publishedAt:asc',  label: 'Oldest First' },
  { value: 'hotScore:desc',    label: 'Hot / Trending' },
  { value: 'ticketPrice:asc',  label: 'Price: Low to High' },
  { value: 'ticketPrice:desc', label: 'Price: High to Low' },
  { value: 'drawDate:asc',     label: 'Draw Date: Soonest' },
  { value: 'drawDate:desc',    label: 'Draw Date: Latest' },
  { value: 'closingSoon',      label: 'Closing Soon' },
];

interface Props {
  states: string[];
  activeTab: string;
  initialState?: string | undefined;
  initialPropertyType?: string | undefined;
  initialSearch?: string | undefined;
  initialSort: string;
  hasFilters: boolean;
}

export function CampaignsFilters({
  states, activeTab,
  initialState, initialPropertyType, initialSearch, initialSort,
  hasFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Controlled values — kept in sync with URL via effect
  const [search, setSearch]   = useState(initialSearch ?? '');
  const [state, setState]     = useState(initialState ?? '');
  const [propType, setPropType] = useState(initialPropertyType ?? '');
  const [sort, setSort]       = useState(initialSort);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync local state when URL changes (back/forward navigation)
  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setState(searchParams.get('state') ?? '');
    setPropType(searchParams.get('propertyType') ?? '');
    setSort(searchParams.get('sort') ?? 'publishedAt:desc');
  }, [searchParams]);

  const push = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === '') params.delete(k);
      else params.set(k, v);
    });
    params.delete('page');
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      push({ search: value || undefined });
    }, 400);
  };

  const clearAll = () => {
    setSearch(''); setState(''); setPropType(''); setSort('publishedAt:desc');
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      ['search', 'state', 'propertyType', 'sort', 'page'].forEach((k) => params.delete(k));
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  if (activeTab === 'past') return null;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="campaigns-filter-toggle btn btn-outline btn-sm"
        onClick={() => setMobileOpen((p) => !p)}
        aria-expanded={mobileOpen ? 'true' : 'false'}
        aria-controls="campaigns-filter-bar"
      >
        <i className="fa-solid fa-sliders" style={{ marginRight: '0.375rem' }} aria-hidden="true" />
        {mobileOpen ? 'Hide Filters' : 'Filters'}
        {hasFilters && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green-primary)', display: 'inline-block',
            marginLeft: '0.375rem', flexShrink: 0,
          }} aria-label="Filters active" />
        )}
      </button>

      {/* Filter bar */}
      <div
        id="campaigns-filter-bar"
        className={`campaigns-filter-bar${mobileOpen ? ' is-open' : ''}`}
        style={{ opacity: isPending ? 0.55 : 1 }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by title or location…"
          className="form-input"
          style={{ flex: '1 1 200px', minWidth: 0 }}
          aria-label="Search campaigns"
        />
        <select
          value={state}
          onChange={(e) => { setState(e.target.value); push({ state: e.target.value || undefined }); }}
          className="form-select"
          style={{ flex: '0 1 160px', minWidth: 130 }}
          aria-label="Filter by state"
        >
          <option value="">All States</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={propType}
          onChange={(e) => { setPropType(e.target.value); push({ propertyType: e.target.value || undefined }); }}
          className="form-select"
          style={{ flex: '0 1 180px', minWidth: 150 }}
          aria-label="Filter by property type"
        >
          <option value="">All Property Types</option>
          {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); push({ sort: e.target.value === 'publishedAt:desc' ? undefined : e.target.value }); }}
          className="form-select"
          style={{ flex: '0 1 200px', minWidth: 160 }}
          aria-label="Sort campaigns"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && (
          <button type="button" className="btn btn-outline btn-sm" onClick={clearAll} aria-label="Clear all filters">
            <i className="fa-solid fa-xmark" style={{ marginRight: '0.375rem' }} aria-hidden="true" />
            Clear
          </button>
        )}
        {isPending && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }} aria-live="polite">
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
            Updating…
          </span>
        )}
      </div>
    </>
  );
}
