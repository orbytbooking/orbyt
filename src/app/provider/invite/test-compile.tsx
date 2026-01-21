// Test file to isolate TypeScript issue
console.log('Testing imports...');

// Test React imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Test if this compiles
export default function TestComponent() {
  const [state, setState] = useState(0);
  
  useEffect(() => {
    setState(state + 1);
  }, []);

  return (
    <div>
      <p>Test Component - State: {state}</p>
    </div>
  );
}
