// app/components/ui/label.tsx
import React, { FC, LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  // Add any custom props if needed
}

export const Label: FC<LabelProps> = ({ children, ...props }) => {
  return <label {...props} className={`block text-sm font-medium ${props.className}`}>
    {children}
  </label>;
};
