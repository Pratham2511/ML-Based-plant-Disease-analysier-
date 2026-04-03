import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../components/AuthContext';
import api from '../lib/api';

export type Farm = {
  id: string;
  name: string;
  crop: string;
  areaAcres: number | null;
  district: string;
  soilType: string;
  irrigationType: string;
  isActive: boolean;
  createdAt: string;
};

type FarmPayload = {
  name: string;
  crop: string;
  area_acres: number | null;
  district: string | null;
  soil_type: string | null;
  irrigation_type: string | null;
};

type FarmContextType = {
  farms: Farm[];
  activeFarm: Farm | null;
  setActiveFarm: (farm: Farm) => Promise<void>;
  addFarm: (farm: Omit<Farm, 'id' | 'isActive' | 'createdAt'>) => Promise<void>;
  updateFarm: (id: string, farm: Partial<Omit<Farm, 'id' | 'createdAt'>>) => Promise<void>;
  deleteFarm: (id: string) => Promise<void>;
  refreshFarms: () => Promise<void>;
  loading: boolean;
};

const FarmContext = createContext<FarmContextType | undefined>(undefined);

const mapFarm = (raw: any): Farm => ({
  id: String(raw.id),
  name: String(raw.name || ''),
  crop: String(raw.crop || ''),
  areaAcres: raw.area_acres === null || raw.area_acres === undefined ? null : Number(raw.area_acres),
  district: String(raw.district || ''),
  soilType: String(raw.soil_type || ''),
  irrigationType: String(raw.irrigation_type || ''),
  isActive: Boolean(raw.is_active),
  createdAt: String(raw.created_at || ''),
});

const toPayload = (farm: Partial<Omit<Farm, 'id' | 'isActive' | 'createdAt'>>): FarmPayload => ({
  name: (farm.name || '').trim(),
  crop: (farm.crop || '').trim(),
  area_acres: farm.areaAcres === null || farm.areaAcres === undefined ? null : Number(farm.areaAcres),
  district: farm.district ? farm.district.trim() : null,
  soil_type: farm.soilType ? farm.soilType.trim() : null,
  irrigation_type: farm.irrigationType ? farm.irrigationType.trim() : null,
});

export const FarmProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFarms = async () => {
    if (!user) {
      setFarms([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/farms', { withCredentials: true });
      const records = Array.isArray(response.data) ? response.data : [];
      setFarms(records.map(mapFarm));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    refreshFarms();
  }, [user?.id, authLoading]);

  const addFarm = async (farm: Omit<Farm, 'id' | 'isActive' | 'createdAt'>) => {
    const payload = toPayload(farm);
    await api.post('/farms', payload, { withCredentials: true });
    await refreshFarms();
  };

  const updateFarm = async (id: string, farm: Partial<Omit<Farm, 'id' | 'createdAt'>>) => {
    const payload: Record<string, any> = {};
    if (farm.name !== undefined) payload.name = farm.name?.trim() || '';
    if (farm.crop !== undefined) payload.crop = farm.crop?.trim() || '';
    if (farm.areaAcres !== undefined) payload.area_acres = farm.areaAcres === null ? null : Number(farm.areaAcres);
    if (farm.district !== undefined) payload.district = farm.district?.trim() || null;
    if (farm.soilType !== undefined) payload.soil_type = farm.soilType?.trim() || null;
    if (farm.irrigationType !== undefined) payload.irrigation_type = farm.irrigationType?.trim() || null;

    await api.put(`/farms/${id}`, payload, { withCredentials: true });
    await refreshFarms();
  };

  const deleteFarm = async (id: string) => {
    await api.delete(`/farms/${id}`, { withCredentials: true });
    await refreshFarms();
  };

  const setActiveFarm = async (farm: Farm) => {
    await api.post(`/farms/${farm.id}/activate`, undefined, { withCredentials: true });
    await refreshFarms();
  };

  const activeFarm = useMemo(() => farms.find((farm) => farm.isActive) || null, [farms]);

  return (
    <FarmContext.Provider
      value={{
        farms,
        activeFarm,
        setActiveFarm,
        addFarm,
        updateFarm,
        deleteFarm,
        refreshFarms,
        loading,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
};

export const useFarmContext = () => {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarmContext must be used within FarmProvider');
  }
  return context;
};
