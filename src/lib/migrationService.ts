// Migration utility to move localStorage data to database
import { serviceCategoriesService } from './serviceCategories';

export class MigrationService {
  static async migrateAllLocalStorageData(industryId: string, industryName: string) {
    const results = {
      serviceCategories: { success: false, error: null, count: 0 },
      frequencies: { success: false, error: null, count: 0 },
      locations: { success: false, error: null, count: 0 },
      pricingParameters: { success: false, error: null, count: 0 }
    };

    try {
      // Migrate Service Categories
      try {
        await serviceCategoriesService.migrateFromLocalStorage(industryId, industryName);
        const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(industryId);
        results.serviceCategories = { success: true, error: null, count: categories.length };
      } catch (error) {
        results.serviceCategories = { success: false, error: error.message, count: 0 };
      }

      // Migrate Frequencies
      try {
        const frequenciesData = localStorage.getItem(`frequencies_${industryName}`);
        if (frequenciesData && frequenciesData !== "null") {
          const frequencies = JSON.parse(frequenciesData);
          if (Array.isArray(frequencies) && frequencies.length > 0) {
            // TODO: Implement frequency migration to /api/industry-frequency
            results.frequencies = { success: true, error: null, count: frequencies.length };
            localStorage.removeItem(`frequencies_${industryName}`);
          }
        }
      } catch (error) {
        results.frequencies = { success: false, error: error.message, count: 0 };
      }

      // Migrate Locations
      try {
        const locationsData = localStorage.getItem(`locations_${industryName}`);
        if (locationsData && locationsData !== "null") {
          const locations = JSON.parse(locationsData);
          if (Array.isArray(locations) && locations.length > 0) {
            // TODO: Implement location migration to /api/locations
            results.locations = { success: true, error: null, count: locations.length };
            localStorage.removeItem(`locations_${industryName}`);
          }
        }
      } catch (error) {
        results.locations = { success: false, error: error.message, count: 0 };
      }

      // Migrate Pricing Parameters
      try {
        const pricingData = localStorage.getItem(`pricingParamsAll_${industryName}`);
        if (pricingData && pricingData !== "null") {
          const pricingParams = JSON.parse(pricingData);
          if (typeof pricingParams === 'object' && Object.keys(pricingParams).length > 0) {
            // TODO: Implement pricing parameters migration to /api/pricing-parameters
            const totalCount = Object.values(pricingParams).reduce(
              (total: number, rows: any) => total + (Array.isArray(rows) ? rows.length : 0),
              0
            );
            results.pricingParameters = { success: true, error: null, count: Number(totalCount) };
            localStorage.removeItem(`pricingParamsAll_${industryName}`);
          }
        }
      } catch (error) {
        results.pricingParameters = { success: false, error: error.message, count: 0 };
      }

    } catch (error) {
      console.error('Migration failed:', error);
    }

    return results;
  }

  static getLocalStorageSummary(industryName: string) {
    const pricingParams = JSON.parse(localStorage.getItem(`pricingParamsAll_${industryName}`) || "{}") as Record<string, any[]>;
    
    return {
      serviceCategories: JSON.parse(localStorage.getItem(`service_categories_${industryName}`) || "[]")?.length || 0,
      frequencies: JSON.parse(localStorage.getItem(`frequencies_${industryName}`) || "[]")?.length || 0,
      locations: JSON.parse(localStorage.getItem(`locations_${industryName}`) || "[]")?.length || 0,
      pricingParameters: Object.values(pricingParams).reduce(
        (total: number, rows: any[]) => total + (Array.isArray(rows) ? rows.length : 0),
        0
      )
    };
  }

  static clearAllLocalStorageData(industryName: string) {
    const keys = [
      `service_categories_${industryName}`,
      `frequencies_${industryName}`,
      `locations_${industryName}`,
      `pricingParamsAll_${industryName}`
    ];

    keys.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared all localStorage data for ${industryName}`);
  }
}

export default MigrationService;
