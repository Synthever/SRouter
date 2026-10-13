"use client"

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import { Eye, EyeOff } from "lucide-react"
import styles from "./floating-field.module.css"

export interface FloatingFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label: string
  description?: string
  requiredMark?: boolean
  monospace?: boolean
  canTogglePassword?: boolean
  startIcon?: ReactNode
  endAction?: ReactNode
}

export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(
  function FloatingField(
    {
      label,
      description,
      requiredMark = false,
      monospace = false,
      canTogglePassword = false,
      startIcon,
      endAction,
      id,
      className,
      type = "text",
      value,
      defaultValue,
      placeholder,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) {
    const generated = useId()
    const controlId = id ?? generated
    const [isFocused, setIsFocused] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      defaultValue !== undefined ? String(defaultValue) : ""
    )

    const hasValue =
      value !== undefined
        ? String(value).length > 0
        : uncontrolledValue.length > 0

    const isFloating = isFocused || hasValue
    const actualType = canTogglePassword
      ? showPassword
        ? "text"
        : "password"
      : type
    const hasEndAction = canTogglePassword || Boolean(endAction)

    return (
      <div className={styles.field}>
        <div
          className={styles.shell}
          data-floating={isFloating ? "true" : undefined}
          data-has-start-icon={startIcon ? "true" : undefined}
          data-has-end-action={hasEndAction ? "true" : undefined}
        >
          {startIcon ? (
            <div className={styles.startIcon}>{startIcon}</div>
          ) : null}

          <input
            {...props}
            ref={ref}
            id={controlId}
            type={actualType}
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder ?? " "}
            className={[styles.input, monospace ? "font-mono" : "", className]
              .filter(Boolean)
              .join(" ")}
            onFocus={(event) => {
              setIsFocused(true)
              onFocus?.(event)
            }}
            onBlur={(event) => {
              setIsFocused(false)
              onBlur?.(event)
            }}
            onChange={(event) => {
              if (value === undefined) {
                setUncontrolledValue(event.target.value)
              }
              onChange?.(event)
            }}
          />

          <label htmlFor={controlId} className={styles.floatingLabel}>
            <span>{label}</span>
            {requiredMark ? (
              <span className="ml-0.5 text-rose-500">*</span>
            ) : null}
          </label>

          {canTogglePassword ? (
            <button
              type="button"
              className={styles.endAction}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </div>
            </button>
          ) : endAction ? (
            <div className={styles.endAction}>{endAction}</div>
          ) : null}
        </div>

        {description ? (
          <span className={styles.hint}>{description}</span>
        ) : null}
      </div>
    )
  }
)

FloatingField.displayName = "FloatingField"
export default FloatingField
