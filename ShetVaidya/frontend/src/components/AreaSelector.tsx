import { useTranslation } from 'react-i18next';
import { localizeDistrictName } from '../utils/districtLocalization';
import { formatLocalizedNumber, localizeNumericText } from '../utils/localization';

type AreaSelectorProps = {
  districts: string[];
  selectedDistrict: string;
  latitude: number | null;
  longitude: number | null;
  detectionSource: string;
  detecting: boolean;
  onDistrictChange: (district: string) => void;
  onDetectArea: () => void;
};

const AreaSelector = ({
  districts,
  selectedDistrict,
  latitude,
  longitude,
  detectionSource,
  detecting,
  onDistrictChange,
  onDetectArea,
}: AreaSelectorProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const districtCoverageLabel = localizeNumericText(t('area.districtCoverage', { count: districts.length }), language);

  const coordinatesLabel =
    latitude !== null && longitude !== null
      ? `${formatLocalizedNumber(latitude, language, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}, ${formatLocalizedNumber(longitude, language, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
      : '-';

  return (
    <section className="card area-selector-card">
      <div className="section-title-row">
        <h2>{t('area.selectionTitle')}</h2>
        <span className="pill">{districtCoverageLabel}</span>
      </div>

      <div className="area-selector-grid">
        <div className="area-selector-field">
          <label className="field-label" htmlFor="district-select">
            {t('area.selectDistrict')}
          </label>
          <select
            id="district-select"
            className="input"
            value={selectedDistrict}
            onChange={(event) => onDistrictChange(event.target.value)}
          >
            <option value="">{t('area.districtPlaceholder')}</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {localizeDistrictName(district, language)}
              </option>
            ))}
          </select>
        </div>

        <div className="area-selector-actions">
          <button type="button" className="btn primary" onClick={onDetectArea} disabled={detecting}>
            {detecting ? t('area.detecting') : t('area.detectMyArea')}
          </button>

          <div className="area-meta">
            <span>
              {t('area.location')}: {coordinatesLabel}
            </span>
            <span>
              {t('area.detectionSource')}: {detectionSource || '-'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AreaSelector;
