// app/components/ui/select.tsx
import React, { useState, ReactNode } from 'react';

interface SelectProps {
  children: ReactNode;
  onValueChange: (value: string) => void;
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  onSelect?: (value: string) => void; // made onSelect optional to allow prop injection
}

interface SelectValueProps {
  value: string;
}

export const Select: React.FC<SelectProps> = ({ children, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    onValueChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <SelectTrigger onClick={() => setIsOpen(!isOpen)}>
        <SelectValue value={selectedValue} />
      </SelectTrigger>
      {isOpen && (
        <SelectContent>
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<SelectItemProps>, { onSelect: handleSelect })
              : null
          )}
        </SelectContent>
      )}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, ...props }) => {
  return (
    <button {...props} className="border p-2 rounded">
      {children}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ value }) => {
  return <span>{value || 'Select an option'}</span>;
};

export const SelectContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className="absolute bg-white border mt-2 rounded">{children}</div>;
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children, onSelect }) => {
  return (
    <div
      onClick={() => onSelect && onSelect(value)}
      className="cursor-pointer p-2 hover:bg-gray-200"
    >
      {children}
    </div>
  );
};
