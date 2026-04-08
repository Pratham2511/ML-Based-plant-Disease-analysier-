import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LeafLoader from '../components/LeafLoader';
import AreaSelector from '../components/AreaSelector';
import SoilReportCard from '../components/SoilReportCard';
import CropCard from '../components/CropCard';
import CropDetailsModal from '../components/CropDetailsModal';
import WaterRequirementTable from '../components/WaterRequirementTable';
import ReadAloudButton from '../components/ReadAloudButton';
import api from '../lib/api';
import type { AreaIntelligenceResponse, CropRecommendation, DetectDistrictResponse } from '../types/areaIntelligence';
import { localizeDistrictName } from '../utils/districtLocalization';
import { localizeAgricultureText } from '../utils/localization';
import { useFarmContext } from '../context/FarmContext';

const DISTRICT_ALIASES: Record<string, string> = {
  mumbai: 'Mumbai City',
  bombay: 'Mumbai City',
  sambhajinagar: 'Aurangabad',
};

const normalizeDistrictName = (district: string, availableDistricts: string[]) => {
  const cleanDistrict = district.trim();
  if (!cleanDistrict) return '';

  const exact = availableDistricts.find((entry) => entry.toLowerCase() === cleanDistrict.toLowerCase());
  if (exact) return exact;

  const aliasTarget = DISTRICT_ALIASES[cleanDistrict.toLowerCase()];
  if (!aliasTarget) return cleanDistrict;

  return availableDistricts.find((entry) => entry.toLowerCase() === aliasTarget.toLowerCase()) || aliasTarget;
};

