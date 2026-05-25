"use client";

/**
 * Form 2 add-ons list — stored in `industry_form2_addons`, not shared with Form 1/3/4/5.
 * Reuses the Form 2 extras list with `/add-ons` path forcing `listingKind=addon`.
 */
import Form2ExtrasPage from "../extras/page";

export default function Form2AddOnsPage() {
  return <Form2ExtrasPage />;
}
