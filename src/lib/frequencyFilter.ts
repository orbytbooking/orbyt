import { IndustryFrequency } from '@/types/booking';

export interface FrequencyDependencies {
  serviceCategories: string[];
  bathroomVariables: string[];
  sqftVariables: string[];
  bedroomVariables: string[];
  excludeParameters: string[];
  extras: string[];
}

export interface FilterOptions {
  serviceCategories?: Array<{ id: string; name: string }>;
  bathroomVariables?: Array<{ id: string; name: string; variable_category: string }>;
  sqftVariables?: Array<{ id: string; name: string; variable_category: string }>;
  bedroomVariables?: Array<{ id: string; name: string; variable_category: string }>;
  excludeParameters?: Array<{ id: string; name: string }>;
  extras?: Array<{ id: string; name: string }>;
}

/**
 * Fetches frequency dependencies for a given industry and frequency
 */
export async function getFrequencyDependencies(
  industryId: string, 
  frequencyName: string
): Promise<FrequencyDependencies | null> {
  try {
    const response = await fetch(`/api/industry-frequency?industryId=${industryId}`);
    if (!response.ok) {
      console.error('Failed to fetch frequencies:', response.statusText);
      return null;
    }

    const data = await response.json();
    const frequencies = data.frequencies || [];
    
    // Find the frequency that matches the selected frequency name
    const selectedFrequency = frequencies.find((freq: IndustryFrequency) => 
      freq.name === frequencyName
    );

    if (!selectedFrequency) {
      console.log(`No frequency found with name: ${frequencyName}`);
      return null;
    }

    return {
      serviceCategories: selectedFrequency.service_categories || [],
      bathroomVariables: selectedFrequency.bathroom_variables || [],
      sqftVariables: selectedFrequency.sqft_variables || [],
      bedroomVariables: selectedFrequency.bedroom_variables || [],
      excludeParameters: selectedFrequency.exclude_parameters || [],
      extras: selectedFrequency.extras || [],
    };
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
    return variables;
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
  options: FilterOptions
): Promise<FilterOptions> {
  const dependencies = await getFrequencyDependencies(industryId, frequencyName);
  
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
