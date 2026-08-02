"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="button__spinner" aria-hidden="true" /> : null}
      <span>{loading ? "Please wait" : children}</span>
    </button>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }
>(function IconButton({ label, className = "", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`input ${className}`.trim()} {...props} />;
  },
);

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchInput({ className = "", ...props }, ref) {
    return (
      <div className="search-input">
        <span aria-hidden="true" className="search-input__symbol">⌕</span>
        <input ref={ref} type="search" className={`input input--search ${className}`.trim()} {...props} />
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`textarea ${className}`.trim()} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select ref={ref} className={`select ${className}`.trim()} {...props}>
        {children}
      </select>
    );
  },
);

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <label className="choice" htmlFor={id}>
      <input {...props} id={id} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  disabled = false,
  required = false,
  describedBy,
}: {
  legend: string;
  name: string;
  options: { label: string; value: string }[];
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
}) {
  return (
    <fieldset className="radio-group" disabled={disabled} aria-describedby={describedBy}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label className="choice" key={option.value}>
          <input type="radio" name={name} value={option.value} defaultChecked={defaultValue === option.value} required={required} />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false";
  }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;
  return (
    <div className={`form-field ${error ? "form-field--invalid" : ""}`.trim()}>
      <label htmlFor={id}>
        {label} {optional ? <span className="field-optional">(optional)</span> : null}
      </label>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <div>{control}</div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} className="field-hint">{children}</p>;
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} className="field-error">{children}</p>;
}

export function ErrorSummary({
  title = "Please correct the following",
  errors,
}: {
  title?: string;
  errors: { href: string; message: string }[];
}) {
  return (
    <div className="error-summary" role="alert" tabIndex={-1}>
      <strong>{title}</strong>
      <ul>
        {errors.map((error) => (
          <li key={error.href}>
            <a href={error.href}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
