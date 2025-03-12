// app/components/ui/input.tsx
import React, { FC, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Add any custom props if needed
}

export const Input: FC<InputProps> = ({ ...props }) => {
  return <input {...props} className={`border p-2 rounded ${props.className}`} />;
};
