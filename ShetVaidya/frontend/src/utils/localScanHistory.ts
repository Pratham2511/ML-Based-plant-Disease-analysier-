export type ScanPredictionSummary = {
  raw_class?: string;
  disease_name: string;
  confidence: number;
};

export type ScanHistoryAnalysis = {
  raw_class?: string;
  description?: string;
  cause?: string;
  treatment?: string;
  recommended_medicines?: string[];
  crop_type?: string;
  top_predictions?: ScanPredictionSummary[];
};

export type ScanHistoryItem = {
  id: string;
  farm_id?: string | null;
  disease_name: string;
  confidence: number;
  image_url: string;
  timestamp: string;
  analysis_json?: ScanHistoryAnalysis;
};

const STORAGE_KEY = 'shetvaidya_local_scan_history_v1';
const MAX_HISTORY_ITEMS = 80;

const normalizeConfidence = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric > 1) return Math.min(1, numeric / 100);
  return numeric;
};

const toIsoTimestamp = (value: unknown): string => {
  const text = String(value || '').trim();
  if (!text) return new Date().toISOString();
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const sanitizeTopPredictions = (value: unknown): ScanPredictionSummary[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const sanitized = value
    .map((prediction, index) => {
      const raw = prediction as Record<string, unknown>;
      const disease = String(raw?.disease_name || '').trim();
      if (!disease) return null;
      return {
        raw_class: raw?.raw_class ? String(raw.raw_class) : undefined,
        disease_name: disease,
        confidence: normalizeConfidence(raw?.confidence),
      };
    })
    .filter((entry): entry is ScanPredictionSummary => Boolean(entry));

  return sanitized.length ? sanitized : undefined;
};

const sanitizeAnalysis = (value: unknown): ScanHistoryAnalysis | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const recommended = Array.isArray(raw.recommended_medicines)
    ? raw.recommended_medicines.map((item) => String(item || '').trim()).filter(Boolean)
    : undefined;

  return {
    raw_class: raw.raw_class ? String(raw.raw_class) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    cause: raw.cause ? String(raw.cause) : undefined,
    treatment: raw.treatment ? String(raw.treatment) : undefined,
    recommended_medicines: recommended?.length ? recommended : undefined,
    crop_type: raw.crop_type ? String(raw.crop_type) : undefined,
    top_predictions: sanitizeTopPredictions(raw.top_predictions),
  };
};

const sanitizeScanHistoryItem = (value: unknown, fallbackId?: string): ScanHistoryItem | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = String(raw.id || fallbackId || '').trim();
  const diseaseName = String(raw.disease_name || '').trim();
  if (!id || !diseaseName) return null;

  return {
    id,
    farm_id: raw.farm_id ? String(raw.farm_id) : null,
    disease_name: diseaseName,
    confidence: normalizeConfidence(raw.confidence),
    image_url: String(raw.image_url || '').trim(),
    timestamp: toIsoTimestamp(raw.timestamp),
    analysis_json: sanitizeAnalysis(raw.analysis_json),
  };
};

const dedupeSignature = (item: ScanHistoryItem): string => {
  const ts = new Date(item.timestamp).getTime();
  const minuteBucket = Number.isFinite(ts) ? Math.floor(ts / 60000) : 0;
  return [
    String(item.disease_name || '').trim().toLowerCase(),
    String(item.image_url || '').trim().toLowerCase(),
    String(Math.round(item.confidence * 100)),
    String(minuteBucket),
  ].join('|');
};

const sortByTimestampDesc = (items: ScanHistoryItem[]): ScanHistoryItem[] => {
  return [...items].sort((a, b) => {
    const left = new Date(a.timestamp).getTime();
    const right = new Date(b.timestamp).getTime();
    return right - left;
  });
};

export const readLocalScanHistory = (): ScanHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed
      .map((item, index) => sanitizeScanHistoryItem(item, `local-${Date.now()}-${index}`))
      .filter((item): item is ScanHistoryItem => Boolean(item));

    return sortByTimestampDesc(sanitized).slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
};

export const writeLocalScanHistory = (items: ScanHistoryItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = items
      .map((item, index) => sanitizeScanHistoryItem(item, `local-${Date.now()}-${index}`))
      .filter((item): item is ScanHistoryItem => Boolean(item));

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sortByTimestampDesc(sanitized).slice(0, MAX_HISTORY_ITEMS))
    );
  } catch {
    // Ignore storage write failures (private mode or quota).
  }
};

export const appendLocalScanHistory = (item: ScanHistoryItem): ScanHistoryItem[] => {
  const current = readLocalScanHistory();
  const incoming = sanitizeScanHistoryItem(item, `local-${Date.now()}`);
  if (!incoming) return current;

  const byId = new Map<string, ScanHistoryItem>();
  for (const entry of current) {
    byId.set(entry.id, entry);
  }
  byId.set(incoming.id, incoming);

  const merged = sortByTimestampDesc([...byId.values()]).slice(0, MAX_HISTORY_ITEMS);
  writeLocalScanHistory(merged);
  return merged;
};

export const mergeScanHistory = (remoteItems: ScanHistoryItem[], localItems: ScanHistoryItem[]): ScanHistoryItem[] => {
  const sanitizedRemote = remoteItems
    .map((item, index) => sanitizeScanHistoryItem(item, `remote-${index}`))
    .filter((item): item is ScanHistoryItem => Boolean(item));

  const sanitizedLocal = localItems
    .map((item, index) => sanitizeScanHistoryItem(item, `local-${index}`))
    .filter((item): item is ScanHistoryItem => Boolean(item));

  const remoteSignatures = new Set(sanitizedRemote.map(dedupeSignature));
  const filteredLocal = sanitizedLocal.filter((item) => !remoteSignatures.has(dedupeSignature(item)));

  const mergedById = new Map<string, ScanHistoryItem>();
  for (const item of filteredLocal) {
    mergedById.set(item.id, item);
  }
  for (const item of sanitizedRemote) {
    mergedById.set(item.id, item);
  }

  return sortByTimestampDesc([...mergedById.values()]).slice(0, MAX_HISTORY_ITEMS);
};
