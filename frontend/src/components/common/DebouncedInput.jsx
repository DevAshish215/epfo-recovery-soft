import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce.js';

/**
 * Input with debounced onChange - waits for user to stop typing before calling onChange
 */
const DebouncedInput = React.memo(({ value: initialValue, onChange, debounce = 300, ...props }) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, debounce);

  useEffect(() => setValue(initialValue), [initialValue]);
  useEffect(() => {
    // Only notify parent when user's typed value has settled and differs from prop
    if (value === debouncedValue && debouncedValue !== initialValue) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, initialValue, onChange]);

  return (
    <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

export default DebouncedInput;

