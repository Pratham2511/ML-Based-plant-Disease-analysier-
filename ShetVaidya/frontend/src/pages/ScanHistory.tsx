import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';
import { formatLocalizedDateTime, formatLocalizedNumber, localizeAgricultureText, localizeNumericText } from '../utils/localization';
import { localizeModelAdvice, localizeModelClassLabel, resolveModelClassKey } from '../utils/mlLocalization';
import { mergeScanHistory, readLocalScanHistory, writeLocalScanHistory, type ScanHistoryItem } from '../utils/localScanHistory';
import { useFarmContext } from '../context/FarmContext';
import api from '../lib/api';

const ScanHistory = () => {
  const { t, i18n } = useTranslation();
  const { farms } = useFarmContext();
  const language = i18n.language;

  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [farmFilter, setFarmFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);

  useEffect(() => {
    let active = true;
    const localItems = readLocalScanHistory();
    if (localItems.length) {
      setItems(localItems);
    }

    setLoading(true);
    api
      .get('/scans')
      .then((response) => {
        const body = response?.data || {};
        const remoteItems = Array.isArray((body as any).items) ? ((body as any).items as ScanHistoryItem[]) : [];
        const mergedItems = mergeScanHistory(remoteItems, localItems);

        if (!active) return;
        setItems(mergedItems);
        writeLocalScanHistory(mergedItems);
        setError(remoteItems.length === 0 && localItems.length > 0 ? t('history.errors.fetchFailed') : '');
      })
      .catch((err) => {
        const message = err?.response?.data?.detail || err?.message || t('history.errors.fetchFailed');
        if (!active) return;
        if (localItems.length > 0) {
          setItems(localItems);
          setError(t('history.errors.fetchFailed'));
          return;
        }
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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
    const farmHit = farmFilter === 'all' ? true : item.farm_id === farmFilter;
    return searchHit && farmHit;
  });

  const averageConfidence = filteredItems.length
    ? filteredItems.reduce((acc, item) => acc + item.confidence, 0) / filteredItems.length
    : 0;

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
    item: ScanHistoryItem,
    field: 'description' | 'cause' | 'treatment',
    fallbackValue: string
  ) => {
    const classKey = resolveModelClassKey(item.analysis_json?.raw_class, item.disease_name);
    return localizeModelAdvice(t, classKey, field, localizeAgricultureText(fallbackValue, language));
  };

  const readAloud = (item: ScanHistoryItem) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const narration = [
      localizeDisease(item.disease_name, item.analysis_json?.raw_class),
      `${t('history.capturedAt')}: ${formatLocalizedDateTime(item.timestamp, language)}`,
      `${t('history.cropType')}: ${localizeAgricultureText(item.analysis_json?.crop_type || t('dashboard.notAvailable'), language)}`,
      `${t('history.cause')}: ${localizeAdvice(item, 'cause', item.analysis_json?.cause || t('dashboard.notAvailable'))}`,
      `${t('history.treatment')}: ${localizeAdvice(item, 'treatment', item.analysis_json?.treatment || t('dashboard.notAvailable'))}`,
      `${t('history.description')}: ${localizeAdvice(item, 'description', item.analysis_json?.description || t('dashboard.notAvailable'))}`,
    ].join('. ');

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = language === 'mr' || language === 'hi' ? language : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const topPredictions = selectedScan?.analysis_json?.top_predictions || [];

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
            <label className="field-label" htmlFor="history-farm-filter">{t('farms.title')}</label>
            <select id="history-farm-filter" className="input" value={farmFilter} onChange={(event) => setFarmFilter(event.target.value)}>
              <option value="all">All Farms</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name} - {farm.crop}</option>
              ))}
            </select>
          </div>

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
        <div className="history-timeline">
          {filteredItems.map((item) => (
            <div
              className="scan-summary-card"
              key={item.id}
              onClick={() => setSelectedScan(item)}
            >
              <div className="scan-summary-top">
                <span className="scan-disease-name">{localizeDisease(item.disease_name, item.analysis_json?.raw_class)}</span>
                <span className="scan-confidence-badge">
                  {formatLocalizedNumber(item.confidence * 100, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </span>
              </div>
              <p className="scan-date">{t('history.capturedAt')}: {formatLocalizedDateTime(item.timestamp, language)}</p>
              <p className="scan-crop">{t('history.cropType')}: {localizeAgricultureText(item.analysis_json?.crop_type || t('dashboard.notAvailable'), language)}</p>
              <button
                type="button"
                className="btn outline btn--compact"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedScan(item);
                }}
              >
                {t('history.showDetails')}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedScan ? (
        <div className="scan-modal-overlay" onClick={() => setSelectedScan(null)}>
          <div className="scan-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="scan-modal-header">
              <h2 className="scan-modal-title">{localizeDisease(selectedScan.disease_name, selectedScan.analysis_json?.raw_class)}</h2>
              <button className="scan-modal-close" type="button" onClick={() => setSelectedScan(null)} aria-label={t('history.hideDetails')}>
                ✕
              </button>
            </div>

            <div className="scan-modal-body">
              <div className="scan-detail-row">
                <span className="scan-detail-label">{t('history.averageConfidence')}</span>
                <span className="scan-detail-value">
                  {formatLocalizedNumber(selectedScan.confidence * 100, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </span>
              </div>

              <div className="scan-detail-row">
                <span className="scan-detail-label">{t('history.capturedAt')}</span>
                <span className="scan-detail-value">{formatLocalizedDateTime(selectedScan.timestamp, language)}</span>
              </div>

              <div className="scan-detail-row">
                <span className="scan-detail-label">{t('history.cropType')}</span>
                <span className="scan-detail-value">{localizeAgricultureText(selectedScan.analysis_json?.crop_type || t('dashboard.notAvailable'), language)}</span>
              </div>

              {selectedScan.image_url ? (
                <a href={selectedScan.image_url} target="_blank" rel="noopener noreferrer" className="scan-view-image-btn">
                  {t('history.viewImage')}
                </a>
              ) : null}

              <div className="scan-advice-block">
                <p className="scan-advice-label">{t('history.description')}</p>
                <p className="scan-advice-text">
                  {localizeAdvice(selectedScan, 'description', selectedScan.analysis_json?.description || t('dashboard.notAvailable'))}
                </p>
              </div>

              <div className="scan-advice-block">
                <p className="scan-advice-label">{t('history.cause')}</p>
                <p className="scan-advice-text">
                  {localizeAdvice(selectedScan, 'cause', selectedScan.analysis_json?.cause || t('dashboard.notAvailable'))}
                </p>
              </div>

              <div className="scan-advice-block">
                <p className="scan-advice-label">{t('history.treatment')}</p>
                <p className="scan-advice-text">
                  {localizeAdvice(selectedScan, 'treatment', selectedScan.analysis_json?.treatment || t('dashboard.notAvailable'))}
                </p>
              </div>

              {topPredictions.length > 0 ? (
                <div className="scan-top-predictions">
                  <p className="scan-advice-label">{t('history.topPredictions')}</p>
                  {topPredictions.map((prediction, index) => {
                    const predictionName = prediction.raw_class || prediction.disease_name || 'Unknown';
                    const predictionScore = typeof prediction.confidence === 'number' ? prediction.confidence : 0;
                    const normalizedPercent = predictionScore <= 1 ? predictionScore * 100 : predictionScore;
                    return (
                      <span key={`${selectedScan.id}-${index}`} className="prediction-pill">
                        {localizeDisease(predictionName, prediction.raw_class)} {formatLocalizedNumber(normalizedPercent, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <button className="scan-read-aloud-btn" type="button" onClick={() => readAloud(selectedScan)}>
                🔊 {t('history.readEntry')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ScanHistory;
