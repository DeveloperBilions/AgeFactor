// Design tokens matching the Long Health brand
export const COLORS = {
  // Primary palette
  beige: '#FEF9EF',
  cream: '#F5EEE1',
  surface: '#F4EFE6',
  terracotta: '#C07858',
  terracottaDark: '#A5603F',
  orange: '#B05A36',
  midnight: '#2A2B2F',
  text: '#3C3D42',
  textSecondary: '#6B6C73',
  textMuted: '#9A9BA1',

  // Status colors
  green: '#79BD8B',
  greenDark: '#5A9A6A',
  amber: '#E8A838',
  red: '#D95550',
  redDark: '#B83A36',
  blue: '#488AD5',

  // Biomarker status
  optimal: '#79BD8B',
  borderline: '#E8A838',
  low: '#D95550',
  high: '#D95550',
  critical: '#B83A36',

  // Borders
  border: '#E5DFD4',
  borderLight: '#EDE8DD',
} as const;

// Organ system display configuration
export const ORGAN_SYSTEMS = {
  liver: { name: 'Liver', label: 'Liver Function', color: '#79BD8B', icon: 'liver' },
  kidney: { name: 'Kidney', label: 'Kidney Function', color: '#488AD5', icon: 'kidney' },
  thyroid: { name: 'Thyroid', label: 'Thyroid Function', color: '#9B7FD4', icon: 'zap' },
  metabolic: { name: 'Metabolic', label: 'Metabolic Panel', color: '#E8A838', icon: 'settings' },
  blood: { name: 'Blood', label: 'Blood Cells', color: '#D95550', icon: 'droplets' },
  heart: { name: 'Heart', label: 'Cardiac Markers', color: '#EF4444', icon: 'heart' },
  nutrients: { name: 'Nutrients', label: 'Nutrients & Minerals', color: '#C07858', icon: 'apple' },
} as const;

export type OrganSystem = keyof typeof ORGAN_SYSTEMS;
export type BiomarkerStatus = 'optimal' | 'borderline' | 'low' | 'high' | 'critical';

export const STATUS_LABELS: Record<BiomarkerStatus, string> = {
  optimal: 'Optimal',
  borderline: 'Borderline',
  low: 'Low',
  high: 'High',
  critical: 'Critical',
};

export const RECOMMENDATION_ICONS: Record<string, string> = {
  diet: 'utensils-crossed',
  supplement: 'pill',
  lifestyle: 'heart-pulse',
  retest: 'flask-conical',
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
  critical: 'Critical',
};
