import { useTranslation } from 'react-i18next';

import type { WaterGuidance } from '../types/areaIntelligence';
import { localizeAgricultureText, localizeNumericText } from '../utils/localization';

type WaterRequirementTableProps = {
  items: WaterGuidance[];
};

const WaterRequirementTable = ({ items }: WaterRequirementTableProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const cropsCountLabel = localizeNumericText(t('area.cropsCount', { count: items.length }), language);

  return (
    <section className="card water-guidance-card">
      <div className="section-title-row">
        <h2>💧 {t('area.waterTitle')}</h2>
        <span className="pill">{cropsCountLabel}</span>
      </div>

      <div className="water-table-wrap">
        <table className="water-table">
          <thead>
            <tr>
              <th>🌾 {t('area.fields.cropName')}</th>
              <th>💧 {t('area.fields.water')}</th>
              <th>🚿 {t('area.fields.irrigationMethod')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.crop_name}>
                <td>{item.crop_name}</td>
                <td>{localizeAgricultureText(item.water_requirement, language)}</td>
                <td>
                  <span className="pill">{localizeAgricultureText(item.recommended_method, language)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default WaterRequirementTable;
