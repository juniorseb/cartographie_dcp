/**
 * Composants helpers pour rendre les questions du QUESTIONNAIRE DCP officiel.
 * Tous les libellés et options correspondent exactement au document Word officiel.
 */
import { cn } from '@/utils/cn';

export interface Option<T extends string> {
  value: T;
  label: string;
}

// Question avec liste de boutons radio (single choice)
export function RadioGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  inline = false,
  required = false,
}: {
  legend: string;
  options: Option<T>[];
  value?: T;
  onChange: (v: T) => void;
  inline?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="text-sm font-semibold text-gray-800 mb-2">
        {legend}{required && <span className="text-red-500"> *</span>}
      </legend>
      <div className={cn(inline ? 'flex flex-wrap gap-4' : 'space-y-1')}>
        {options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-1"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Question avec liste de cases à cocher (multi choice)
export function CheckboxGroup<T extends string>({
  legend,
  options,
  values = [],
  onChange,
  columns = 1,
}: {
  legend: string;
  options: Option<T>[];
  values?: T[];
  onChange: (v: T[]) => void;
  columns?: 1 | 2 | 3;
}) {
  const toggle = (v: T) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };
  const colClass = columns === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-2'
    : columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
      : 'space-y-1';
  return (
    <fieldset className="mb-4">
      <legend className="text-sm font-semibold text-gray-800 mb-2">{legend}</legend>
      <div className={colClass}>
        {options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={values.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="mt-1"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Champ texte court avec label
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="form-group">
      <label className="text-sm font-semibold">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// Champ textarea
export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  required = false,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div className="form-group">
      <label className="text-sm font-semibold">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Section avec titre (PARTIE 1, 2, etc.)
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-3 pb-5 mb-6">
      <legend className="px-3 font-bold text-base text-[var(--artci-orange)] mx-auto">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
