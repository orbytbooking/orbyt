"use client";

/**
 * Single date-picker entry for the app (customer book-now, admin, provider-facing admin tools).
 * Do not import `DayPicker` directly elsewhere — keeps automatic IANA timezone behavior in one place.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { useAutoIanaTimeZone } from "@/lib/useAutoIanaTimeZone";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Compact calendar for popovers and tight layouts (default keeps book-now / admin sizing). */
  size?: "default" | "sm";
};

function Calendar({
  className,
  classNames,
  size = "default",
  showOutsideDays = true,
  timeZone: timeZoneProp,
  ...props
}: CalendarProps) {
  const autoTimeZone = useAutoIanaTimeZone();
  const timeZone = timeZoneProp ?? autoTimeZone;
  const sm = size === "sm";

  return (
    <DayPicker
      {...(timeZone ? { timeZone } : {})}
      showOutsideDays={showOutsideDays}
      className={cn(sm ? "w-auto p-2" : "w-full p-5", className)}
      classNames={{
        month: sm ? "w-full space-y-1" : "w-full space-y-4",
        months: "flex w-full",
        caption: sm
          ? "relative mb-1 flex items-center justify-center pt-0.5"
          : "relative mb-4 flex items-center justify-center pt-2",
        caption_label: sm ? "text-sm font-semibold text-slate-900" : "text-base font-semibold text-slate-900",
        nav: "flex items-center gap-1",
        button_previous: sm
          ? "absolute left-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent p-0 text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
          : "absolute left-0 inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900",
        button_next: sm
          ? "absolute right-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent p-0 text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
          : "absolute right-0 inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900",
        month_grid: sm ? "mt-1 w-full" : "mt-4 w-full",
        weekdays: sm ? "mb-1 grid grid-cols-7 gap-0.5" : "mb-2 grid grid-cols-7 gap-2",
        weekday: sm
          ? "flex h-6 w-full items-center justify-center rounded-md text-[10px] font-medium uppercase text-slate-500"
          : "flex h-9 w-full items-center justify-center rounded-md text-xs font-medium uppercase text-slate-500",
        week: sm ? "mt-0.5 grid w-full grid-cols-7 gap-0.5" : "mt-1 grid w-full grid-cols-7 gap-2",
        day: sm ? "relative w-full p-0 text-center text-xs" : "relative w-full p-0 text-center text-sm",
        day_button: sm
          ? "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-0 text-xs font-normal text-slate-900 transition-all hover:bg-slate-100"
          : "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg p-0 text-sm font-normal text-slate-900 transition-all hover:bg-slate-100",
        selected: "!bg-[#00D4E8] !text-white hover:!bg-[#00D4E8] hover:!text-white font-medium shadow-sm",
        today: "bg-slate-50 font-medium",
        outside: "text-slate-300 opacity-60",
        disabled: "text-slate-200 opacity-40 cursor-not-allowed hover:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          return orientation === "left" ? (
            <ChevronLeft className={sm ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <ChevronRight className={sm ? "h-4 w-4" : "h-5 w-5"} />
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
