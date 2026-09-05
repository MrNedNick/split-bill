import { forwardRef, useState } from 'react'
import {
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native'
import { radius, spacing, useTheme } from '../lib/theme'

/** The primitives this app is built from. Written for this stack, not imported. */

export function Screen({ style, ...rest }: ViewProps) {
  const colors = useTheme()
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]} {...rest} />
}

export function Card({ style, ...rest }: ViewProps) {
  const colors = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
      {...rest}
    />
  )
}

type TitleProps = TextProps & { tone?: 'default' | 'soft' | 'danger' | 'accent' }

export function Title({ style, tone = 'default', ...rest }: TitleProps) {
  const colors = useTheme()
  return (
    <Text
      style={[{ fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.2 }, style]}
      {...rest}
    />
  )
}

export function Body({ style, tone = 'default', ...rest }: TitleProps) {
  const colors = useTheme()
  const color =
    tone === 'soft' ? colors.textSoft : tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.text
  return <Text style={[{ fontSize: 15, color, lineHeight: 21 }, style]} {...rest} />
}

export function Label({ style, ...rest }: TextProps) {
  const colors = useTheme()
  return (
    <Text
      style={[{ fontSize: 12, fontWeight: '600', color: colors.textSoft, letterSpacing: 0.3 }, style]}
      {...rest}
    />
  )
}

export const Field = forwardRef<TextInput, TextInputProps & { label?: string }>(
  function Field({ label, style, ...rest }, ref) {
    const colors = useTheme()
    return (
      <View style={{ gap: spacing.xs, flex: 1 }}>
        {label ? <Label>{label}</Label> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? rest.placeholder}
          placeholderTextColor={colors.textSoft}
          style={[
            {
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md - 2,
              fontSize: 16,
              color: colors.text,
            },
            style,
          ]}
          {...rest}
        />
      </View>
    )
  },
)

interface ButtonProps extends PressableProps {
  title: string
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  compact?: boolean
}

export function Button({ title, variant = 'primary', compact, style, ...rest }: ButtonProps) {
  const colors = useTheme()
  // Pressable reports press but not focus, and the web build is operated with
  // Tab — so the focus ring is tracked here rather than left to the platform.
  const [focused, setFocused] = useState(false)
  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : 'transparent'
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? variant === 'danger'
        ? colors.onAccent
        : colors.onAccent
      : variant === 'ghost'
        ? colors.textSoft
        : colors.accent

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.accent,
          borderRadius: radius.sm,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          paddingVertical: compact ? spacing.sm : spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
          // Focus has to be visible on the web build, where people use Tab.
          outlineWidth: focused ? 2 : 0,
          outlineColor: colors.accent,
          outlineStyle: 'solid',
          outlineOffset: 2,
        },
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      <Text style={{ color: textColor, fontWeight: '600', fontSize: compact ? 14 : 15 }}>
        {title}
      </Text>
    </Pressable>
  )
}

export function Row({ style, ...rest }: ViewProps) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, style]} {...rest} />
}

export function Divider() {
  const colors = useTheme()
  return <View style={{ height: 1, backgroundColor: colors.border }} />
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action?: React.ReactNode
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }}>
      <Title style={{ fontSize: 17 }}>{title}</Title>
      <Body tone="soft" style={{ textAlign: 'center', maxWidth: 320 }}>
        {hint}
      </Body>
      {action}
    </View>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const colors = useTheme()
  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="Loading">
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={{
            height: 56,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
            opacity: 1 - index * 0.15,
          }}
        />
      ))}
    </View>
  )
}
