import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MandiRecord {
  commodity: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  date: string;
  pricePerKg: number;
}

type MandiPricesProps = {
  district: string;
  preferredCrop?: string;
};

type CacheShape = {
  updatedAt: number;
  district: string;
  records: MandiRecord[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toMandiDistrict = (district: string): string => {
  return district
    .toUpperCase()
    .replace('MUMBAI CITY', 'MUMBAI')
    .replace('AURANGABAD', 'CHHATRAPATI SAMBHAJINAGAR');
};

const getCommodityEmoji = (commodity: string): string => {
  const map: Record<string, string> = {
    tomato: '🍅',
    onion: '🧅',
    potato: '🥔',
    wheat: '🌾',
    rice: '🍚',
    soybean: '🫘',
    cotton: '🌿',
    sugarcane: '🎋',
    maize: '🌽',
    jowar: '🌾',
    bajra: '🌾',
    turmeric: '🟡',
    chilli: '🌶️',
    garlic: '🧄',
    groundnut: '🥜',
    sunflower: '🌻',
    pomegranate: '🍎',
    grape: '🍇',
    banana: '🍌',
    mango: '🥭',
    orange: '🍊',
  };

  const key = commodity.toLowerCase().trim();
  for (const [name, emoji] of Object.entries(map)) {
    if (key.includes(name)) return emoji;
  }
  return '🌱';
};

const parseRecords = (body: any): MandiRecord[] => {
  const records = Array.isArray(body?.records) ? body.records : [];
  return records
    .map((record: any) => {
      const minPrice = Number(record?.min_price || 0);
      const maxPrice = Number(record?.max_price || 0);
      const modalPrice = Number(record?.modal_price || 0);
      return {
        commodity: String(record?.commodity || ''),
        market: String(record?.market || ''),
        minPrice,
        maxPrice,
        modalPrice,
        date: String(record?.arrival_date || ''),
        pricePerKg: Math.round((modalPrice / 100) * 100) / 100,
      };
    })
    .filter((record: MandiRecord) => record.commodity && record.market);
};

const MandiPrices = ({ district, preferredCrop }: MandiPricesProps) => {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<MandiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const cacheKey = useMemo(() => `shetvaidya_mandi_${district}`, [district]);

  const fetchMandi = async () => {
    const apiKey = import.meta.env.VITE_DATAGOV_API_KEY;
    if (!apiKey || !district) return;

    setLoading(true);
    setError('');

    try {
      const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
      url.searchParams.set('api-key', apiKey);
      url.searchParams.set('format', 'json');
      url.searchParams.set('filters[State]', 'Maharashtra');
      url.searchParams.set('filters[District]', toMandiDistrict(district));
      url.searchParams.set('limit', '20');
      url.searchParams.set('offset', '0');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Mandi API failed');
      const body = await response.json();
      const parsed = parseRecords(body);

      const now = Date.now();
      setRecords(parsed);
      setLastUpdated(now);
      localStorage.setItem(cacheKey, JSON.stringify({ updatedAt: now, district, records: parsed } as CacheShape));
    } catch {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as CacheShape;
          setRecords(Array.isArray(cached.records) ? cached.records : []);
          setLastUpdated(cached.updatedAt || null);
          if (Date.now() - Number(cached.updatedAt || 0) > ONE_DAY_MS) {
            setError(t('mandi.unavailable'));
          }
        } catch {
          setError(t('mandi.unavailable'));
        }
      } else {
        setError(t('mandi.unavailable'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMandi();
  }, [district]);

  const sortedRecords = useMemo(() => {
    const ranked = [...records].sort((a, b) => b.modalPrice - a.modalPrice);

    if (preferredCrop) {
      const preferred = ranked.filter((record) => record.commodity.toLowerCase().includes(preferredCrop.toLowerCase()));
      const others = ranked.filter((record) => !record.commodity.toLowerCase().includes(preferredCrop.toLowerCase()));
      return [...preferred, ...others];
    }

    return ranked;
  }, [records, preferredCrop]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? sortedRecords.filter((record) => record.commodity.toLowerCase().includes(term))
      : sortedRecords;
    return showAll ? base : base.slice(0, 8);
  }, [sortedRecords, search, showAll]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '';
    return new Date(lastUpdated).toLocaleString(i18n.language);
  }, [lastUpdated, i18n.language]);

  return (
    <section className="card mandi-widget">
      <div className="section-title-row">
        <h2>📊 {t('mandi.title')} - {district}</h2>
      </div>

      {lastUpdatedLabel ? (
        <p className="panel-muted">{t('mandi.lastUpdated')}: {lastUpdatedLabel} · {t('mandi.source')}</p>
      ) : null}

      <input
        className="input"
        placeholder={t('mandi.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <p className="panel-muted">{t('mandi.loading')}</p> : null}
      {error ? (
        <p className="form-error">
          {error} {t('mandi.helpline')}
        </p>
      ) : null}

      {!loading && filteredRecords.length === 0 ? <p className="panel-muted">{t('mandi.noData')}</p> : null}

      <div className="mandi-widget__list">
        {filteredRecords.map((record, index) => (
          <article className="mandi-pill" key={`${record.commodity}-${record.market}-${index}`}>
            <strong>{getCommodityEmoji(record.commodity)} {record.commodity}</strong>
            <span>{record.market}</span>
            <span>₹{record.pricePerKg.toFixed(2)}/kg</span>
            <span>₹{(record.minPrice / 100).toFixed(2)} - ₹{(record.maxPrice / 100).toFixed(2)}</span>
          </article>
        ))}
      </div>

      <div className="inline-row">
        <button type="button" className="btn outline" onClick={() => window.open('https://agmarknet.gov.in', '_blank', 'noopener,noreferrer')}>
          {t('mandi.viewAll')}
        </button>
        <button type="button" className="btn ghost" onClick={() => window.open(`https://www.google.com/maps/search/APMC+mandi+${district}+Maharashtra`, '_blank', 'noopener,noreferrer')}>
          {t('mandi.nearbyMandis')}
        </button>
        <button type="button" className="btn ghost" onClick={() => setShowAll((value) => !value)}>
          {showAll ? t('common.close') : t('mandi.viewAll')}
        </button>
      </div>
    </section>
  );
};

export default MandiPrices;
