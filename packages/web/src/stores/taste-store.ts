import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TasteProfileInfo {
  code: string;
  name: string;
  countryCode: string;
  flag: string;
  description: string;
  defaults: Record<string, number>;
}

export const PRESET_PROFILES: TasteProfileInfo[] = [
  {
    code: 'AUTHENTIC_VN',
    name: 'Vị chuẩn Việt Nam',
    countryCode: 'VN',
    flag: '🇻🇳',
    description: 'Hương vị truyền thống cân bằng, đậm đà nước mắm và rau thơm tươi.',
    defaults: {
      spice_level: 2,
      sweetness: 2,
      sourness: 2,
      fish_sauce_intensity: 3,
      herb_intensity: 4,
      oil_richness: 2,
    },
  },
  {
    code: 'KR_INSPIRED',
    name: 'Khẩu vị Hàn Quốc (Korean-style)',
    countryCode: 'KR',
    flag: '🇰🇷',
    description: 'Tăng vị cay nồng ấm, giảm mùi mắm nồng, hương vị đậm đà kích thích vị giác.',
    defaults: {
      spice_level: 4,
      sweetness: 2,
      sourness: 3,
      fish_sauce_intensity: 2,
      herb_intensity: 3,
      oil_richness: 3,
    },
  },
  {
    code: 'WESTERN_MILD',
    name: 'Phương Tây dịu nhẹ (Western Mild)',
    countryCode: 'US',
    flag: '🇺🇸',
    description: 'Ít cay, dịu mùi mắm, gia vị thanh nhẹ hài hòa, rau thơm chọn lọc.',
    defaults: {
      spice_level: 1,
      sweetness: 3,
      sourness: 2,
      fish_sauce_intensity: 1,
      herb_intensity: 2,
      oil_richness: 2,
    },
  },
  {
    code: 'JP_DELICATE',
    name: 'Nhật Bản thanh tao (Japanese Delicate)',
    countryCode: 'JP',
    flag: '🇯🇵',
    description: 'Vị thanh ngọt tự nhiên của nước dùng, tối giản cay và mắm, tôn vinh độ tươi của thịt.',
    defaults: {
      spice_level: 0,
      sweetness: 2,
      sourness: 1,
      fish_sauce_intensity: 1,
      herb_intensity: 2,
      oil_richness: 1,
    },
  },
];

interface TasteState {
  activeProfile: TasteProfileInfo;
  personalPreferences: Record<string, number>;
  setActiveProfile: (profileCode: string) => void;
  setCustomProfile: (profile: TasteProfileInfo) => void;
  setPreference: (attributeCode: string, value: number) => void;
  resetPreferences: () => void;
}

export const useTasteStore = create<TasteState>()(
  persist(
    (set) => ({
      activeProfile: PRESET_PROFILES[0],
      personalPreferences: {},
      setActiveProfile: (profileCode) => {
        const found = PRESET_PROFILES.find((p) => p.code === profileCode);
        if (found) {
          set({ activeProfile: found });
        }
      },
      setCustomProfile: (profile) => set({ activeProfile: profile }),
      setPreference: (attrCode, value) =>
        set((state) => ({
          personalPreferences: { ...state.personalPreferences, [attrCode]: value },
        })),
      resetPreferences: () => set({ personalPreferences: {} }),
    }),
    { name: 'vft-taste-profile' },
  ),
);
