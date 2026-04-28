import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

import api from '../lib/api';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import LeafLoader from '../components/LeafLoader';
import MiniTrend from '../components/MiniTrend';
import ReadAloudButton from '../components/ReadAloudButton';
import AddFarmModal from '../components/AddFarmModal';
import MandiPrices from '../components/MandiPrices';
import WeatherWidget from '../components/WeatherWidget';
import { formatLocalizedDateTime, formatLocalizedNumber, localizeAgricultureText } from '../utils/localization';
import { localizeModelAdvice, localizeModelClassLabel, resolveModelClassKey } from '../utils/mlLocalization';
import { appendLocalScanHistory, mergeScanHistory, readLocalScanHistory, type ScanHistoryItem } from '../utils/localScanHistory';
import { useFarmContext } from '../context/FarmContext';

type PredictionResult = {
  class_key: string | null;
  disease_name: string;
  confidence: number;
  description: string;
  cause: string;
  treatment: string;
  recommended_medicines: string[];
};

type MedicineRecommendation = {
  id: string;
  brand_name: string;
  company: string;
  active_ingredient: string;
  concentration: string;
  crop_type: string;
  disease_category: string;
  purchase_url: string | null;
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

type VerifyResponse = {
  is_valid: boolean;
  verification_type: 'bottle' | 'batch' | 'unknown';
  alert_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  warning?: string;
  message: string;
  scan_count: number;
  bottle_number?: number;
  first_verified_at?: string;
  first_verified_district?: string;
  medicine?: {
    brand_name: string;
    company: string;
    active_ingredient: string;
    concentration: string;
    crop_type: string;
    disease_category: string;
  };
  batch?: {
    batch_code: string;
    manufacture_date: string;
    batch_size: number;
  };
};

type HistoryInsight = {
  id: string;
  disease_name: string;
  confidence: number;
  timestamp: string;
};

const toHistoryInsight = (item: ScanHistoryItem): HistoryInsight => ({
  id: item.id,
  disease_name: String(item.disease_name || '').replaceAll(' ', '_'),
  confidence: Number(item.confidence || 0),
  timestamp: item.timestamp,
});

const ONBOARDING_KEY = 'shetvaidya-onboarding-complete';

const getConfidenceLabel = (confidence: number, t: (key: string) => string) => {
  if (confidence === 0) return t('dashboard.noScansYet');
  if (confidence >= 85) return t('dashboard.highAccuracy');
  if (confidence >= 65) return t('dashboard.goodAccuracy');
  return t('dashboard.lowAccuracy');
};

const getSeverityClass = (diseaseKey: string) => {
  const lower = diseaseKey.toLowerCase();
  if (lower.includes('healthy')) return 'analyzer-disease-title--healthy';
  if (lower.includes('early')) return 'analyzer-disease-title--early';
  return 'analyzer-disease-title--critical';
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { farms, activeFarm, addFarm } = useFarmContext();
  const language = i18n.language;
  const isDevanagariLanguage = ['mr', 'hi'].includes(language.split('-')[0]);

  const [status, setStatus] = useState('');
  const [cameraResult, setCameraResult] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [batchCode, setBatchCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [recommendedMedicines, setRecommendedMedicines] = useState<MedicineRecommendation[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryInsight[]>([]);
  const [historySyncNotice, setHistorySyncNotice] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [detectedDistrict, setDetectedDistrict] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        await html5QrcodeRef.current.clear();
      } catch {
        // Ignore stop/clear errors from interrupted camera states.
      }
      html5QrcodeRef.current = null;
    }
    setShowCamera(false);
  };

  const ensureNativeCameraPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      const permission = await Camera.checkPermissions();
      if (permission.camera === 'granted' || permission.camera === 'limited') {
        return true;
      }

      const requested = await Camera.requestPermissions({ permissions: ['camera'] });
      return requested.camera === 'granted' || requested.camera === 'limited';
    } catch {
      return false;
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setStatus(t('dashboard.status.openingCamera'));

    const hasCameraPermission = await ensureNativeCameraPermission();
    if (!hasCameraPermission) {
      setCameraError(t('medicine.cameraPermissionDeniedApp'));
      setStatus(t('dashboard.status.cameraError'));
      setShowCamera(false);
      return;
    }

    setShowCamera(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API unavailable');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      stream.getTracks().forEach((track) => track.stop());

      const html5Qrcode = new Html5Qrcode('qr-reader-div');
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        },
        (decodedText: string) => {
          setCameraResult(decodedText);
          setBatchCode(decodedText);
          setStatus(t('dashboard.status.captured'));
          stopCamera();
        },
        () => {
          // Scanner emits frequent decode misses while searching; safe to ignore.
        }
      );
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError(Capacitor.isNativePlatform() ? t('medicine.cameraPermissionDeniedApp') : t('medicine.cameraPermissionDenied'));
      } else {
        setCameraError(t('medicine.cameraError'));
      }
      setStatus(t('dashboard.status.cameraError'));
      setShowCamera(false);
    }
  };

  const fetchRecommendedMedicines = async (cropType: string, diseaseCategory: string) => {
    const normalizedDisease = String(diseaseCategory || '').trim();
    if (!cropType || normalizedDisease.toLowerCase().includes('healthy')) {
      setRecommendedMedicines([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (cropType) params.set('crop_type', cropType);
      if (normalizedDisease) params.set('disease', normalizedDisease);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/medicine/list?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const medicines = Array.isArray(data?.medicines) ? data.medicines : [];
        setRecommendedMedicines(medicines as MedicineRecommendation[]);
      } else {
        setRecommendedMedicines([]);
      }
    } catch {
      setRecommendedMedicines([]);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);

        try {
          const response = await api.post('/area-intelligence/detect-district', {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          });
          setDetectedDistrict(String(response.data?.district || ''));
        } catch {
          setDetectedDistrict('');
        }
      },
      () => {
        setLat(null);
        setLng(null);
        setDetectedDistrict('');
      }
    );

    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setShowOnboarding(!completed);

    const localHistory = readLocalScanHistory();
    if (localHistory.length > 0) {
      setHistoryItems(localHistory.map(toHistoryInsight));
    }
  }, []);

  const refreshHistoryItems = async () => {
    setLoadingInsights(true);
    const localHistory = readLocalScanHistory();
    try {
      const response = await api.get('/scans');
      const body = (response.data || {}) as { items?: HistoryInsight[] };
      const remoteItems = Array.isArray(body.items)
        ? body.items.map((item) => ({
            ...item,
            confidence: Number(item.confidence || 0) > 1 ? Number(item.confidence || 0) / 100 : Number(item.confidence || 0),
          })) as ScanHistoryItem[]
        : [];

      const merged = mergeScanHistory(remoteItems, localHistory);
      setHistoryItems(merged.map(toHistoryInsight));

      const remoteSynced = remoteItems.length > 0 || localHistory.length === 0;
      setHistorySyncNotice(remoteSynced ? '' : t('history.errors.fetchFailed'));
      return remoteSynced;
    } catch {
      // Keep local fallback insights when auth-based history is unavailable,
      // but show a visible notice so users know cloud history sync failed.
      if (localHistory.length > 0) {
        setHistoryItems(localHistory.map(toHistoryInsight));
      }
      setHistorySyncNotice(t('history.errors.fetchFailed'));
      return false;
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
    await startCamera();
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
    setRecommendedMedicines([]);
    setShowWarningModal(false);
    setWarningMessage('');

    const form = new FormData();
    form.append('file', selectedFile);
    if (activeFarm?.id) {
      form.append('farm_id', activeFarm.id);
    }
    try {
      const scanPayload = {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        farmId: activeFarm?.id || null,
      };
      console.log('Scan payload being sent:', scanPayload);

      const response = await api.post('/api/predict', form);
      const responseBody = response.data || {};
      console.log('Scan API response:', { status: response.status, body: responseBody });

      const payload = responseBody || {};

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
      const classKey = resolveModelClassKey(payload.raw_class, diseaseData.disease_name, payload.disease_name);
      setPrediction({
        class_key: classKey,
        disease_name: diseaseData.disease_name || payload.disease_name || payload.raw_class || t('dashboard.notAvailable'),
        confidence: Number(payload.confidence || 0) / 100,
        description: diseaseData.description || '',
        cause: diseaseData.cause || '',
        treatment: diseaseData.treatment || '',
        recommended_medicines: medicines,
      });
      setShowPredictionModal(true);

      const detectedCropType = String(payload.crop_type || payload.class_name || payload.raw_class || '')
        .split('_')[0]
        .trim();
      const detectedDiseaseCategory = String(diseaseData.disease_name || payload.disease_name || payload.class_name || payload.raw_class || '').trim();
      fetchRecommendedMedicines(detectedCropType, detectedDiseaseCategory);

      const nowIso = new Date().toISOString();
      const diseaseForTrend = (payload.disease_name || payload.raw_class || t('dashboard.notAvailable')).replaceAll(' ', '_');
      const confidenceForTrend = Number(payload.confidence || 0) / 100;

      const localTopPredictions = Array.isArray(payload.top_predictions)
        ? payload.top_predictions
            .map((entry: any) => ({
              raw_class: entry?.raw_class ? String(entry.raw_class) : undefined,
              disease_name: String(entry?.disease_name || '').trim(),
              confidence: Number(entry?.confidence || 0) > 1 ? Number(entry?.confidence || 0) / 100 : Number(entry?.confidence || 0),
            }))
            .filter((entry: any) => entry.disease_name)
        : undefined;

      const localHistoryId = String(payload.history_id || `local-${nowIso}`);
      const localHistory = appendLocalScanHistory({
        id: localHistoryId,
        farm_id: activeFarm?.id || null,
        disease_name: diseaseForTrend,
        confidence: confidenceForTrend,
        image_url: String(payload.image_url || ''),
        timestamp: nowIso,
        analysis_json: {
          raw_class: payload.raw_class ? String(payload.raw_class) : undefined,
          description: diseaseData.description,
          cause: diseaseData.cause,
          treatment: diseaseData.treatment,
          recommended_medicines: medicines,
          crop_type: activeFarm?.crop || undefined,
          top_predictions: localTopPredictions,
        },
      });

      setHistoryItems(localHistory.map(toHistoryInsight));

      // Try to sync from backend history when user is authenticated.
      const synced = await refreshHistoryItems();
      if (!synced) {
        setStatus(t('history.errors.fetchFailed'));
      } else {
        setStatus(t('dashboard.status.predictionComplete'));
      }
    } catch (err: any) {
      setError(err?.message || t('dashboard.errors.predictionFailed'));
    } finally {
      setLoadingPrediction(false);
    }
  };

  const retakePhoto = () => {
    setSelectedFile(null);
    setPrediction(null);
    setRecommendedMedicines([]);
    setShowPredictionModal(false);
    setShowWarningModal(false);
    setWarningMessage('');
  };

  const closeWarningModal = () => {
    setShowWarningModal(false);
    setWarningMessage('');
    setSelectedFile(null);
    setPrediction(null);
    setRecommendedMedicines([]);
  };

  const verifyBatch = async () => {
    const code = batchCode.trim();
    if (!code) {
      setError(t('dashboard.errors.enterBatch'));
      return;
    }

    setLoadingBatch(true);
    setError('');
    setVerifyResult(null);

    try {
      const response = await api.get(`/medicine/verify/${code}`);
      const body = (response.data || {}) as VerifyResponse & { detail?: string };

      setVerifyResult(body as VerifyResponse);
      setStatus(t('dashboard.status.batchComplete'));
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(detail || t('dashboard.errors.batchFailed'));
    } finally {
      setLoadingBatch(false);
    }
  };

  const localizeDiseaseName = (value: string) => {
    const classKey = resolveModelClassKey(value);
    return localizeModelClassLabel(t, classKey, localizeAgricultureText(value.replaceAll('_', ' '), language));
  };

  const localizeAdviceField = (
    classKey: string | null,
    field: 'description' | 'cause' | 'treatment',
    fallbackText: string
  ) => localizeModelAdvice(t, classKey, field, localizeAgricultureText(fallbackText, language));

  const localizedTopDiseaseLabel = insights.topDisease
    ? localizeDiseaseName(insights.topDisease)
    : t('dashboard.notAvailable');
  const dashboardDistrict = activeFarm?.district || detectedDistrict || '';
  const confidenceLabel = getConfidenceLabel(insights.avgConfidence, t);
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
    `${localizedTopDiseaseLabel}.`,
  ].join(' ');

  const analyzerNarration = prediction
    ? [
        `${localizeDiseaseName(prediction.disease_name)}`,
        `${t('dashboard.analyzer.confidence', {
          value: formatLocalizedNumber(prediction.confidence * 100, language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        })}`,
        `${t('dashboard.analyzer.description')}: ${localizeAdviceField(prediction.class_key, 'description', prediction.description || t('dashboard.analyzer.noDescription'))}`,
        `${t('dashboard.analyzer.cause')}: ${localizeAdviceField(prediction.class_key, 'cause', prediction.cause || t('dashboard.analyzer.noCause'))}`,
        `${t('dashboard.analyzer.treatment')}: ${localizeAdviceField(prediction.class_key, 'treatment', prediction.treatment || t('dashboard.analyzer.noTreatment'))}`,
        `${t('dashboard.analyzer.recommendedMedicines')}: ${(prediction.recommended_medicines || []).map((medicine) => localizeAgricultureText(medicine, language)).join(', ') || t('dashboard.analyzer.noMedicine')}`,
      ].join('. ')
    : '';

  const modalMedicineNarration = recommendedMedicines
    .slice(0, 5)
    .map((medicine) => `${localizeAgricultureText(medicine.brand_name, language)} ${localizeAgricultureText(medicine.company, language)}`)
    .join('. ');

  const batchNarration = verifyResult
    ? [
        verifyResult.is_valid ? t('medicine.genuine') : t('dashboard.batch.invalidBatch'),
        verifyResult.message,
        `${t('medicine.scanCount')}: ${formatLocalizedNumber(verifyResult.scan_count || 0, language)}`,
        verifyResult.medicine
          ? `${t('dashboard.batch.unknownBrand')}: ${localizeAgricultureText(verifyResult.medicine.brand_name || t('dashboard.notAvailable'), language)}`
          : '',
        verifyResult.medicine
          ? `${t('dashboard.batch.activeIngredient')}: ${localizeAgricultureText(verifyResult.medicine.active_ingredient || t('dashboard.notAvailable'), language)}`
          : '',
      ].join('. ')
    : '';

  const operationsNarration = [heroNarration, analyzerNarration, batchNarration]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('. ');

  return (
    <div className="dashboard-layout">
      {farms.length === 0 ? (
        <section className="card farm-setup-card">
          <h2>🌾 {t('farms.setupPrompt')}</h2>
          <p className="lead">{t('farms.setupPrompt')}</p>
          <button type="button" className="btn primary" onClick={() => setShowAddFarmModal(true)}>
            {t('farms.setupCta')}
          </button>
        </section>
      ) : null}

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
            <strong>{confidenceLabel}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.topDisease')}</span>
            <strong>{localizedTopDiseaseLabel}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('dashboard.kpis.locationStatus')}</span>
            <strong>{lat ? t('dashboard.locationDetected') : t('dashboard.locationUnavailable')}</strong>
          </article>
        </div>
      </section>

      {dashboardDistrict ? <WeatherWidget district={dashboardDistrict} /> : <section className="card"><p className="panel-muted">{t('weather.locationPrompt')}</p></section>}

      {dashboardDistrict ? <MandiPrices district={dashboardDistrict} preferredCrop={activeFarm?.crop} /> : null}

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
            <p className="photo-tip">{t('dashboard.photoTip')}</p>

            {loadingPrediction && <LeafLoader variant="panel" label={t('dashboard.analyzer.loadingPrediction')} />}

            {prediction && (
              <>
                <button className="btn outline" onClick={() => setShowPredictionModal(true)}>
                  {t('dashboard.readTreatmentAdvice')}
                </button>
                <ReadAloudButton text={analyzerNarration} className="tts-read-btn" labelKey="common.readAloud" />
              </>
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
            {showCamera && (
              <div className="camera-wrapper">
                <div id="qr-reader-div" className="qr-reader-box" />
                {cameraError && (
                  <p className="camera-error-text">{cameraError}</p>
                )}
                <button
                  type="button"
                  className="btn outline"
                  onClick={stopCamera}
                >
                  {t('medicine.stopCamera')}
                </button>
              </div>
            )}

            {loadingBatch && <LeafLoader variant="panel" label={t('dashboard.batch.validating')} />}

            {verifyResult && (
              <div className="verify-result-container">
                {verifyResult.alert_level === 'NONE' && (
                  <div className="verify-result">
                    <div className="verify-banner green">✅ {t('medicine.genuine')}</div>
                    <p className="verify-sub">
                      {t('medicine.firstVerification')} #{formatLocalizedNumber(verifyResult.bottle_number || 0, language)}
                    </p>
                    <div className="medicine-details-card">
                      <p><strong>{localizeAgricultureText(verifyResult.medicine?.brand_name || t('dashboard.notAvailable'), language)}</strong></p>
                      <p>{localizeAgricultureText(verifyResult.medicine?.company || t('dashboard.notAvailable'), language)}</p>
                      <p>
                        {localizeAgricultureText(verifyResult.medicine?.active_ingredient || t('dashboard.notAvailable'), language)} - {localizeAgricultureText(verifyResult.medicine?.concentration || t('dashboard.notAvailable'), language)}
                      </p>
                      <p>{t('medicine.cropType')}: {localizeAgricultureText(verifyResult.medicine?.crop_type || t('dashboard.notAvailable'), language)}</p>
                      <p>{t('medicine.disease')}: {localizeAgricultureText(verifyResult.medicine?.disease_category || t('dashboard.notAvailable'), language)}</p>
                      <p>{t('medicine.batchCode')}: {localizeAgricultureText(verifyResult.batch?.batch_code || t('dashboard.notAvailable'), language)}</p>
                      <p>{t('medicine.manufactured')}: {verifyResult.batch?.manufacture_date ? formatLocalizedDateTime(verifyResult.batch.manufacture_date, language) : t('dashboard.notAvailable')}</p>
                    </div>
                  </div>
                )}

                {(verifyResult.alert_level === 'LOW' || verifyResult.alert_level === 'MEDIUM') && (
                  <div className="verify-result">
                    <div className="verify-banner yellow">⚠️ {t('medicine.batchVerified')}</div>
                    <p>{localizeAgricultureText(verifyResult.message, language)}</p>
                    <p className="verify-sub">{t('medicine.scanCount')}: {formatLocalizedNumber(verifyResult.scan_count, language)}</p>
                    <div className="medicine-details-card">
                      <p><strong>{localizeAgricultureText(verifyResult.medicine?.brand_name || t('dashboard.notAvailable'), language)}</strong></p>
                      <p>{localizeAgricultureText(verifyResult.medicine?.company || t('dashboard.notAvailable'), language)}</p>
                      <p>
                        {localizeAgricultureText(verifyResult.medicine?.active_ingredient || t('dashboard.notAvailable'), language)} - {localizeAgricultureText(verifyResult.medicine?.concentration || t('dashboard.notAvailable'), language)}
                      </p>
                      <p>{t('medicine.cropType')}: {localizeAgricultureText(verifyResult.medicine?.crop_type || t('dashboard.notAvailable'), language)}</p>
                      <p>{t('medicine.disease')}: {localizeAgricultureText(verifyResult.medicine?.disease_category || t('dashboard.notAvailable'), language)}</p>
                    </div>
                  </div>
                )}

                {verifyResult.alert_level === 'HIGH' && verifyResult.warning === 'ALREADY_VERIFIED' && (
                  <div className="verify-result">
                    <div className="verify-banner red">🚨 {t('medicine.alreadyVerified')}</div>
                    <p>{t('medicine.alreadyVerifiedMsg')}</p>
                    <div className="verify-detail-row">
                      <span>{t('medicine.firstVerifiedAt')}:</span>
                      <span>{localizeAgricultureText(verifyResult.first_verified_at || t('dashboard.notAvailable'), language)}</span>
                    </div>
                    <div className="verify-detail-row">
                      <span>{t('medicine.firstVerifiedDistrict')}:</span>
                      <span>{localizeAgricultureText(verifyResult.first_verified_district || t('dashboard.notAvailable'), language)}</span>
                    </div>
                    <div className="verify-detail-row">
                      <span>{t('medicine.scanCount')}:</span>
                      <span>{formatLocalizedNumber(verifyResult.scan_count, language)}</span>
                    </div>
                    <div className="medicine-details-card">
                      <p><strong>{localizeAgricultureText(verifyResult.medicine?.brand_name || t('dashboard.notAvailable'), language)}</strong></p>
                      <p>{localizeAgricultureText(verifyResult.medicine?.company || t('dashboard.notAvailable'), language)}</p>
                    </div>
                    <a href="tel:1800-233-4000" className="emergency-contact-btn">
                      📞 {t('medicine.contactKrushi')} - 1800-233-4000
                    </a>
                  </div>
                )}

                {verifyResult.alert_level === 'HIGH' && verifyResult.verification_type === 'unknown' && (
                  <div className="verify-result">
                    <div className="verify-banner red">❌ {t('medicine.notFound')}</div>
                    <p>{t('medicine.notFoundMsg')}</p>
                    <a href="tel:1800-233-4000" className="emergency-contact-btn">
                      📞 {t('medicine.contactKrushi')} - 1800-233-4000
                    </a>
                  </div>
                )}

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
                <h2 className={`analyzer-disease-title ${getSeverityClass(prediction.class_key || prediction.disease_name)}`}>
                  🌿 {localizeDiseaseName(prediction.disease_name)}
                </h2>
              </div>
              <div className="inline-row">
                <button type="button" className="btn ghost btn--compact" onClick={() => setShowPredictionModal(false)}>
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className={`result-panel ${isDevanagariLanguage ? 'devanagari-result' : ''}`}>
              <div className="result-panel__heading">
                <strong>📊 {t('dashboard.analyzer.confidence', {
                  value: formatLocalizedNumber(prediction.confidence * 100, language, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}</strong>
              </div>

              <div className="table-like">
                <span className="label-muted">🌿 {t('dashboard.analyzer.diseaseName')}</span>
                <span>{localizeDiseaseName(prediction.disease_name)}</span>
                <span className="label-muted">🟢 {t('dashboard.analyzer.status')}</span>
                <span>{t('dashboard.analyzer.statusDetected')}</span>
                <span className="label-muted">🧾 {t('dashboard.analyzer.description')}</span>
                <span>{localizeAdviceField(prediction.class_key, 'description', prediction.description || t('dashboard.analyzer.noDescription'))}</span>
                <span className="label-muted">🧫 {t('dashboard.analyzer.cause')}</span>
                <span>{localizeAdviceField(prediction.class_key, 'cause', prediction.cause || t('dashboard.analyzer.noCause'))}</span>
                <span className="label-muted">💊 {t('dashboard.analyzer.treatment')}</span>
                <span>{localizeAdviceField(prediction.class_key, 'treatment', prediction.treatment || t('dashboard.analyzer.noTreatment'))}</span>
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
                labelKey="common.readAloud"
                className="tts-read-btn"
              />

              {recommendedMedicines.length > 0 && !prediction.disease_name.toLowerCase().includes('healthy') ? (
                <div className="recommended-medicines-section">
                  <h3 className="medicines-section-title">💊 {t('dashboard.recommendedMedicines')}</h3>
                  <p className="medicines-section-subtitle">{t('dashboard.medicinesDisclaimer')}</p>

                  <div className="medicines-list">
                    {recommendedMedicines.slice(0, 5).map((medicine) => {
                      const purchaseUrl = String(medicine.purchase_url || '').trim();
                      return (
                        <div key={medicine.id} className="medicine-card">
                          <div className="medicine-card-top">
                            <span className="medicine-brand-name">{localizeAgricultureText(medicine.brand_name, language)}</span>
                            <span className="medicine-company">{localizeAgricultureText(medicine.company, language)}</span>
                          </div>

                          <div className="medicine-card-details">
                            <span className="medicine-ingredient">
                              {localizeAgricultureText(medicine.active_ingredient, language)}
                              {medicine.concentration ? ` - ${localizeAgricultureText(medicine.concentration, language)}` : ''}
                            </span>
                          </div>

                          {purchaseUrl ? (
                            <a href={purchaseUrl} target="_blank" rel="noopener noreferrer" className="medicine-buy-btn">
                              🛒 {t('dashboard.buyMedicine')}
                            </a>
                          ) : (
                            <span className="medicine-no-link">{t('dashboard.availableAtLocalStore')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {modalMedicineNarration ? <ReadAloudButton text={modalMedicineNarration} className="tts-read-btn" labelKey="common.readAloud" /> : null}
                </div>
              ) : null}
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

      <AddFarmModal
        isOpen={showAddFarmModal}
        onClose={() => setShowAddFarmModal(false)}
        onSave={addFarm}
      />
    </div>
  );
};

export default Dashboard;
