import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { BrowserMultiFormatReader } from '@zxing/library';
import LeafLoader from '../components/LeafLoader';
import MiniTrend from '../components/MiniTrend';
import ReadAloudButton from '../components/ReadAloudButton';
import { formatLocalizedNumber, localizeAgricultureText } from '../utils/localization';

type PredictionResult = {
  disease_name: string;
  confidence: number;
  description: string;
  cause: string;
  treatment: string;
  recommended_medicines: string[];
};

type WarningResult = {
  success: false;
  error?: string;
  message?: string;
};

type DiseaseDataPayload = {
  disease_name?: string;
  description?: string;
  cause?: string;
  treatment?: string;
  medicine?: string;
};

type BatchVerificationResult = {
  batch_code: string;
  is_valid: boolean;
  medicine: {
    brand_name: string | null;
    company: string | null;
    active_ingredient: string | null;
    concentration: string | null;
    crop_type: string | null;
    disease_category: string | null;
  };
};

type HistoryInsight = {
  id: string;
  disease_name: string;
  confidence: number;
  timestamp: string;
};

const ONBOARDING_KEY = 'shetvaidya-onboarding-complete';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [status, setStatus] = useState('');
  const [cameraResult, setCameraResult] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [batchCode, setBatchCode] = useState('');
  const [batchResult, setBatchResult] = useState<BatchVerificationResult | null>(null);
  const [error, setError] = useState('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryInsight[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        setLat(null);
        setLng(null);
      }
    );

    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setShowOnboarding(!completed);
  }, []);

  const refreshHistoryItems = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.get('/scans');
      const items = (res.data.items || []) as HistoryInsight[];
      setHistoryItems(items);
    } catch {
      // Keep local fallback insights when auth-based history is unavailable.
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    refreshHistoryItems();
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const insights = useMemo(() => {
    const count = historyItems.length;
    const avgConfidence = count
      ? historyItems.reduce((acc, item) => acc + item.confidence, 0) / count
      : 0;

    const diseaseFrequency: Record<string, number> = {};
    historyItems.forEach((item) => {
      diseaseFrequency[item.disease_name] = (diseaseFrequency[item.disease_name] || 0) + 1;
    });

    const topDisease = Object.entries(diseaseFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const trendPoints = historyItems
      .slice(0, 8)
      .reverse()
      .map((item) => Number((item.confidence * 100).toFixed(2)));

    return {
      totalScans: count,
      avgConfidence: Number((avgConfidence * 100).toFixed(2)),
      topDisease,
      trendPoints,
    };
  }, [historyItems]);

  const scanBatchCode = async () => {
    const codeReader = new BrowserMultiFormatReader();
    setStatus(t('dashboard.status.openingCamera'));
    try {
      const result = await codeReader.decodeFromVideoDevice(undefined, 'preview', (out) => {
        if (out) {
          setCameraResult(out.getText());
          setBatchCode(out.getText());
          setStatus(t('dashboard.status.captured'));
          codeReader.reset();
        }
      });
      if (result) {
        setCameraResult(result.getText());
        setBatchCode(result.getText());
      }
    } catch (err) {
      setStatus(t('dashboard.status.cameraError'));
    }
  };

  const callHealth = async () => {
    setError('');
    try {
      await api.get('/health/deep');
      setStatus(t('dashboard.status.servicesReachable'));
    } catch {
      setStatus(t('dashboard.status.servicesUnavailable'));
    }
  };

  const analyzeLeaf = async () => {
    if (!selectedFile) {
      setError(t('dashboard.errors.selectImage'));
      return;
    }

    setLoadingPrediction(true);
    setError('');
    setPrediction(null);
    setShowWarningModal(false);
    setWarningMessage('');

    const form = new FormData();
    form.append('file', selectedFile);
    try {
      const res = await api.post('/api/predict', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = res.data || {};

      if (payload?.success === false) {
        const warningPayload = payload as WarningResult;
        setWarningMessage(
          warningPayload.error ||
            warningPayload.message ||
            t('dashboard.warning.defaultMessage')
        );
        setShowWarningModal(true);
        setStatus(t('dashboard.status.predictionComplete'));
        return;
      }

      const diseaseData = (payload.disease_data || {}) as DiseaseDataPayload;
      const medicines = diseaseData.medicine ? [diseaseData.medicine] : [];
      setPrediction({
        disease_name: diseaseData.disease_name || payload.disease_name || payload.raw_class || t('dashboard.notAvailable'),
        confidence: Number(payload.confidence || 0) / 100,
        description: diseaseData.description || '',
        cause: diseaseData.cause || '',
        treatment: diseaseData.treatment || '',
        recommended_medicines: medicines,
      });
      setShowPredictionModal(true);

      const nowIso = new Date().toISOString();
      const diseaseForTrend = (payload.disease_name || payload.raw_class || t('dashboard.notAvailable')).replaceAll(' ', '_');
      const confidenceForTrend = Number(payload.confidence || 0) / 100;

      setHistoryItems((prev) => [
        {
          id: `local-${nowIso}`,
          disease_name: diseaseForTrend,
          confidence: confidenceForTrend,
          timestamp: nowIso,
        },
        ...prev,
      ]);

      // Try to sync from backend history when user is authenticated.
      refreshHistoryItems();
      setStatus(t('dashboard.status.predictionComplete'));
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('dashboard.errors.predictionFailed'));
    } finally {
      setLoadingPrediction(false);
    }
  };

  const retakePhoto = () => {
    setSelectedFile(null);
    setPrediction(null);
    setShowPredictionModal(false);
    setShowWarningModal(false);
    setWarningMessage('');
  };

  const closeWarningModal = () => {
    setShowWarningModal(false);
    setWarningMessage('');
    setSelectedFile(null);
    setPrediction(null);
  };

  const verifyBatch = async () => {
    if (!batchCode.trim()) {
      setError(t('dashboard.errors.enterBatch'));
      return;
    }

    setLoadingBatch(true);
    setError('');
    setBatchResult(null);

    try {
      const res = await api.get(`/medicine/verify/${encodeURIComponent(batchCode.trim())}`);
      setBatchResult(res.data);
      setStatus(t('dashboard.status.batchComplete'));
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('dashboard.errors.batchFailed'));
    } finally {
      setLoadingBatch(false);
    }
  };

  const topDiseaseLabel = insights.topDisease ? insights.topDisease.replaceAll('_', ' ') : t('dashboard.notAvailable');
  const formattedTotalScans = formatLocalizedNumber(insights.totalScans, language);
  const formattedAverageConfidence = formatLocalizedNumber(insights.avgConfidence, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const heroNarration = [
    t('dashboard.heroTitle'),
    t('dashboard.kpis.totalScans'),
    `${formattedTotalScans}.`,
    t('dashboard.kpis.avgConfidence'),
    `${formattedAverageConfidence}%`,
    t('dashboard.kpis.topDisease'),
    `${topDiseaseLabel}.`,
  ].join(' ');

  const analyzerNarration = prediction
    ? [
        `${prediction.disease_name.replaceAll('_', ' ')}`,
        `${t('dashboard.analyzer.confidence', {
          value: formatLocalizedNumber(prediction.confidence * 100, language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        })}`,
        `${t('dashboard.analyzer.description')}: ${localizeAgricultureText(prediction.description || t('dashboard.analyzer.noDescription'), language)}`,
        `${t('dashboard.analyzer.cause')}: ${localizeAgricultureText(prediction.cause || t('dashboard.analyzer.noCause'), language)}`,
        `${t('dashboard.analyzer.treatment')}: ${localizeAgricultureText(prediction.treatment || t('dashboard.analyzer.noTreatment'), language)}`,
        `${t('dashboard.analyzer.recommendedMedicines')}: ${(prediction.recommended_medicines || []).map((medicine) => localizeAgricultureText(medicine, language)).join(', ') || t('dashboard.analyzer.noMedicine')}`,
      ].join('. ')
    : '';

  const batchNarration = batchResult
    ? [
        batchResult.is_valid ? t('dashboard.batch.validBatch') : t('dashboard.batch.invalidBatch'),
        `${t('dashboard.batch.code')}: ${batchResult.batch_code}`,
        `${t('dashboard.batch.activeIngredient')}: ${localizeAgricultureText(batchResult.medicine.active_ingredient || t('dashboard.notAvailable'), language)}`,
        `${t('dashboard.batch.crop')}: ${localizeAgricultureText(batchResult.medicine.crop_type || t('dashboard.notAvailable'), language)}`,
        `${t('dashboard.batch.diseaseCategory')}: ${localizeAgricultureText(batchResult.medicine.disease_category || t('dashboard.notAvailable'), language)}`,
        `${t('dashboard.batch.unknownBrand')}: ${localizeAgricultureText(batchResult.medicine.brand_name || t('dashboard.notAvailable'), language)}`,
        `${t('dashboard.batch.unknownCompany')}: ${localizeAgricultureText(batchResult.medicine.company || t('dashboard.notAvailable'), language)}`,
      ].join('. ')
    : '';

  const operationsNarration = [heroNarration, analyzerNarration, batchNarration]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('. ');

  return (
    <div className="dashboard-layout">
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="card onboarding-card">
            <p className="subtitle">{t('dashboard.onboarding.subtitle')}</p>
            <h2>{t('dashboard.onboarding.title')}</h2>
            <p>{t('dashboard.onboarding.lead')}</p>
            <div className="onboarding-steps">
              <div>
                <strong>{t('dashboard.onboarding.step1Title')}</strong>
                <span>{t('dashboard.onboarding.step1Desc')}</span>
              </div>
              <div>
                <strong>{t('dashboard.onboarding.step2Title')}</strong>
                <span>{t('dashboard.onboarding.step2Desc')}</span>
              </div>
              <div>
                <strong>{t('dashboard.onboarding.step3Title')}</strong>
                <span>{t('dashboard.onboarding.step3Desc')}</span>
              </div>
            </div>
            <button className="btn primary" onClick={dismissOnboarding}>
              {t('dashboard.onboarding.start')}
            </button>
          </div>
        </div>
      )}

      <section className="card dashboard-hero">
        <div>
          <p className="subtitle">{t('dashboard.heroSubtitle')}</p>
          <h1 className="headline">{t('dashboard.heroTitle')}</h1>
          <p className="lead">{t('dashboard.heroLead')}</p>
          <div className="inline-row">
            <ReadAloudButton text={heroNarration} labelKey="dashboard.readHeroSummary" />
            <ReadAloudButton text={operationsNarration} />
          </div>
        </div>

        <div className="dashboard-kpis">
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.totalScans')}</span>
            <strong>{formattedTotalScans}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.avgConfidence')}</span>
            <strong>{formattedAverageConfidence}%</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.topDisease')}</span>
            <strong>{topDiseaseLabel}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.locationStatus')}</span>
            <strong>{lat ? t('dashboard.locationDetected') : t('dashboard.locationUnavailable')}</strong>
          </article>
        </div>
      </section>

      <section className="card analytics-band">
        <div className="section-title-row">
          <h2>{t('dashboard.snapshotTitle')}</h2>
          <span className="pill">{t('dashboard.snapshotPill')}</span>
        </div>

        <div className="analytics-grid">
          <article className="analytics-tile">
            <span>{t('dashboard.snapshot.totalScans')}</span>
            <strong>{formattedTotalScans}</strong>
          </article>
          <article className="analytics-tile">
            <span>{t('dashboard.snapshot.avgConfidence')}</span>
            <strong>{formattedAverageConfidence}%</strong>
          </article>
          <article className="analytics-tile">
            <span>{t('dashboard.snapshot.topFinding')}</span>
            <strong>{topDiseaseLabel}</strong>
          </article>
          <article className="analytics-tile analytics-tile--trend">
            <span>{t('dashboard.snapshot.trend')}</span>
            {loadingInsights ? (
              <LeafLoader variant="panel" label={t('dashboard.loadingInsights')} />
            ) : (
              <MiniTrend points={insights.trendPoints} />
            )}
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>{t('dashboard.analyzer.title')}</h2>
              <p>{t('dashboard.analyzer.lead')}</p>
            </div>
            <button className="btn outline" onClick={callHealth}>
              {t('dashboard.analyzer.healthCheck')}
            </button>
          </div>

          <div className="panel-card__body">
            <p className="scan-support-note">{t('dashboard.analyzer.supportedCropsNote')}</p>
            <input
              className="input"
              type="file"
              aria-label={t('dashboard.analyzer.uploadAria')}
              accept="image/png,image/jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && <p className="panel-muted">{t('dashboard.analyzer.selectedFile', { name: selectedFile.name })}</p>}
            <button className="btn primary" onClick={analyzeLeaf} disabled={loadingPrediction}>
              {t('dashboard.analyzer.analyzeLeaf')}
            </button>

            {loadingPrediction && <LeafLoader variant="panel" label={t('dashboard.analyzer.loadingPrediction')} />}

            {prediction && (
              <button className="btn outline" onClick={() => setShowPredictionModal(true)}>
                {t('dashboard.readTreatmentAdvice')}
              </button>
            )}
          </div>
        </article>

        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>{t('dashboard.batch.title')}</h2>
              <p>{t('dashboard.batch.lead')}</p>
            </div>
          </div>

          <div className="panel-card__body">
            <input className="input" placeholder={t('dashboard.batch.enterBatchCode')} value={batchCode} onChange={(e) => setBatchCode(e.target.value)} />

            <div className="inline-row">
              <button className="btn ghost" onClick={scanBatchCode}>
                {t('dashboard.batch.scanViaCamera')}
              </button>
              <button className="btn primary" onClick={verifyBatch} disabled={loadingBatch}>
                {t('dashboard.batch.verifyBatch')}
              </button>
            </div>

            <p className="panel-muted">{t('dashboard.batch.cameraReadout', { value: cameraResult || t('dashboard.batch.noCapture') })}</p>
            <div id="preview" className="preview-window" />

            {loadingBatch && <LeafLoader variant="panel" label={t('dashboard.batch.validating')} />}

            {batchResult && (
              <div className={`verification-banner ${batchResult.is_valid ? 'ok' : 'error'}`}>
                <strong>{batchResult.is_valid ? t('dashboard.batch.validBatch') : t('dashboard.batch.invalidBatch')}</strong>
                <span>{t('dashboard.batch.code')}: {batchResult.batch_code}</span>
                <span>
                  {localizeAgricultureText(batchResult.medicine.brand_name || t('dashboard.batch.unknownBrand'), language)} | {localizeAgricultureText(batchResult.medicine.company || t('dashboard.batch.unknownCompany'), language)}
                </span>
                <span>
                  {t('dashboard.batch.activeIngredient')}: {localizeAgricultureText(batchResult.medicine.active_ingredient || t('dashboard.notAvailable'), language)} ({localizeAgricultureText(batchResult.medicine.concentration || t('dashboard.notAvailable'), language)})
                </span>
                <span>
                  {t('dashboard.batch.crop')}: {localizeAgricultureText(batchResult.medicine.crop_type || t('dashboard.notAvailable'), language)} | {t('dashboard.batch.diseaseCategory')}: {localizeAgricultureText(batchResult.medicine.disease_category || t('dashboard.notAvailable'), language)}
                </span>

                <ReadAloudButton
                  text={batchNarration}
                  labelKey="dashboard.readBatchDetails"
                />
              </div>
            )}
          </div>
        </article>
      </section>

      {showPredictionModal && prediction && (
        <div className="crop-modal-overlay" role="dialog" aria-modal="true" aria-label={t('dashboard.analyzer.title')}>
          <div className="crop-modal card analyzer-modal">
            <div className="crop-modal__header">
              <div>
                <p className="subtitle">{t('dashboard.analyzer.title')}</p>
                <h2>🌿 {prediction.disease_name.replaceAll('_', ' ')}</h2>
              </div>
              <div className="inline-row">
                <button type="button" className="btn ghost btn--compact" onClick={() => setShowPredictionModal(false)}>
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className="result-panel">
              <div className="result-panel__heading">
                <strong>📊 {t('dashboard.analyzer.confidence', {
                  value: formatLocalizedNumber(prediction.confidence * 100, language, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}</strong>
              </div>

              <div className="table-like">
                <span className="label-muted">🧾 {t('dashboard.analyzer.description')}</span>
                <span>{localizeAgricultureText(prediction.description || t('dashboard.analyzer.noDescription'), language)}</span>
                <span className="label-muted">🧫 {t('dashboard.analyzer.cause')}</span>
                <span>{localizeAgricultureText(prediction.cause || t('dashboard.analyzer.noCause'), language)}</span>
                <span className="label-muted">💊 {t('dashboard.analyzer.treatment')}</span>
                <span>{localizeAgricultureText(prediction.treatment || t('dashboard.analyzer.noTreatment'), language)}</span>
              </div>

              <div className="pill-row">
                {(prediction.recommended_medicines || []).length > 0 ? (
                  prediction.recommended_medicines.map((medicine) => (
                    <span className="pill" key={medicine}>
                      💚 {localizeAgricultureText(medicine, language)}
                    </span>
                  ))
                ) : (
                  <span className="pill">🧪 {t('dashboard.analyzer.noMedicine')}</span>
                )}
              </div>

              <ReadAloudButton
                text={analyzerNarration}
                labelKey="dashboard.readTreatmentAdvice"
              />
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="crop-modal-overlay" role="dialog" aria-modal="true" aria-label={t('dashboard.warning.ariaLabel')}>
          <div className="crop-modal card analyzer-modal">
            <div className="crop-modal__header">
              <div>
                <p className="subtitle">{t('dashboard.analyzer.title')}</p>
                <h2>⚠️ {t('dashboard.warning.title')}</h2>
              </div>
              <div className="inline-row">
                <button type="button" className="btn ghost btn--compact" onClick={closeWarningModal}>
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className="result-panel">
              <p className="lead">{warningMessage}</p>
              <div className="inline-row">
                <button type="button" className="btn outline" onClick={closeWarningModal}>
                  {t('dashboard.warning.tryAgain')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {status && <p className="panel-muted">{t('dashboard.systemStatus')}: {status}</p>}
    </div>
  );
};

export default Dashboard;
