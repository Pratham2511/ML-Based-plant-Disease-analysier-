import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddFarmModal from './AddFarmModal';
import { useFarmContext, type Farm } from '../context/FarmContext';
import { localizeDistrictName } from '../utils/districtLocalization';

type FarmSelectorProps = {
  compact?: boolean;
};

const FarmSelector = ({ compact = false }: FarmSelectorProps) => {
  const { t, i18n } = useTranslation();
  const { farms, activeFarm, setActiveFarm, addFarm } = useFarmContext();

  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const activeLabel = useMemo(() => {
    if (!activeFarm) return t('farms.noFarms');
    return `${activeFarm.name} - ${activeFarm.crop}`;
  }, [activeFarm, t]);

  const onActivate = async (farm: Farm) => {
    await setActiveFarm(farm);
    setOpen(false);
  };

  return (
    <div className={`farm-selector ${compact ? 'farm-selector--compact' : ''}`}>
      <button type="button" className="farm-selector__trigger" onClick={() => setOpen((value) => !value)}>
        <span>🌾</span>
        <span>{activeLabel}</span>
        <span>▾</span>
      </button>

      {open ? (
        <div className="farm-selector__menu">
          {farms.length === 0 ? (
            <p className="panel-muted">{t('farms.noFarms')}</p>
          ) : (
            farms.map((farm) => (
              <button key={farm.id} type="button" className="farm-selector__item" onClick={() => onActivate(farm)}>
                <strong>{farm.isActive ? `✅ ${farm.name}` : farm.name} - {farm.crop}</strong>
                <span>{localizeDistrictName(farm.district || '-', i18n.language)} · {farm.areaAcres ?? '-'} {t('farms.acres')}</span>
              </button>
            ))
          )}
          <button type="button" className="farm-selector__add" onClick={() => { setShowAddModal(true); setOpen(false); }}>
            ➕ {t('farms.addFarm')}
          </button>
        </div>
      ) : null}

      <AddFarmModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addFarm}
      />
    </div>
  );
};

export default FarmSelector;
