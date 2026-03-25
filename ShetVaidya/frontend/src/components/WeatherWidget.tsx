import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  rainChance: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
}

type WeatherWidgetProps = {
  district: string;
};

type CachedWeatherPayload = {
  updatedAt: number;
  district: string;
  forecast: WeatherDay[];
};

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

const getWeatherEmoji = (iconCode: string): string => {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return map[iconCode] || '🌤️';
};

const getFarmingAdvisory = (forecast: WeatherDay[], t: (key: string) => string): string => {
  if (!forecast.length) return t('weather.advisory.normal');

  const today = forecast[0];
  const tomorrow = forecast[1] || today;
  const next3Days = forecast.slice(0, 3);
  const highHumidityDays = next3Days.filter((d) => d.humidity > 80);

  if (tomorrow.rainChance > 70) return t('weather.advisory.rainTomorrow');
  if (today.rainChance > 70) return t('weather.advisory.rainingToday');
  if (highHumidityDays.length >= 2) return t('weather.advisory.highHumidity');
  if (today.tempMax > 38) return t('weather.advisory.heatwave');
  if (today.tempMin < 10) return t('weather.advisory.frost');
  if (next3Days.length > 0 && next3Days.every((d) => d.rainChance < 20)) return t('weather.advisory.clearWeather');
  return t('weather.advisory.normal');
};

const parseWeather = (payload: any): WeatherDay[] => {
  const rows = Array.isArray(payload?.list) ? payload.list : [];
  return rows.slice(0, 5).map((item: any) => ({
    date: String(item?.dt_txt || ''),
    tempMin: Number(item?.main?.temp_min || 0),
    tempMax: Number(item?.main?.temp_max || 0),
    rainChance: Number(item?.pop || 0) * 100,
    humidity: Number(item?.main?.humidity || 0),
    description: String(item?.weather?.[0]?.description || ''),
    icon: getWeatherEmoji(String(item?.weather?.[0]?.icon || '')),
    windSpeed: Number(item?.wind?.speed || 0),
  }));
};

const labelForDay = (index: number, dateText: string, t: (key: string) => string, language: string) => {
  if (index === 0) return t('weather.today');
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return `D${index + 1}`;
  return parsed.toLocaleDateString(language, { weekday: 'short' });
};

const WeatherWidget = ({ district }: WeatherWidgetProps) => {
  const { t, i18n } = useTranslation();
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [cacheNotice, setCacheNotice] = useState('');

  const key = useMemo(() => `shetvaidya_weather_${district}`, [district]);

  const advisory = useMemo(() => getFarmingAdvisory(forecast, t), [forecast, t]);

  const fetchWeather = async () => {
    if (!district) return;

    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      setError(t('weather.error'));
      return;
    }

    setLoading(true);
    setError('');
    setCacheNotice('');

    try {
      const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
      url.searchParams.set('q', `${district},Maharashtra,IN`);
      url.searchParams.set('appid', apiKey);
      url.searchParams.set('units', 'metric');
      url.searchParams.set('cnt', '5');
      url.searchParams.set('lang', 'en');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Weather API failed: ${response.status}`);
      const body = await response.json();
      const parsed = parseWeather(body);
      const updatedAt = Date.now();

      setForecast(parsed);
      setLastUpdated(updatedAt);

      const cachePayload: CachedWeatherPayload = {
        updatedAt,
        district,
        forecast: parsed,
      };
      localStorage.setItem(key, JSON.stringify(cachePayload));
    } catch {
      const cacheRaw = localStorage.getItem(key);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw) as CachedWeatherPayload;
          const age = Date.now() - Number(parsed.updatedAt || 0);
          setForecast(parsed.forecast || []);
          setLastUpdated(parsed.updatedAt || null);
          setCacheNotice(t('weather.cachedFallback'));
          if (age > THREE_HOURS_MS) {
            const hours = Math.max(1, Math.floor(age / (60 * 60 * 1000)));
            setCacheNotice(`${t('weather.cachedFallback')} ${t('weather.lastUpdatedHoursAgo', { hours })}`);
          }
        } catch {
          setError(t('weather.error'));
        }
      } else {
        setError(t('weather.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [district]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '';
    return new Date(lastUpdated).toLocaleString(i18n.language);
  }, [lastUpdated, i18n.language]);

  return (
    <section className="card weather-widget">
      <div className="weather-widget__header">
        <h2>🌤 {t('weather.title')} - {district} {t('weather.district')}</h2>
        <button type="button" className="btn outline btn--compact" onClick={fetchWeather} disabled={loading}>
          {t('weather.refresh')} ↻
        </button>
      </div>

      {loading ? <p className="panel-muted">{t('weather.loading')}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {cacheNotice ? <p className="panel-muted">{cacheNotice}</p> : null}
      {lastUpdatedLabel ? <p className="panel-muted">{t('mandi.lastUpdated')}: {lastUpdatedLabel}</p> : null}

      <div className="weather-widget__days" role="list">
        {forecast.map((day, index) => (
          <article className="weather-day-card" role="listitem" key={`${day.date}-${index}`}>
            <strong>{labelForDay(index, day.date, t, i18n.language)}</strong>
            <span className="weather-day-card__icon">{day.icon}</span>
            <span>{Math.round(day.tempMax)}°</span>
            <span>{Math.round(day.tempMin)}°</span>
            <span>{t('weather.rainChance')}: {Math.round(day.rainChance)}%</span>
          </article>
        ))}
      </div>

      <p className="weather-widget__advisory">⚠️ {advisory}</p>
    </section>
  );
};

export default WeatherWidget;
