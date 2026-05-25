# Operating costs by plan (Orbyt)

This document explains **what it costs you (the platform) to run the product**, how that relates to **Starter, Growth, and Premium**, and how to use the companion spreadsheet. It is written for **finance, operations, and engineering** stakeholders who need a shared vocabulary for COGS and vendor spend.

---

## 1. Files in this documentation set

| File | Role |
|------|------|
| `docs/operating-cost-list-prices-by-plan-features-excel-safe.csv` | **Primary data:** vendor list prices, units, free-tier notes, upgrade guidance, and plan columns. Last row is an **example** COGS rollup per tenant per month. UTF-8 with BOM for Excel on Windows. |
| `docs/OPERATING_COSTS_BY_PLAN.md` | This file: concepts, column guide, vendor narrative, worked example, limitations. |
| `docs/OPERATING_COSTS_BY_PLAN.txt` | Same story in plain text (easy to paste into email or Google Docs). |

There is **no README row** in the CSV: **row 1** is the header; **row 2** is the first vendor line (Supabase Pro base).

---

## 2. What problem this answers

A typical question: *“What is our **cost price** to operate **one customer account** on Starter vs Growth vs Premium?”*

That is **not** the same as:

- The **subscription price** you charge tenants (revenue).
- The **sum of every vendor line** in the sheet (many rows are **per GB**, **per 1,000 events**, or **percent of payment**, and the stack is **shared across all tenants**).

This material supports:

1. **Unit economics** (rough COGS per tenant vs price).
2. **Vendor budgeting** (list prices and when to expect overages).
3. **Plan design** (features that drive variable cost, e.g. AI and SMS).

---

## 3. Core concepts

### 3.1 COGS and “cost price” (internal)

**COGS** (cost of goods sold), in this SaaS context, means **direct costs to deliver the service**: databases, hosting, email, maps APIs, AI usage, payment processing (if the platform pays it), and similar. It does **not** include salaries, office rent, or pure marketing spend unless you choose to model them elsewhere.

**Cost price to operate an account** means: *given how we host and integrate, what do we spend **per tenant per month** (or per equivalent unit), after we split shared bills fairly?* That number is **estimated** until you replace it with invoices and metering.

### 3.2 Multitenancy and allocation

Orbyt runs as a **multitenant** product: many customer accounts share **one** Supabase project, **one** app deployment, **one** email provider account, etc. Vendors bill **you once** (or by aggregate usage), not once per tenant.

So:

- Rows like **Supabase Pro $25/mo** or **Resend Pro $20/mo** are **platform-level** monthly fees.
- To get “per tenant,” you must **allocate** (for example: divide shared fixed cost by **active tenant count**, then add **variable** usage attributed to that tenant or tier).

The CSV **does not** auto-compute that split. The **SUMMARY** row is an **illustrative** rollup with assumptions spelled out in that row’s **Notes**.

### 3.3 List price vs your true cost

The **Source** column links to **public pricing pages**. Your actual bill may differ because of:

- Tax, currency, negotiated discounts, or annual commits.
- Free credits (e.g. Google Cloud).
- Overage patterns and real usage.

Treat the sheet as a **structured baseline**, then **reconcile to invoices** monthly or quarterly.

### 3.4 Pricing models: fixed plans, base + included usage, and “per what”

Every number in the CSV is tied to a **pricing model**. The **Unit** column is the source of truth for **per what**; this subsection is the narrative map.

| Pattern | What you pay | “Per what” / denominator | Examples in the spreadsheet |
|--------|---------------|---------------------------|------------------------------|
| **Fixed recurring (vendor plan)** | A **flat USD/month** (or **USD per paid seat / month**) for that product tier | **Per calendar month** for the **whole platform** (one bill), or **per seat** (Vercel). Usually includes **bundled allowances** up to vendor limits; not “per tenant” from the vendor. | Supabase Pro base ($25/mo); compute line ($10/mo example); Resend Pro base ($20/mo); Vercel Pro ($20/seat/mo); Hobby ($0/mo); IPv4 / PITR add-ons ($/mo) |
| **Included quota + overage** | Fixed plan includes **volume**; beyond that you pay **per meter unit** | **Per GB-month** (database or file storage), **per GB** (egress), **per 1,000 emails** after included sends | Supabase DB/file storage and egress overage rates; Resend overage ($/1k emails) |
| **Free allowance + meter (no platform flat on that SKU)** | First **N** events or messages **per month** at $0 for that SKU, then **per-1k** pricing | **Per 1,000** billable events **after** the free cap; separate **(ref)** rows show **N/month** (counts, **not** dollars) | Google Dynamic Maps / Geocoding: ref rows = **events/mo**; paid rows = **USD/1k** loads or requests. Resend Free row = **3000 emails/mo** reference |
| **Pure usage (pay as you go)** | Cost **only** from consumption on that meter | **Per 1M tokens** (input vs output), **per 1,000** tool calls, **per SMS** | OpenAI GPT-4o mini in/out; web search tool; SMS when **USD/msg** is filled |
| **Per payment (processing)** | Fee on each **successful charge** | **Decimal** = **fraction of charge amount** (e.g. 0.029 = 2.9%); **USD/txn** = **per successful transaction** | Stripe reference rows (usually merchant-paid unless you absorb) |
| **Internal rollup** | **Your** estimate after **allocation** | **Per tenant / month** (illustrative) | **SUMMARY** row: **USD/tenant-mo** only |

