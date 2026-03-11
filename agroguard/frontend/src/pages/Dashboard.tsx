import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../lib/api';
import { BrowserMultiFormatReader } from '@zxing/library';
import LeafLoader from '../components/LeafLoader';
import MiniTrend from '../components/MiniTrend';

type PredictionResult = {
  disease_name: string;
  confidence: number;
  description: string;
  cause: string;
  treatment: string;
  recommended_medicines: string[];
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

const ONBOARDING_KEY = 'agroguard-onboarding-complete';

const Dashboard = () => {
  const [status, setStatus] = useState('Idle');
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

  useEffect(() => {
    setLoadingInsights(true);
    api
      .get('/scans')
      .then((res) => {
        const items = (res.data.items || []) as HistoryInsight[];
        setHistoryItems(items);
      })
      .catch(() => {
        setHistoryItems([]);
      })
      .finally(() => setLoadingInsights(false));
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

    const topDisease = Object.entries(diseaseFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
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
    setStatus('Opening camera for batch barcode');
    try {
      const result = await codeReader.decodeFromVideoDevice(undefined, 'preview', (out) => {
        if (out) {
          setCameraResult(out.getText());
          setBatchCode(out.getText());
          setStatus('Captured');
          codeReader.reset();
        }
      });
      if (result) {
        setCameraResult(result.getText());
        setBatchCode(result.getText());
      }
    } catch (err) {
      setStatus('Camera error');
    }
  };

  const callHealth = async () => {
    setError('');
    try {
      await api.get('/health/deep');
      setStatus('All services reachable');
    } catch {
      setStatus('One or more services unavailable');
    }
  };

  const analyzeLeaf = async () => {
    if (!selectedFile) {
      setError('Select a leaf image first.');
      return;
    }
    setLoadingPrediction(true);
    setError('');
    setPrediction(null);
    const form = new FormData();
    form.append('file', selectedFile);
    try {
      const res = await api.post('/scans/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPrediction(res.data.result);
      setStatus('Prediction complete');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Prediction failed');
    } finally {
      setLoadingPrediction(false);
    }
  };

  const verifyBatch = async () => {
    if (!batchCode.trim()) {
      setError('Enter or scan a batch code first.');
      return;
    }
    setLoadingBatch(true);
    setError('');
    setBatchResult(null);
    try {
      const res = await api.get(`/medicine/verify/${encodeURIComponent(batchCode.trim())}`);
      setBatchResult(res.data);
      setStatus('Batch verification complete');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Batch verification failed');
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="card onboarding-card">
            <p className="subtitle">Quick Orientation</p>
            <h2>Welcome to your AgroGuard dashboard</h2>
            <p>
              Analyze plant diseases, verify agricultural medicines, and track your crop health history in one place.
            </p>
            <div className="onboarding-steps">
              <div>
                <strong>1. Plant Disease Analyzer</strong>
                <span>Upload a clear leaf image to detect disease and view treatment guidance.</span>
              </div>
              <div>
                <strong>2. Medicine Authenticity Verification</strong>
                <span>Enter or scan medicine batch codes to verify product authenticity.</span>
              </div>
              <div>
                <strong>3. Scan History</strong>
                <span>Review previous analyses, confidence scores, and disease patterns.</span>
              </div>
            </div>
            <button className="btn primary" onClick={dismissOnboarding}>
              Start Monitoring
            </button>
          </div>
        </div>
      )}

      <section className="card dashboard-hero">
        <div>
          <p className="subtitle">Operations Dashboard</p>
          <h1 className="headline">Crop Health Monitoring Dashboard</h1>
          <p className="lead">Analyze plant diseases, verify agricultural medicines, and track your crop health history in one place.</p>
        </div>

        <div className="dashboard-kpis">
          <article className="kpi-tile">
            <span>Total Disease Scans</span>
            <strong>{insights.totalScans}</strong>
          </article>
          <article className="kpi-tile">
            <span>Average Detection Confidence</span>
            <strong>{insights.avgConfidence}%</strong>
          </article>
          <article className="kpi-tile">
            <span>Most Common Disease</span>
            <strong>{insights.topDisease.replaceAll('_', ' ')}</strong>
          </article>
          <article className="kpi-tile">
            <span>Location Status</span>
            <strong>{lat ? 'Farm location detected' : 'Farm location not available'}</strong>
          </article>
        </div>
      </section>

      <section className="card analytics-band">
        <div className="section-title-row">
          <h2>Crop Health Snapshot</h2>
          <span className="pill">Auto-refreshed from scan history</span>
        </div>

        <div className="analytics-grid">
          <article className="analytics-tile">
            <span>Total Scans</span>
            <strong>{insights.totalScans}</strong>
          </article>
          <article className="analytics-tile">
            <span>Average Confidence</span>
            <strong>{insights.avgConfidence}%</strong>
          </article>
          <article className="analytics-tile">
            <span>Most Frequent Finding</span>
            <strong>{insights.topDisease.replaceAll('_', ' ')}</strong>
          </article>
          <article className="analytics-tile analytics-tile--trend">
            <span>Confidence Trend (last 8 scans)</span>
            {loadingInsights ? (
              <LeafLoader variant="panel" label="Loading insights" />
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
              <h2>Plant Disease Analyzer</h2>
              <p>Upload a clear image of a plant leaf to detect diseases using AI. The system will identify the disease, explain its causes, and recommend treatment options.</p>
            </div>
            <button className="btn outline" onClick={callHealth}>
              Health Check
            </button>
          </div>

          <div className="panel-card__body">
            <input
              className="input"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && <p className="panel-muted">Selected file: {selectedFile.name}</p>}
            <button className="btn primary" onClick={analyzeLeaf} disabled={loadingPrediction}>
              Analyze Leaf
            </button>

            {loadingPrediction && <LeafLoader variant="panel" label="Analyzing plant disease" />}

            {prediction && (
              <div className="result-panel">
                <div className="result-panel__heading">
                  <strong>{prediction.disease_name.replaceAll('_', ' ')}</strong>
                  <span className="pill">Confidence {(prediction.confidence * 100).toFixed(2)}%</span>
                </div>

                <div className="table-like">
                  <span className="label-muted">Description</span>
                  <span>{prediction.description || 'No description available.'}</span>
                  <span className="label-muted">Cause</span>
                  <span>{prediction.cause || 'No cause available.'}</span>
                  <span className="label-muted">Treatment</span>
                  <span>{prediction.treatment || 'No treatment available.'}</span>
                </div>

                <div className="pill-row">
                  {(prediction.recommended_medicines || []).length > 0 ? (
                    prediction.recommended_medicines.map((medicine) => (
                      <span className="pill" key={medicine}>
                        {medicine}
                      </span>
                    ))
                  ) : (
                    <span className="pill">No medicine recommendation provided</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Medicine Authenticity Verification</h2>
              <p>Scan or enter the batch code printed on agro-medicine bottles to verify product authenticity and ensure the medicine is genuine.</p>
            </div>
          </div>

          <div className="panel-card__body">
            <input className="input" placeholder="Enter batch code" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} />

            <div className="inline-row">
              <button className="btn ghost" onClick={scanBatchCode}>
                Scan via Camera
              </button>
              <button className="btn primary" onClick={verifyBatch} disabled={loadingBatch}>
                Verify Batch
              </button>
            </div>

            <p className="panel-muted">Camera readout: {cameraResult || 'No value captured yet.'}</p>
            <div id="preview" className="preview-window" />

            {loadingBatch && <LeafLoader variant="panel" label="Validating batch record" />}

            {batchResult && (
              <div className={`verification-banner ${batchResult.is_valid ? 'ok' : 'error'}`}>
                <strong>{batchResult.is_valid ? 'Valid Batch' : 'Invalid Batch'}</strong>
                <span>Code: {batchResult.batch_code}</span>
                <span>
                  {batchResult.medicine.brand_name || 'Unknown brand'} | {batchResult.medicine.company || 'Unknown company'}
                </span>
                <span>
                  Active ingredient: {batchResult.medicine.active_ingredient || 'N/A'} ({batchResult.medicine.concentration || 'N/A'})
                </span>
                <span>
                  Crop: {batchResult.medicine.crop_type || 'N/A'} | Disease category: {batchResult.medicine.disease_category || 'N/A'}
                </span>
              </div>
            )}
          </div>
        </article>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="quick-jump-grid">
        <Link to="/profile" className="card quick-jump-card">
          <h3>Account Settings</h3>
          <p>Update geo coordinates and secure email identity.</p>
        </Link>
        <Link to="/history" className="card quick-jump-card">
          <h3>Scan History</h3>
          <p>Track diagnosis confidence and treatment timeline.</p>
        </Link>
      </section>
    </div>
  );
};

export default Dashboard;
