"use client"

import * as React from "react"
import { format } from "date-fns"
import { Clock } from "lucide-react"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"

export function TimePicker({
  value,
  onChange,
  className,
  ...props
}: {
  value: string
  onChange: (value: string) => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = React.useState(false)
  
  // Parse the time string (format: "HH:mm")
  const [hours, minutes] = value ? value.split(':').map(Number) : [0, 0]
  
  const handleHourChange = (hour: number) => {
    const newTime = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    onChange(newTime)
  }
  
  const handleMinuteChange = (minute: number) => {
    const newTime = `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    onChange(newTime)
  }
  
  const displayValue = value ? 
    format(new Date(`2000-01-01T${value}`), 'h:mm a') : 
    'Select time'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center space-y-1 max-h-48 overflow-y-auto p-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <Button
                key={`hour-${i}`}
                variant={i === hours ? "default" : "ghost"}
                size="sm"
                className="w-full"
                onClick={() => handleHourChange(i)}
              >
                {String(i).padStart(2, '0')}
              </Button>
            ))}
          </div>
          <div className="flex flex-col items-center space-y-1 max-h-48 overflow-y-auto p-2">
            {[0, 15, 30, 45].map((minute) => (
              <Button
                key={`minute-${minute}`}
                variant={minute === minutes ? "default" : "ghost"}
                size="sm"
                className="w-full"
                onClick={() => handleMinuteChange(minute)}
              >
                {String(minute).padStart(2, '0')}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