**Fixed vs variable (one-line check):** if tomorrow’s usage doubled, would this line item **stay about the same**? Then it behaves like **fixed** (or **included base**). If the bill **scales with GB, emails, map events, tokens, SMS, or GMV**, it is **variable** / **metered**.

**Per tenant:** Vendors almost never bill “per Orbyt tenant.” **Fixed** platform fees become **per-tenant** only after **you** divide by active tenants (or another rule). **SUMMARY** is already expressed as **USD per tenant-month** but is an **example**, not a vendor invoice line.

---

## 4. Plans in the product vs columns in the sheet

The spreadsheet uses **Starter**, **Growth**, and **Premium** as column labels. In the product, **plan entitlements** used for marketing and admin tooling are defined in code (for example `src/lib/pricing/pricingFeatures.ts`) and can be stored per plan in the database for Super Admin. **Important alignment for this cost model:**

- **AI Virtual Receptionist** is **off** for Starter and **on** for Growth and Premium in that feature table, so **OpenAI list rows show $0** on Starter for those line items unless you deliberately override behavior.
- **SMS notifications** are **off** on Starter and **on** on Growth and Premium in that table; the CSV still shows **TBD** for SMS **USD per message** because implementation and provider choice drive the number.

Always reconcile **“feature on/off”** with both **product** and **CSV** when you change plans.

---

## 5. Spreadsheet column reference (full)

| Column | Purpose |
|--------|---------|
| **Category** | High-level group: Supabase, Google Maps, Email, Hosting, Payments, AI, SMS, or **SUMMARY**. |
| **Feature_gate_in_plan** | Whether the cost applies to all plans or is tied to a feature (e.g. AI receptionist false on Starter). |
| **Line_item** | Human-readable name of the charge or rate. |
| **Source** | URL to vendor pricing/documentation, or `n/a` if not applicable. |
| **Free_or_included_before_overage** | What you get **before** metered overage: included quotas, $0 tiers, or “not included” for add-ons. Confirm on the vendor site. |
| **When_to_scale_Pro_or_paid_tier** | Practical trigger to **upgrade** compute, enable billing, buy a higher tier, or optimize usage. (Stripe is a **fee model**, not a “Pro SaaS” toggle in the same sense.) |
| **Unit** | The **meaning** of the numeric cells: `USD/mo`, `USD/GB-mo`, `USD/1k …`, `USD/txn`, `decimal (percent)`, `events/mo (ref)`, `emails/mo (ref)`, `USD/tenant-mo`, etc. **Section 3.4** explains fixed vs base+overage vs metered and what “per what” implies. |
| **Starter_USD_or_numeric_per_Unit_column** | Value for Starter; interpret using **Unit**. |
| **Growth_USD_or_numeric_per_Unit_column** | Value for Growth; same. |
| **Premium_USD_or_numeric_per_Unit_column** | Value for Premium; same. |
| **Notes** | Multitenant context, warnings (“not dollars”), pointers to code (e.g. OpenAI model). |

### 5.1 How to read the three value columns

- If **Unit** starts with **USD** (e.g. `USD/mo`, `USD/GB-mo`), the cell is a **US dollar amount** for that **unit** (per month, per GB-month, per 1,000 calls, etc.).
- If **Unit** is **`decimal (percent)`** or **`decimal (add-on)`**, the cell is a **ratio** applied to payment amount (e.g. `0.029` = 2.9% of the charge). It is **not** a dollar cell.
- If **Unit** contains **`(ref)`**, the cell is a **reference quantity** (free tier cap, included emails on Free tier), **not** a price.
- Cells may include **parentheses** to label non-dollar meanings (e.g. “fee: 2.9% of each card charge”).

**Do not** sum all vendor rows and call the result “COGS per tenant.” Shared fixed costs need **allocation**; usage rows need **volumes**.

---

## 6. Category-by-category explanation

### 6.1 Supabase

- **Pro base** and **compute** are recurring **platform** costs. Your real compute line may not be exactly the example `$10/mo`; use the dashboard.
- **DB storage, file storage, egress** rows are **overage unit rates** after included Pro quotas. Cost scales with **total** usage across all tenants.
- **IPv4** and **PITR** are **optional add-ons**; use `0` in your model if disabled.

### 6.2 Google Maps

- Typical pattern: **~10,000 events/month free per SKU** (see the dedicated **free cap** rows), then **per-1,000** prices for Dynamic Maps loads and Geocoding.
- Costs are driven by **aggregate** map loads and geocode requests across the product. **Caching and batching** reduce spend.
- Enable Cloud **billing and budgets** before relying on free tiers in production.

