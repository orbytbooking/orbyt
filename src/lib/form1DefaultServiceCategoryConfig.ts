/**
 * Default service category names, display, and allowed frequencies for Form 1 cleaning industries.
 * Matches the standard “Manage Service category” table (Both vs Admin + per-category frequency lists).
 * Frequency strings must match `industry_frequency.name` / admin frequency pickers.
 */
export const FORM1_DEFAULT_ALL_FREQUENCY_NAMES = [
  '2x per week',
  '3x per week',
  'Daily 5x per week',
  'One-Time',
  'Weekly',
  'Every Other Week',
  'Monthly',
] as const;

export type Form1ServiceCategoryKey =
  | 'deep'
  | 'basic'
  | 'move'
  | 'construction'
  | 'hourlyDeep'
  | 'hourlyBasic';

export type Form1ServiceCategoryDisplay = 'customer_frontend_backend_admin' | 'admin_only';

export const FORM1_SEEDED_SERVICE_CATEGORIES: ReadonlyArray<{
  key: Form1ServiceCategoryKey;
  name: string;
  display: Form1ServiceCategoryDisplay;
  selected_frequencies: readonly string[];
}> = [
  {
    key: 'deep',
    name: 'Deep Clean',
    display: 'customer_frontend_backend_admin',
    selected_frequencies: FORM1_DEFAULT_ALL_FREQUENCY_NAMES,
  },
  {
    key: 'basic',
    name: 'Basic Cleaning',
    display: 'customer_frontend_backend_admin',
    selected_frequencies: FORM1_DEFAULT_ALL_FREQUENCY_NAMES,
  },
  {
    key: 'move',
    name: 'Move In/Out Clean',
    display: 'customer_frontend_backend_admin',
    selected_frequencies: ['2x per week', 'Daily 5x per week', 'One-Time'],
  },
  {
    key: 'construction',
    name: 'Construction Clean Up',
    display: 'customer_frontend_backend_admin',
    selected_frequencies: ['2x per week', 'Daily 5x per week', 'One-Time'],
  },
  {
    key: 'hourlyDeep',
    name: 'Hourly Deep Clean',
    display: 'admin_only',
    selected_frequencies: ['2x per week', 'Daily 5x per week', 'One-Time'],
  },
  {
    key: 'hourlyBasic',
    name: 'Hourly Basic Clean',
    display: 'admin_only',
    selected_frequencies: [
      '2x per week',
      'Daily 5x per week',
      'Weekly',
      'Every Other Week',
      'Monthly',
    ],
  },
];

/** Initial “Add Service Category” form: public-facing category with full frequency list (edit as needed). */
export const FORM1_NEW_CATEGORY_FORM_DEFAULTS = {
  serviceCategoryFrequency: true,
  selectedFrequencies: [...FORM1_DEFAULT_ALL_FREQUENCY_NAMES] as string[],
  display: 'customer_frontend_backend_admin' as const,
};
