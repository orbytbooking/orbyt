import { IndustryFrequency } from '@/types/booking';
import { normalizeFrequencyLabelForMatch } from '@/lib/industryFrequencyRepeats';

export interface FrequencyDependencies {
  serviceCategories: string[];
  bathroomVariables: string[];
  sqftVariables: string[];
  bedroomVariables: string[];
  excludeParameters: string[];
  extras: string[];
}

/**
 * Maps a pricing-parameter `variable_category` (e.g. "Bathroom", "Sq Ft") to the
 * Form 1 frequency dependency name list. Returns null for categories that are not
 * restricted by those three lists (e.g. "Hours", custom groups).
 * Empty array means the admin selected no options for that category — show none.
 */
export function frequencyDepOptionNamesForCategory(
  variableCategory: string,
  deps: FrequencyDependencies,
): string[] | null {
  const k = variableCategory.trim().toLowerCase();
  if (!k) return null;
  if (k.includes('bedroom') || k === 'bed') {
    return [...(deps.bedroomVariables || [])];
  }
  if (k.includes('bathroom') || k.includes('bath')) {
    return [...(deps.bathroomVariables || [])];
  }
  const compact = k.replace(/\s/g, '');
  if (k.includes('sq ft') || compact.includes('sqft') || (k.includes('square') && k.includes('ft'))) {
    return [...(deps.sqftVariables || [])];
  }
  return null;
}

export interface FilterOptions {
  serviceCategories?: Array<{ id: string; name: string }>;
  bathroomVariables?: Array<{ id: string; name: string; variable_category: string }>;
  sqftVariables?: Array<{ id: string; name: string; variable_category: string }>;
  bedroomVariables?: Array<{ id: string; name: string; variable_category: string }>;
  excludeParameters?: Array<{ id: string; name: string }>;
  extras?: Array<{ id: string; name: string }>;
}

export type GetFrequencyDependenciesOptions = {
  /** Required to match Form 1 rows in industry_frequency (scoped per business). */
  businessId?: string;
};

/**
 * Fetches frequency dependencies for a given industry and frequency (Form 1 → Frequencies → dependencies).
 */
export async function getFrequencyDependencies(
  industryId: string,
  frequencyName: string,
  options?: GetFrequencyDependenciesOptions
): Promise<FrequencyDependencies | null> {
  if (!frequencyName?.trim()) {
    return null;
  }
  try {
    console.log(`=== FREQUENCY DEPENDENCIES DEBUG ===`);
    console.log(`Industry ID: ${industryId}`);
    console.log(`Business ID: ${options?.businessId ?? '(none)'}`);
    console.log(`Frequency Name: ${frequencyName}`);

    const params = new URLSearchParams();
    params.set('industryId', industryId);
    params.set('includeAll', 'true');
    if (options?.businessId?.trim()) {
      params.set('businessId', options.businessId.trim());
    }

    const response = await fetch(`/api/industry-frequency?${params.toString()}`);
    if (!response.ok) {
      console.error('Failed to fetch frequencies:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    const frequencies = data.frequencies || [];
    console.log('Available frequencies:', frequencies);

    const target = normalizeFrequencyLabelForMatch(frequencyName);
    const selectedFrequency = frequencies.find((freq: IndustryFrequency) =>
      normalizeFrequencyLabelForMatch(freq.name) === target
    );
    
    console.log('Selected frequency:', selectedFrequency);

    if (!selectedFrequency) {
      console.log(`No frequency found with name: ${frequencyName}`);
      return null;
    }

    const result = {
      serviceCategories: selectedFrequency.service_categories || [],
      bathroomVariables: selectedFrequency.bathroom_variables || [],
      sqftVariables: selectedFrequency.sqft_variables || [],
      bedroomVariables: selectedFrequency.bedroom_variables || [],
      excludeParameters: selectedFrequency.exclude_parameters || [],
      extras: selectedFrequency.extras || [],
    };
    
    console.log('Frequency dependencies result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching frequency dependencies:', error);
    return null;
  }
}

/**
 * Filters service categories based on frequency dependencies
 */
export function filterServiceCategories(
  categories: Array<{ id: string; name: string }>,
  dependencies: FrequencyDependencies
): Array<{ id: string; name: string }> {
  if (!dependencies.serviceCategories || dependencies.serviceCategories.length === 0) {
    return categories;
  }

  return categories.filter(category => 
    dependencies.serviceCategories.includes(String(category.id))
  );
}

/**
 * Filters variables based on frequency dependencies and category
 */
export function filterVariables(
  variables: Array<{ id: string; name: string; variable_category: string }>,
  dependencies: FrequencyDependencies,
  category: 'Bathroom' | 'Sq Ft' | 'Bedroom'
): Array<{ id: string; name: string; variable_category: string }> {
  let allowedVariables: string[] = [];

  switch (category) {
    case 'Bathroom':
      allowedVariables = dependencies.bathroomVariables || [];
      break;
    case 'Sq Ft':
      allowedVariables = dependencies.sqftVariables || [];
      break;
    case 'Bedroom':
      allowedVariables = dependencies.bedroomVariables || [];
      break;
  }

  if (allowedVariables.length === 0) {
    return [];
  }

  return variables.filter(variable => 
    allowedVariables.includes(variable.name)
  );
}

/**
 * Filters exclude parameters based on frequency dependencies
 */
export function filterExcludeParameters(
  parameters: Array<{ id: string; name: string }>,
  dependencies: FrequencyDependencies
): Array<{ id: string; name: string }> {
  if (!dependencies.excludeParameters || dependencies.excludeParameters.length === 0) {
    return parameters;
  }

  return parameters.filter(param => 
    dependencies.excludeParameters.includes(param.name)
  );
}

/**
 * Filters extras based on frequency dependencies
 */
export function filterExtras(
  extras: Array<{ id: string; name: string }>,
  dependencies: FrequencyDependencies
): Array<{ id: string; name: string }> {
  if (!dependencies.extras || dependencies.extras.length === 0) {
    return extras;
  }

  return extras.filter(extra => 
    dependencies.extras.includes(String(extra.id))
  );
}

/**
 * Applies all frequency-based filters to the provided options
 */
export async function applyFrequencyFilters(
  industryId: string,
  frequencyName: string,
  options: FilterOptions,
  depsOptions?: GetFrequencyDependenciesOptions
): Promise<FilterOptions> {
  const dependencies = await getFrequencyDependencies(industryId, frequencyName, depsOptions);
  
  if (!dependencies) {
    // If no dependencies found, return all options
    return options;
  }

  const filteredOptions: FilterOptions = {};

  if (options.serviceCategories) {
    filteredOptions.serviceCategories = filterServiceCategories(
      options.serviceCategories,
      dependencies
    );
  }

  if (options.bathroomVariables) {
    filteredOptions.bathroomVariables = filterVariables(
      options.bathroomVariables,
      dependencies,
      'Bathroom'
    );
  }

  if (options.sqftVariables) {
    filteredOptions.sqftVariables = filterVariables(
      options.sqftVariables,
      dependencies,
      'Sq Ft'
    );
  }

  if (options.bedroomVariables) {
    filteredOptions.bedroomVariables = filterVariables(
      options.bedroomVariables,
      dependencies,
      'Bedroom'
    );
  }

  if (options.excludeParameters) {
    filteredOptions.excludeParameters = filterExcludeParameters(
      options.excludeParameters,
      dependencies
    );
  }

  if (options.extras) {
    filteredOptions.extras = filterExtras(
      options.extras,
      dependencies
    );
  }

  return filteredOptions;
}
