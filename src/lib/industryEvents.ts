// Custom event system for industry changes
export const INDUSTRY_CHANGED_EVENT = 'industryChanged';

export function dispatchIndustryChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INDUSTRY_CHANGED_EVENT));
  }
}

export function addIndustryChangeListener(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener(INDUSTRY_CHANGED_EVENT, callback);
  }
}

export function removeIndustryChangeListener(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.removeEventListener(INDUSTRY_CHANGED_EVENT, callback);
  }
}
