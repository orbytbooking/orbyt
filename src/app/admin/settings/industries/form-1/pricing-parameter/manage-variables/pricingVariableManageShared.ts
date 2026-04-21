import {
  normalizeFrequencyPopupDisplay,
  type FrequencyPopupDisplay,
} from "@/lib/frequencyPopupDisplay";
import {
  normalizePricingVariableDisplay,
  type PricingVariableDisplay,
} from "@/lib/pricing-variables";

export const VARIABLE_UI_DEFAULTS = {
  showExplanationIconOnForm: false,
  explanationTooltipText: "",
  enablePopupOnSelection: false,
  popupContent: "",
  popupDisplay: "customer_frontend_backend_admin" as FrequencyPopupDisplay,
  display: "customer_frontend_backend_admin" as PricingVariableDisplay,
  showBasedOnFrequency: false,
  frequencyOptions: [] as string[],
  showBasedOnServiceCategory: false,
  serviceCategoryOptions: [] as string[],
};

export type ManagePricingVariableUI = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  differentOnCustomerEnd: boolean;
  customerEndName: string;
  showExplanationIconOnForm: boolean;
  explanationTooltipText: string;
  enablePopupOnSelection: boolean;
  popupContent: string;
  popupDisplay: FrequencyPopupDisplay;
  display: PricingVariableDisplay;
  showBasedOnFrequency: boolean;
  frequencyOptions: string[];
  showBasedOnServiceCategory: boolean;
  serviceCategoryOptions: string[];
};

export function pricingVariableDisplayLabel(display: PricingVariableDisplay): string {
  if (display === "customer_frontend_backend_admin") return "Customer frontend, backend & admin";
  if (display === "customer_backend_admin") return "Customer backend & admin";
  if (display === "admin_only") return "Admin only";
  return display;
}

export function pricingVariableDependenciesSummary(v: ManagePricingVariableUI): string {
  const freqPart =
    v.showBasedOnFrequency && v.frequencyOptions.length > 0
      ? `Frequencies: ${v.frequencyOptions.join(", ")}`
      : "";
  const catPart =
    v.showBasedOnServiceCategory && v.serviceCategoryOptions.length > 0
      ? `Categories: ${v.serviceCategoryOptions.join(", ")}`
      : "";
  if (!freqPart && !catPart) return "All";
  return [freqPart, catPart].filter(Boolean).join(" · ");
}

export function mapApiPricingVariables(raw: unknown[]): ManagePricingVariableUI[] {
  return (raw || []).map((v: Record<string, unknown>) => ({
    id: String(v.id ?? ""),
    name: String(v.name ?? v.category ?? ""),
    category: String(v.category ?? v.name ?? ""),
    description: String(v.description ?? ""),
    isActive: Boolean(v.is_active ?? true),
    differentOnCustomerEnd: Boolean(v.different_on_customer_end),
    customerEndName: String(v.customer_end_name ?? ""),
    showExplanationIconOnForm: Boolean(v.show_explanation_icon_on_form),
    explanationTooltipText: String(v.explanation_tooltip_text ?? ""),
    enablePopupOnSelection: Boolean(v.enable_popup_on_selection),
    popupContent: String(v.popup_content ?? ""),
    popupDisplay: normalizeFrequencyPopupDisplay(v.popup_display as string | null | undefined),
    display: normalizePricingVariableDisplay(v.display as string | null | undefined),
    showBasedOnFrequency: Boolean(v.show_based_on_frequency),
    frequencyOptions: Array.isArray(v.frequency_options) ? [...(v.frequency_options as string[])] : [],
    showBasedOnServiceCategory: Boolean(v.show_based_on_service_category),
    serviceCategoryOptions: Array.isArray(v.service_category_options)
      ? [...(v.service_category_options as string[])]
      : [],
  }));
}

export function mapPricingVariableToPostBody(v: ManagePricingVariableUI) {
  return {
    id: v.id.startsWith("temp-") ? undefined : v.id,
    name: v.name,
    category: v.category,
    description: v.description || "",
    is_active: v.isActive,
    different_on_customer_end: v.differentOnCustomerEnd,
    customer_end_name: v.differentOnCustomerEnd ? v.customerEndName.trim() || null : null,
    show_explanation_icon_on_form: v.showExplanationIconOnForm,
    explanation_tooltip_text: v.showExplanationIconOnForm ? v.explanationTooltipText.trim() || null : null,
    enable_popup_on_selection: v.enablePopupOnSelection,
    popup_content: v.enablePopupOnSelection ? v.popupContent : "",
    popup_display: v.popupDisplay,
    display: v.display,
    show_based_on_frequency: v.showBasedOnFrequency,
    frequency_options: v.showBasedOnFrequency ? v.frequencyOptions : [],
    show_based_on_service_category: v.showBasedOnServiceCategory,
    service_category_options: v.showBasedOnServiceCategory ? v.serviceCategoryOptions : [],
  };
}

