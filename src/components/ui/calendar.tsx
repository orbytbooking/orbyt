import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-5 w-full", className)}
      classNames={{
        month: "w-full space-y-4",
        months: "flex w-full",
        caption: "flex justify-center pt-2 relative items-center mb-4",
        caption_label: "text-base font-semibold text-slate-900",
        nav: "flex items-center gap-1",
        button_previous: "absolute left-0 inline-flex items-center justify-center h-9 w-9 bg-transparent p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-all",
        button_next: "absolute right-0 inline-flex items-center justify-center h-9 w-9 bg-transparent p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-all",
        month_grid: "w-full mt-4",
        weekdays: "grid grid-cols-7 gap-2 mb-2",
        weekday: "text-slate-500 rounded-md font-medium text-xs flex items-center justify-center h-9 uppercase",
        week: "grid grid-cols-7 gap-2 w-full mt-1",
        day: "relative p-0 text-center text-sm w-full",
        day_button: "inline-flex items-center justify-center h-11 w-11 p-0 font-normal text-slate-900 rounded-lg transition-all cursor-pointer w-full",
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
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
