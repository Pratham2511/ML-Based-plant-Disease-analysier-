import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';

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
  const [detectedDistrict, setDetectedDistrict] = useState('');
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [cacheNotice, setCacheNotice] = useState('');

  const effectiveDistrict = useMemo(() => String(district || detectedDistrict || '').trim(), [district, detectedDistrict]);
  const key = useMemo(() => `shetvaidya_weather_${effectiveDistrict || 'unknown'}`, [effectiveDistrict]);
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

  const advisory = useMemo(() => getFarmingAdvisory(forecast, t), [forecast, t]);

  const handleLocationSuccess = async (latitude: number, longitude: number) => {
    try {
      const response = await api.post('/area-intelligence/detect-district', {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
      });
      const resolvedDistrict = String(response.data?.district || '').trim();
      if (resolvedDistrict) {
        setDetectedDistrict(resolvedDistrict);
      }
    } catch {
      // Keep existing district fallback if auto detect API fails.
    }
  };

  const handleLocationError = () => {
    // Preserve existing district-driven flow; this only affects auto-detection fallback.
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSuccess(latitude, longitude);
      },
      (geoError) => {
        console.warn('Location permission denied or unavailable:', geoError.message);
        handleLocationError();
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const fetchWeather = async (forceRefresh = false) => {
    if (!effectiveDistrict) return;

    if (!API_KEY) {
      console.error('VITE_OPENWEATHER_API_KEY is not set');
      setError(t('weather.error'));
      return;
    }

    if (!forceRefresh) {
      const cacheRaw = localStorage.getItem(key);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw) as CachedWeatherPayload;
          const age = Date.now() - Number(parsed.updatedAt || 0);
          if (age <= THREE_HOURS_MS && Array.isArray(parsed.forecast) && parsed.forecast.length > 0) {
            setForecast(parsed.forecast);
            setLastUpdated(parsed.updatedAt || null);
            setError('');
            setCacheNotice(t('weather.cachedFallback'));
            return;
          }
        } catch {
          // Ignore broken cache and continue with network request.
        }
      }
    }

    setLoading(true);
    setError('');
    setCacheNotice('');

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(effectiveDistrict)},Maharashtra,IN&appid=${API_KEY}&units=metric&cnt=5&lang=en`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather API failed: ${response.status}`);
      const body = await response.json();
      const parsed = parseWeather(body);
      const updatedAt = Date.now();

      setForecast(parsed);
      setLastUpdated(updatedAt);

      const cachePayload: CachedWeatherPayload = {
        updatedAt,
        district: effectiveDistrict,
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
    fetchWeather(false);
  }, [effectiveDistrict]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '';
    return new Date(lastUpdated).toLocaleString(i18n.language);
  }, [lastUpdated, i18n.language]);

  return (
    <section className="card weather-widget">
      <div className="weather-widget__header">
        <h2>🌤 {t('weather.title')} {effectiveDistrict ? `- ${effectiveDistrict} ${t('weather.district')}` : ''}</h2>
        <div className="inline-row">
          <button type="button" className="btn outline btn--compact location-retry-btn" onClick={requestLocationPermission}>
            📍 {t('common.enableLocation')}
          </button>
          <button type="button" className="btn outline btn--compact" onClick={() => fetchWeather(true)} disabled={loading || !effectiveDistrict}>
            {t('weather.refresh')} ↻
          </button>
        </div>
      </div>

      {!effectiveDistrict ? <p className="panel-muted">{t('weather.locationPrompt')}</p> : null}

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
