import type { ReactNode } from 'react';

function Svg({ size = 22, sw = 2.2, children }: { size?: number; sw?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconChart = () => (
  <Svg><path d="M3 20h18" /><path d="M6 16V10" /><path d="M11 16V5" /><path d="M16 16v-4" /></Svg>
);
export const IconCalc = () => (
  <Svg><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></Svg>
);
export const IconPlus = () => <Svg sw={2.6}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconRefresh = () => <Svg size={20}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 4v5h-5" /></Svg>;
export const IconGear = () => (
  <Svg size={20} sw={2}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
export const IconBack = () => <Svg><path d="M15 18l-6-6 6-6" /></Svg>;
export const IconLeft = () => <Svg size={20}><path d="M15 18l-6-6 6-6" /></Svg>;
export const IconRight = () => <Svg size={20}><path d="M9 18l6-6-6-6" /></Svg>;
export const IconCheck = () => <Svg size={20} sw={2.4}><path d="M20 6L9 17l-5-5" /></Svg>;
export const IconCopy = () => <Svg size={20} sw={2}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>;
export const IconDel = () => (
  <Svg size={24} sw={2}><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="M17 9l-6 6M11 9l6 6" /></Svg>
);
export const IconCloudOff = () => (
  <Svg size={16} sw={2}><path d="M3 3l18 18" /><path d="M8 7.5A6 6 0 0 1 17.7 10H18a4 4 0 0 1 2.5 7.1M16 19H7a5 5 0 0 1-1.5-9.8" /></Svg>
);
export const IconCloud = () => <Svg size={16} sw={2}><path d="M18 10h-.3A6 6 0 1 0 7 17h11a4 4 0 0 0 0-8z" /></Svg>;
