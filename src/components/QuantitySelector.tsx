import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  extra: string;
  quantity: number;
  onQuantityChange: (extra: string, quantity: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({ extra, quantity, onQuantityChange, min = 0, max = 10 }: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (quantity > min) {
      onQuantityChange(extra, quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < max) {
      onQuantityChange(extra, quantity + 1);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecrease}
        disabled={quantity <= min}
        className="h-8 w-8 p-0"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleIncrease}
        disabled={quantity >= max}
        className="h-8 w-8 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
      <label className="text-sm font-medium leading-none">
        {extra}
      </label>
    </div>
  );
}