const AreaIntelligence = () => {
  const { t, i18n } = useTranslation();
  const { activeFarm } = useFarmContext();
  const language = i18n.language;

  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectionSource, setDetectionSource] = useState('');
  const [districtRefreshToken, setDistrictRefreshToken] = useState(0);

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [detectingArea, setDetectingArea] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState('');

  const [insights, setInsights] = useState<AreaIntelligenceResponse | null>(null);
  const [activeCrop, setActiveCrop] = useState<CropRecommendation | null>(null);

  const applyDistrictSelection = (district: string, source = 'manual-select') => {
    const normalized = normalizeDistrictName(district, districts);
    setDetectionSource(source);
    setActiveCrop(null);
    setSelectedDistrict(normalized);
    setDistrictRefreshToken((token) => token + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingDistricts(true);
    setError('');

    api
      .get('/area-intelligence/districts')
      .then((response) => {
        if (cancelled) return;

        const districtList = (response.data?.districts || []) as string[];
        setDistricts(districtList);
        setSelectedDistrict((prev) => {
          if (activeFarm?.district && districtList.includes(activeFarm.district)) {
            return activeFarm.district;
          }
          if (prev && districtList.includes(prev)) {
            return prev;
          }
          return districtList[0] || '';
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('area.errors.districtLoad'));
          setDistricts([]);
          setSelectedDistrict('');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t, activeFarm?.district]);

  useEffect(() => {
    if (!activeFarm?.district) return;
    if (!districts.includes(activeFarm.district)) return;
    setSelectedDistrict(activeFarm.district);
  }, [activeFarm?.district, districts]);

  const handleLocationSuccess = async (latitudeValue: number, longitudeValue: number) => {
    const lat = Number(latitudeValue.toFixed(6));
    const lng = Number(longitudeValue.toFixed(6));

    setLatitude(lat);
    setLongitude(lng);

    try {
      const response = await api.post('/area-intelligence/detect-district', {
        latitude: lat,
        longitude: lng,
      });

      const payload = response.data as DetectDistrictResponse;
      applyDistrictSelection(payload.district, payload.source);
    } catch {
      setError(t('area.errors.detectFailed'));
    } finally {
      setDetectingArea(false);
    }
  };

  const handleLocationError = (message?: string) => {
    if (message) {
      console.warn('Location permission denied or unavailable:', message);
    }
    setError(t('area.errors.locationDenied'));
    setDetectingArea(false);
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported in this browser');
      handleLocationError();
      return;
    }

    setDetectingArea(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: positionLatitude, longitude: positionLongitude } = position.coords;
        handleLocationSuccess(positionLatitude, positionLongitude);
      },
      (geoError) => {
        handleLocationError(geoError.message);
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

  useEffect(() => {
    if (!selectedDistrict) return;

    let cancelled = false;
    setLoadingInsights(true);
    setError('');

    api
      .get('/area-intelligence/insights', {
        params: {
          district: selectedDistrict,
          refreshToken: districtRefreshToken,
        },
      })
      .then((response) => {
        if (cancelled) return;
        setInsights(response.data as AreaIntelligenceResponse);
      })
      .catch(() => {
        if (!cancelled) {
          setInsights(null);
          setError(t('area.errors.insightLoad'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInsights(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDistrict, districtRefreshToken, t]);

  const detectMyArea = () => {
    requestLocationPermission();
  };

  const cropNarrationText = useMemo(() => {
    if (!insights) return '';
    return insights.recommended_crops
      .map(
        (crop) =>
          `${localizeAgricultureText(crop.crop_name, language)}. ${t('area.fields.season')}: ${localizeAgricultureText(crop.growing_season, language)}. ${t('area.fields.water')}: ${localizeAgricultureText(crop.water_requirement, language)}. ${t('area.fields.fertilizer')}: ${localizeAgricultureText(crop.fertilizer_recommendation, language)}. ${t('area.fields.risk')}: ${localizeAgricultureText(crop.pest_disease_risk_level, language)}.`
      )
      .join(' ');
  }, [insights, language, t]);

  const buildCropCardNarration = (crop: CropRecommendation) => {
    return [
      `${localizeAgricultureText(crop.crop_name, language)}.`,
      `${t('area.fields.season')}: ${localizeAgricultureText(crop.growing_season, language)}.`,
      `${t('area.fields.water')}: ${localizeAgricultureText(crop.water_requirement, language)}.`,
      `${t('area.fields.yield')}: ${localizeAgricultureText(crop.expected_yield, language)}.`,
      `${t('area.fields.risk')}: ${localizeAgricultureText(crop.pest_disease_risk_level, language)}.`,
      `${t('area.fields.marketDemand')}: ${localizeAgricultureText(crop.market_demand_indicator, language)}.`,
    ].join(' ');
  };

  return (
    <div className="area-layout">
      <section className="card area-hero">
        <div>
          <p className="subtitle">{t('area.subtitle')}</p>
          <h1 className="headline">{t('area.title')}</h1>
          <p className="lead">{t('area.lead')}</p>
        </div>

        <div className="area-kpis">
          <article className="kpi-tile">
            <span>{t('area.detectedDistrict')}</span>
            <strong>{selectedDistrict ? localizeDistrictName(selectedDistrict, language) : '-'}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('area.advisoryStatus')}</span>
            <strong>{loadingInsights ? t('common.loading') : t('area.ready')}</strong>
          </article>
          <article className="kpi-tile">
            <span>{t('area.detectionSource')}</span>
            <strong>{detectionSource || '-'}</strong>
          </article>
        </div>
      </section>

      <AreaSelector
        districts={districts}
        selectedDistrict={selectedDistrict}
        latitude={latitude}
        longitude={longitude}
        detectionSource={detectionSource}
        detecting={detectingArea}
        onDistrictChange={(district) => applyDistrictSelection(district, 'manual-select')}
        onDetectArea={detectMyArea}
      />

      <div className="inline-row">
        <button className="btn outline location-retry-btn" onClick={requestLocationPermission}>
          📍 {t('common.enableLocation')}
        </button>
      </div>

      {loadingDistricts && (
        <div className="card">
          <LeafLoader variant="panel" label={t('common.loading')} />
        </div>
      )}

      {loadingInsights && (
        <div className="card">
          <LeafLoader variant="panel" label={t('area.loadingInsights')} />
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {insights && !loadingInsights && (
        <>
          <SoilReportCard
            soilReport={insights.soil_report}
            recommendations={insights.soil_improvement_recommendations}
          />

          <section className="card area-crops-section">
            <div className="section-title-row">
              <div>
                <h2>{t('area.cropTitle')}</h2>
                <p className="lead">{t('area.cropLead')}</p>
              </div>
              <ReadAloudButton text={cropNarrationText} labelKey="area.readCropAdvice" />
            </div>

            <div className="area-crop-grid">
              {insights.recommended_crops.map((crop) => (
                <div className="area-crop-card-shell" key={crop.crop_name}>
                  <CropCard crop={crop} onOpenDetails={setActiveCrop} />
                  <ReadAloudButton text={buildCropCardNarration(crop)} className="tts-read-btn" labelKey="common.readAloud" />
                </div>
              ))}
            </div>
          </section>

          <WaterRequirementTable items={insights.water_guidance} />
        </>
      )}

      <CropDetailsModal crop={activeCrop} onClose={() => setActiveCrop(null)} />
    </div>
  );
};

export default AreaIntelligence;
