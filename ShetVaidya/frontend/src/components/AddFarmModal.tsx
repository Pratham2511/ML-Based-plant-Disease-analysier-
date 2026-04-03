import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MAHARASHTRA_DISTRICTS, localizeDistrictName } from '../utils/districtLocalization';
import type { Farm } from '../context/FarmContext';

type AddFarmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (farm: Omit<Farm, 'id' | 'isActive' | 'createdAt'>) => Promise<void>;
  initialFarm?: Farm | null;
};

type FarmForm = {
  name: string;
  crop: string;
  areaAcres: string;
  district: string;
  soilType: string;
  irrigationType: string;
};

const CROP_OPTIONS = [
  'Tomato', 'Onion', 'Wheat', 'Sugarcane', 'Cotton', 'Soybean', 'Potato', 'Rice', 'Jowar', 'Bajra',
  'Turmeric', 'Chickpea', 'Pigeon Pea', 'Pomegranate', 'Grape', 'Orange', 'Banana', 'Mango', 'Other',
];

const SOIL_KEYS = ['blackCotton', 'red', 'laterite', 'sandy', 'loamy', 'alluvial'] as const;
const IRRIGATION_KEYS = ['drip', 'sprinkler', 'flood', 'rainfed', 'canal', 'borewell'] as const;

const defaultForm: FarmForm = {
  name: '',
  crop: '',
  areaAcres: '',
  district: '',
  soilType: '',
  irrigationType: '',
};

const AddFarmModal = ({ isOpen, onClose, onSave, initialFarm }: AddFarmModalProps) => {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState<FarmForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialFarm) {
      setForm({
        name: initialFarm.name,
        crop: initialFarm.crop,
        areaAcres: initialFarm.areaAcres === null ? '' : String(initialFarm.areaAcres),
        district: initialFarm.district,
        soilType: initialFarm.soilType,
        irrigationType: initialFarm.irrigationType,
      });
      return;
    }
    setForm(defaultForm);
    setError('');
  }, [isOpen, initialFarm]);

  const isEdit = Boolean(initialFarm);

  const title = useMemo(() => (isEdit ? t('farms.editFarm') : t('farms.addFarm')), [isEdit, t]);

  if (!isOpen) return null;

  const onFieldChange = (field: keyof FarmForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return t('farms.farmName');
    if (!form.crop.trim()) return t('farms.mainCrop');
    if (!form.areaAcres.trim() || Number.isNaN(Number(form.areaAcres)) || Number(form.areaAcres) <= 0) {
      return t('farms.farmSize');
    }
    if (!form.district.trim()) return t('farms.district');
    return '';
  };

  const handleSave = async () => {
    const issue = validate();
    if (issue) {
      setError(`${issue} is required`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: form.name.trim(),
        crop: form.crop.trim(),
        areaAcres: Number(form.areaAcres),
        district: form.district.trim(),
        soilType: form.soilType.trim(),
        irrigationType: form.irrigationType.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save farm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-farm-modal-overlay" role="presentation" onClick={onClose}>
      <div className="add-farm-modal-content" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="add-farm-modal__header">
          <h3>{title}</h3>
          <button type="button" className="btn ghost btn--compact" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="add-farm-modal__form">
          <label className="field-label" htmlFor="farm-name">{t('farms.farmName')} *</label>
          <input id="farm-name" className="input" value={form.name} onChange={(e) => onFieldChange('name', e.target.value)} />

          <label className="field-label" htmlFor="farm-crop">{t('farms.mainCrop')} *</label>
          <select id="farm-crop" className="input" value={form.crop} onChange={(e) => onFieldChange('crop', e.target.value)}>
            <option value="">{t('farms.selectCrop')}</option>
            {CROP_OPTIONS.map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="farm-area">{t('farms.farmSize')} *</label>
          <input id="farm-area" className="input" type="number" min={0.1} step={0.1} value={form.areaAcres} onChange={(e) => onFieldChange('areaAcres', e.target.value)} />

          <label className="field-label" htmlFor="farm-district">{t('farms.district')} *</label>
          <select id="farm-district" className="input" value={form.district} onChange={(e) => onFieldChange('district', e.target.value)}>
            <option value="">{t('farms.selectDistrict')}</option>
            {MAHARASHTRA_DISTRICTS.map((district) => (
              <option key={district} value={district}>{localizeDistrictName(district, i18n.language)}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="farm-soil">{t('farms.soilType')}</label>
          <select id="farm-soil" className="input" value={form.soilType} onChange={(e) => onFieldChange('soilType', e.target.value)}>
            <option value="">{t('farms.selectSoil')}</option>
            {SOIL_KEYS.map((key) => (
              <option key={key} value={key}>{t(`farms.soilTypes.${key}`)}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="farm-irrigation">{t('farms.irrigationType')}</label>
          <select id="farm-irrigation" className="input" value={form.irrigationType} onChange={(e) => onFieldChange('irrigationType', e.target.value)}>
            <option value="">{t('farms.selectIrrigation')}</option>
            {IRRIGATION_KEYS.map((key) => (
              <option key={key} value={key}>{t(`farms.irrigationTypes.${key}`)}</option>
            ))}
          </select>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="add-farm-modal__actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>{t('farms.cancel')}</button>
          <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>{t('farms.save')}</button>
        </div>
      </div>
    </div>
  );
};

export default AddFarmModal;
