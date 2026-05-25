"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Form3ExtrasPage from "../extras/page";

export default function Form3AddOnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (params.get("listingKind") !== "addon") {
      params.set("listingKind", "addon");
      changed = true;
    }
    if (params.get("bookingFormScope") !== "form3") {
      params.set("bookingFormScope", "form3");
      changed = true;
    }
    if (changed) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [pathname, router, searchParams]);

  return <Form3ExtrasPage />;
}
