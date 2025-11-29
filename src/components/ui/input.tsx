import * as React from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  toUppercase?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, toUppercase = false, showClearButton = true, onClear, onChange, value, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [internalValue, setInternalValue] = React.useState(value || '');
    const [showPassword, setShowPassword] = React.useState(false);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (toUppercase) {
        event.target.value = event.target.value.toUpperCase();
      }
      setInternalValue(event.target.value);
      onChange?.(event);
    };

    const handleClear = () => {
      setInternalValue('');
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: '', name: props.name || '' },
          currentTarget: { value: '', name: props.name || '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    React.useEffect(() => {
      setInternalValue(value || '');
    }, [value]);

    const displayValue = value !== undefined ? value : internalValue;
    const isPasswordType = type === 'password';
    const inputType = isPasswordType && showPassword ? 'text' : type;
    const showClear = showClearButton && displayValue && !props.disabled && type !== 'date' && type !== 'number' && !isPasswordType;
    const showPasswordToggle = isPasswordType && displayValue && !props.disabled;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            type={inputType}
            id={inputId}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              (showClear || showPasswordToggle) && 'pr-10',
              className
            )}
            ref={ref}
            onChange={handleChange}
            value={displayValue}
            {...props}
          />
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              tabIndex={-1}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