### 6.3 Email (Resend)

- **Pro** row reflects a **monthly platform** fee with included send volume (verify current Resend tiers).
- **Overage** is per 1,000 emails after the included allowance.
- **Free tier** row (3,000/mo) is **reference** for comparison; production often uses Pro.

### 6.4 Hosting (Vercel)

- **Hobby** is **$0** base with strict limits; **Pro** is priced **per seat** per month. Multiply seats in your internal cost model.
- Move from Hobby to Pro for **production** and team features when limits or policy require it.

### 6.5 Payments (Stripe) — reference

- Listed as **reference** because fees are usually paid by the **merchant** (your customer), not as platform COGS—**unless** your business model absorbs them.
- Percent and add-on rows are **decimals on charge amount**; fixed fee row is **USD per successful transaction**.

### 6.6 AI (OpenAI)

- Rates are **per 1M tokens** (input/output) and optional **web search** per 1,000 calls when used.
- Production receptionist usage in this repo uses **`gpt-4o-mini`** (see `src/app/api/chat/receptionist/route.ts`). If you change model, update both **vendor rates** and **documentation**.
- **Starter** shows **0** for these rows when AI receptionist is a **gated** feature.

### 6.7 SMS (future)

- **TBD** until a provider is integrated and priced. **Starter** remains `0` in the example row text when SMS is not implemented; Growth/Premium show **TBD** for USD per message.

### 6.8 SUMMARY row

- **Single illustrative number per plan:** estimated **COGS USD per tenant per month**.
- The **Notes** cell lists assumptions (example: **25** active tenants, **$65/mo** shared stack split, plus illustrative usage and AI). **Replace with your data.**

---

## 7. Worked example (matches current SUMMARY row)

The CSV **SUMMARY** row (last line) shows:

| Plan | Example COGS / tenant / month (USD) |
|------|--------------------------------------|
| Starter | 2.75 |
| Growth | 4.45 |
| Premium | 7.40 |

**Illustrative decomposition** (from that row’s Notes; not from summing every line in the sheet):

| Component | Starter | Growth | Premium |
|-----------|---------|--------|---------|
| Share of shared stack (e.g. $65/mo ÷ 25 tenants) | 2.60 | 2.60 | 2.60 |
| Extra usage (email, maps, storage overage vs light use) | 0.15 | 0.65 | 1.80 |
| OpenAI (AI receptionist; off on Starter in this example) | 0.00 | 1.20 | 3.00 |
| **Total** | **2.75** | **4.45** | **7.40** |

This is **not audited**. Use it as a **template** until finance replaces numbers with **actuals**.

---

## 8. Using the CSV in Excel

- Prefer **Data → From Text/CSV** and UTF-8 if anything looks garbled.
- The file is saved with a **UTF-8 BOM** so Excel on Windows often detects encoding correctly.
- Cells that mix **text and numbers** (e.g. Stripe explanation in parentheses) are **labels**, not formula inputs unless you strip the text.
- After editing, **re-save as CSV UTF-8** if you round-trip through Excel to avoid mojibake.

---

## 9. Limitations and disclaimers

- Numbers are **examples** or **list prices** from vendor pages, **not** Orbyt’s confidential invoices.
- **Tax, FX, credits, and discounts** are not modeled unless you add them.
- **Tenant count** and **usage** change monthly; the SUMMARY row goes stale quickly without ownership.
- **Legal/compliance** (DPAs, HIPAA, etc.) is out of scope here; vendor **When_to_scale** text is operational, not legal advice.

---

## 10. Maintenance checklist

1. **Quarterly (or on vendor email):** open each **Source** URL and update rates and free-tier notes if pricing changed.
2. **When you change AI model or enable new tools:** update OpenAI rows and **SUMMARY** assumptions.
3. **When SMS ships:** fill **USD/msg**, adjust plan columns if SMS remains gated on Starter.
4. **Monthly finance pass:** replace illustrative **SUMMARY** figures with allocation from **actual invoices** and internal usage dashboards (Supabase, Vercel, Google Cloud, Resend, OpenAI).
5. **When product plans change:** align `pricingFeatures.ts` (and DB plan data) with **Feature_gate** and plan columns in the CSV.

---

## 11. Quick glossary

| Term | Meaning here |
|------|----------------|
| **COGS** | Direct cost to deliver the hosted service (integrations, infra, metered APIs). |
| **Cost price / tenant** | Estimated monthly **internal** cost for one tenant account after allocating shared spend. |
| **List price** | Public vendor rate before your discounts/credits. |
| **Allocation** | Rule for splitting a shared bill across tenants (e.g. even split by active count). |
| **Feature gate** | Plan rule that turns a feature (and its variable cost) on or off for a tier. |

---

*Last aligned with spreadsheet content: Orbyt repo `docs/operating-cost-list-prices-by-plan-features-excel-safe.csv`. Update this document when the sheet’s structure or business rules change materially.*
