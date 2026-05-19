import type { FrequencyDependencies } from '@/lib/frequencyFilter';
import {
  pricingParamAppliesToSelection,
  type PricingParamRow,
} from '@/lib/pricingParameterVisibility';

export function packageMatchesDependencyAllowlist(
  pkg: { id?: string; name?: string },
  allowlist: string[] | null | undefined,
): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  const id = String(pkg.id ?? '').trim();
  const name = String(pkg.name ?? '').trim();
  return allowlist.includes(id) || (name.length > 0 && allowlist.includes(name));
}

function packagePassesForm2RowDependencies(
  pkg: PricingParamRow,
  ctx: {
    selectedFrequency: string;
    selectedServiceName: string;
    selectedBedroomTier?: string | null;
  },
): boolean {
  const freqTrim = ctx.selectedFrequency.trim();
  const svcTrim = ctx.selectedServiceName.trim();
  const bedTrim = String(ctx.selectedBedroomTier ?? '').trim();

  if (pkg.show_based_on_frequency) {
    const freqCsv = String(pkg.frequency ?? '').trim();
    if (freqCsv && !pricingParamAppliesToSelection(
      {
        show_based_on_frequency: true,
        frequency: pkg.frequency,
        show_based_on_service_category: false,
        show_based_on_service_category2: false,
      },
      freqTrim,
      svcTrim,
      bedTrim,
    )) {
      return false;
    }
  }

  if (pkg.show_based_on_service_category) {
    const svcCsv = String(pkg.service_category ?? '').trim();
    if (svcCsv && !pricingParamAppliesToSelection(
      {
        show_based_on_frequency: false,
        show_based_on_service_category: true,
        service_category: pkg.service_category,
        show_based_on_service_category2: false,
      },
      freqTrim,
      svcTrim,
      bedTrim,
    )) {
      return false;
    }
  }

  if (pkg.show_based_on_service_category2) {
    const tierCsv = String(pkg.service_category2 ?? '').trim();
    if (tierCsv && !pricingParamAppliesToSelection(
      {
        show_based_on_frequency: false,
        show_based_on_service_category: false,
        show_based_on_service_category2: true,
        service_category2: pkg.service_category2,
      },
      freqTrim,
      svcTrim,
      bedTrim,
    )) {
      return false;
    }
  }

  return true;
}

export function isForm2PackageCustomerVisible(pkg: { display?: unknown }): boolean {
  const d = String(pkg.display ?? '').trim();
  if (d === 'Admin Only') return false;
  if (!d) return true;
  return (
    d.includes('Customer') ||
    d.includes('Frontend') ||
    d.includes('customer') ||
    d.includes('frontend')
  );
}

/**
 * Form 2 booking/admin: package visibility from dependency configuration only —
 * frequency → Packages, service → variables.Packages, and each package's Dependencies tab.
 * Not filtered by selected item or pricing_variable_id.
 */
export function form2PackagePassesBookingVisibility(
  pkg: PricingParamRow,
  ctx: {
    frequencyDeps: FrequencyDependencies | null;
    /** Service category → variables.Packages allowlist (ids or names). */
    servicePackageAllowlist: string[] | null;
    selectedFrequency: string;
    selectedServiceName: string;
    selectedBedroomTier?: string | null;
    serviceUsesFrequencyDeps: boolean;
  },
): boolean {
  if (!isForm2PackageCustomerVisible(pkg)) return false;

  if (!packageMatchesDependencyAllowlist(pkg, ctx.servicePackageAllowlist)) return false;

  const frequencyPackageAllowlist =
    ctx.frequencyDeps?.sqftVariables?.map((x) => String(x)) ?? null;
  if (!packageMatchesDependencyAllowlist(pkg, frequencyPackageAllowlist)) return false;

  const needsRowRules =
    Boolean(pkg.show_based_on_frequency) ||
    Boolean(pkg.show_based_on_service_category) ||
    Boolean(pkg.show_based_on_service_category2);

  if (needsRowRules) {
    return packagePassesForm2RowDependencies(pkg, {
      selectedFrequency: ctx.selectedFrequency,
      selectedServiceName: ctx.selectedServiceName,
      selectedBedroomTier: ctx.selectedBedroomTier,
    });
  }

  return true;
}
