import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';
import { formatLocalizedDateTime, formatLocalizedNumber, localizeAgricultureText, localizeNumericText } from '../utils/localization';
import { localizeModelAdvice, localizeModelClassLabel, resolveModelClassKey } from '../utils/mlLocalization';

type PredictionSummary = {
  raw_class?: string;
  disease_name: string;
  confidence: number;
};

type HistoryItem = {
  id: string;
  disease_name: string;
  confidence: number;
  image_url: string;
  timestamp: string;
  analysis_json?: {
    raw_class?: string;
    description?: string;
    cause?: string;
    treatment?: string;
    recommended_medicines?: string[];
    crop_type?: string;
    top_predictions?: PredictionSummary[];
  };
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ScanHistory = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/scans`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((body as any)?.detail || t('history.errors.fetchFailed'));
        }
        setItems((body as any).items || []);
        setError('');
      })
      .catch((err) => {
        setError(err?.message || t('history.errors.fetchFailed'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="card">
        <LeafLoader variant="panel" label={t('history.loading')} />
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const searchHit = item.disease_name.toLowerCase().includes(query.trim().toLowerCase());
    const confidenceHit = item.confidence * 100 >= minConfidence;
    return searchHit && confidenceHit;
  });

  const averageConfidence = filteredItems.length
    ? filteredItems.reduce((acc, item) => acc + item.confidence, 0) / filteredItems.length
    : 0;

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const historyNarration = [
    t('history.title'),
    localizeNumericText(t('history.totalScans', { count: filteredItems.length }), language),
    `${t('history.averageConfidence')}: ${formatLocalizedNumber(averageConfidence * 100, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
  ].join(' ');

  const localizeDisease = (rawDisease: string, rawClass?: string) => {
    const classKey = resolveModelClassKey(rawClass, rawDisease);
    return localizeModelClassLabel(t, classKey, localizeAgricultureText(rawDisease.replaceAll('_', ' '), language));
  };

  const localizeAdvice = (
    item: HistoryItem,
    field: 'description' | 'cause' | 'treatment',
    fallbackValue: string
  ) => {
    const classKey = resolveModelClassKey(item.analysis_json?.raw_class, item.disease_name);
    return localizeModelAdvice(t, classKey, field, localizeAgricultureText(fallbackValue, language));
  };

  return (
    <div className="history-layout">
      <section className="card history-hero">
        <div className="section-title-row">
          <div>
            <p className="subtitle">{t('history.subtitle')}</p>
            <h1 className="headline">{t('history.title')}</h1>
            <p className="lead">{t('history.lead')}</p>
          </div>
          <span className="pill">{localizeNumericText(t('history.totalScans', { count: filteredItems.length }), language)}</span>
        </div>
        <ReadAloudButton text={historyNarration} labelKey="history.readSummary" />
      </section>

      <section className="card history-controls">
        <div className="history-controls__row">
          <div className="history-control">
            <label className="field-label" htmlFor="history-search">{t('history.searchDisease')}</label>
            <input
              id="history-search"
              className="input"
              placeholder={t('history.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="history-control">
            <label className="field-label" htmlFor="history-confidence">
              {localizeNumericText(t('history.minimumConfidence', { value: minConfidence }), language)}
            </label>
            <input
              id="history-confidence"
              className="slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={minConfidence}
              onChange={(event) => setMinConfidence(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="pill-row">
          <span className="pill">{t('history.averageConfidence')}: {formatLocalizedNumber(averageConfidence * 100, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          <span className="pill">{t('history.totalRecordsLoaded')}: {formatLocalizedNumber(items.length, language)}</span>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {filteredItems.length === 0 ? (
        <div className="card empty-state-card">
          <h3>{t('history.emptyTitle')}</h3>
          <p>{t('history.emptyLead')}</p>
        </div>
      ) : (
        <div className="history-timeline history-timeline--cards">
          {filteredItems.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card__header">
                <strong>{localizeDisease(item.disease_name, item.analysis_json?.raw_class)}</strong>
                <span className="pill">{formatLocalizedNumber(item.confidence * 100, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
              </div>

              <div className="history-meta-grid">
                <span className="label-muted">{t('history.capturedAt')}: {formatLocalizedDateTime(item.timestamp, language)}</span>
                <span className="label-muted">{t('history.cropType')}: {localizeAgricultureText(item.analysis_json?.crop_type || t('dashboard.notAvailable'), language)}</span>
              </div>

              <a href={item.image_url} target="_blank" rel="noreferrer" className="history-link">
                {t('history.viewImage')}
              </a>

              {item.analysis_json?.description && (
                <div className="history-description">
                  <span className="label-muted">{t('history.description')}:</span>
                  <span>{localizeAdvice(item, 'description', item.analysis_json.description)}</span>
                </div>
              )}

              <div className="inline-row">
                <button className="btn outline btn--compact" type="button" onClick={() => toggleCard(item.id)}>
                  {expandedCards[item.id] ? t('history.hideDetails') : t('history.showDetails')}
                </button>
                <ReadAloudButton
                  text={[
                    `${localizeDisease(item.disease_name, item.analysis_json?.raw_class)}`,
                    `${t('history.capturedAt')}: ${formatLocalizedDateTime(item.timestamp, language)}`,
                    `${t('history.cause')}: ${localizeAdvice(item, 'cause', item.analysis_json?.cause || t('dashboard.notAvailable'))}`,
                    `${t('history.treatment')}: ${localizeAdvice(item, 'treatment', item.analysis_json?.treatment || t('dashboard.notAvailable'))}`,
                    `${t('history.description')}: ${localizeAdvice(item, 'description', item.analysis_json?.description || t('dashboard.notAvailable'))}`,
                    `${t('dashboard.analyzer.recommendedMedicines')}: ${(item.analysis_json?.recommended_medicines || []).map((medicine) => localizeAgricultureText(medicine, language)).join(', ') || t('history.noMedicineRecommendations')}`,
                  ].join('. ')}
                  labelKey="history.readEntry"
                />
              </div>

              {expandedCards[item.id] && (
                <div className="history-details-panel">
                  <div className="table-like">
                    <span className="label-muted">{t('history.cause')}</span>
                    <span>{localizeAdvice(item, 'cause', item.analysis_json?.cause || t('dashboard.notAvailable'))}</span>
                    <span className="label-muted">{t('history.treatment')}</span>
                    <span>{localizeAdvice(item, 'treatment', item.analysis_json?.treatment || t('dashboard.notAvailable'))}</span>
                    <span className="label-muted">{t('history.description')}</span>
                    <span>{localizeAdvice(item, 'description', item.analysis_json?.description || t('dashboard.notAvailable'))}</span>
                  </div>

                  <div className="pill-row">
                    {(item.analysis_json?.recommended_medicines || []).length > 0 ? (
                      (item.analysis_json?.recommended_medicines || []).map((medicine) => (
                        <span className="pill" key={`${item.id}-${medicine}`}>
                          {localizeAgricultureText(medicine, language)}
                        </span>
                      ))
                    ) : (
                      <span className="pill">{t('history.noMedicineRecommendations')}</span>
                    )}
                  </div>

                  {(item.analysis_json?.top_predictions || []).length > 0 && (
                    <div className="history-top-predictions">
                      <span className="label-muted">{t('history.topPredictions')}</span>
                      {(item.analysis_json?.top_predictions || []).map((prediction) => (
                        <span className="pill" key={`${item.id}-${prediction.disease_name}`}>
                          {localizeDisease(prediction.disease_name, prediction.raw_class)} {formatLocalizedNumber(prediction.confidence * 100, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanHistory;