export function getManageVariableLabels(isForm2: boolean, industry: string) {
  if (isForm2) {
    return {
      loadFail: "Failed to load items",
      saveFail: "Failed to save items.",
      saveOkTitle: "Items saved",
      saveOkDesc: "Your items have been updated successfully.",
      defaultsFail: "Failed to add default items",
      defaultsOkTitle: "Default items added",
      addRequired: "Item name is required.",
      removeTitle: "Item removed",
      removeDesc: "The item has been removed.",
      catKeyRequired: "Item category key is required (must match how packages use this item).",
      nameRequired: "Name is required.",
      updateTitle: "Item updated",
      updateDesc: "The item has been updated successfully.",
      back: "Back to Packages",
      addBtn: "Add New",
      cardTitle: "Items",
      cardDesc:
        "You can place an item here such as sedan or motorcycle for a car washing service and later when someone selects the sedan they will be shown packages for that item.",
      emptyLine1: "No items defined.",
      emptyLine2: 'Click "Add New" above to create one, or add common defaults below.',
      defaultsBtn: "Add default items (Sq Ft, Bedroom, Bathroom, Hours, Rooms)",
      addDialogTitle: "Add new item",
      addField: "Item name",
      addPlaceholder: "e.g., Sedan, Motorcycle, 3-4 Bedroom Homes",
      addSubmit: "Add item",
      addTitle: "Item added",
      addPersistHint: "Click Save Changes to persist.",
      editTitle: "Edit item",
      editIntro:
        "Items are the choices customers pick on Form 2 (for example home size or vehicle type). Packages are offered after they choose an item.",
      editCategoryLabel: "Item category key",
      editCategoryHelp:
        "Must match the item group used when configuring packages for this industry (internal key).",
      editCategoryPh: "e.g., Sq Ft, Bedroom",
      updateBtn: "Save",
      cancelBtn: "Cancel",
      explTooltip:
        "When enabled, an info icon is shown next to this item on the customer booking form. Use the tooltip text below to explain it.",
      popupTooltip:
        "When enabled, a popup with the content below is shown when the customer selects this item (where visibility allows).",
      displayWhere: "Where should this item appear on booking flows?",
      displayWhereLong:
        "Where do you want this item to show up? Do you want customers to be able to see it? Do you want them to see it when they are booking when logged out or only when they have an account and are logged in, or do you want only admin/staff to see this item when booking—meaning customers cannot book for this item and only you can?",
      depsIntro:
        "Optionally show this item only for selected frequencies and/or service categories. Leave both off to apply for all bookings.",
      depsTabHint:
        "You have not enabled service category, frequency, or location dependencies for this item. Use the options below to limit when this item appears.",
      tabDetails: "Details",
      tabDependencies: "Dependencies",
    } as const;
  }
  return {
    loadFail: "Failed to load variables",
    saveFail: "Failed to save variables.",
    saveOkTitle: "Variables saved",
    saveOkDesc: "Pricing variables have been updated successfully.",
    defaultsFail: "Failed to add default variables",
    defaultsOkTitle: "Default variables added",
    addRequired: "Variable category is required.",
    removeTitle: "Variable removed",
    removeDesc: "The variable has been removed.",
    catKeyRequired: "Variable category key is required (must match pricing parameters).",
    nameRequired: "Name is required.",
    updateTitle: "Variable updated",
    updateDesc: "Variable has been updated successfully.",
    back: "Back to Pricing Parameters",
    addBtn: "Add Variable",
    cardTitle: `Manage Pricing Variables - ${industry}`,
    cardDesc: "Define and manage pricing variables that can be used for different pricing parameters.",
    emptyLine1: "No variables defined.",
    emptyLine2: 'Click "Add Variable" above to create one, or add common defaults below.',
    defaultsBtn: "Add default variables (Sq Ft, Bedroom, Bathroom, Hours, Rooms)",
    addDialogTitle: "Add New Variable",
    addField: "Variable Category",
    addPlaceholder: "e.g., Bedroom, Bathroom, Pool Size",
    addSubmit: "Add Variable",
    addTitle: "Variable added",
    addPersistHint: "Click Save Changes to persist.",
    editTitle: "Edit variable",
    editIntro:
      'Variables are used to build pricing structures (for example, tiers like "1 Bedroom" starting at a set price).',
    editCategoryLabel: "Variable category key",
    editCategoryHelp: "Must match the variable category on pricing parameters (internal key).",
    editCategoryPh: "e.g., Sq Ft, Bedroom",
    updateBtn: "Save",
    cancelBtn: "Cancel",
    explTooltip:
      "When enabled, an info icon is shown next to this variable on the customer booking form. Use the tooltip text below to explain it.",
    popupTooltip:
      "When enabled, a popup with the content below is shown when the customer selects an option for this variable (where visibility allows).",
    displayWhere: "Where should this variable appear on booking flows?",
    displayWhereLong: null as string | null,
    depsIntro:
      "Optionally show this variable only for selected frequencies and/or service categories. Leave both off to apply for all bookings.",
    depsTabHint: null as string | null,
    tabDetails: "Details",
    tabDependencies: "Dependencies",
  } as const;
}

export type ManageVariableLabels = ReturnType<typeof getManageVariableLabels>;
