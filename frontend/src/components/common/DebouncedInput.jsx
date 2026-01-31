import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Optimized input component with debouncing
 * Reduces re-renders and improves performance
 */
const DebouncedInput = React.memo(({ 
  value: initialValue, 
  onChange, 
  debounce = 300,
  ...props 
}) => {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const debouncedOnChange = useCallback((newValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounce);
  }, [onChange, debounce]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

export default DebouncedInput;

