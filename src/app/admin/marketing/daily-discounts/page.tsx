import { redirect } from "next/navigation";

/** Legacy route — real UI lives on Marketing → Daily Discounts tab. */
export default function DailyDiscountsPage() {
  redirect("/admin/marketing?tab=daily-discounts");
}
