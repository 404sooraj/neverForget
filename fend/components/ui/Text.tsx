import React from 'react';
import { Text as RNText, TextStyle, TextProps as RNTextProps, StyleSheet } from 'react-native';
import theme from '../../services/theme';
import { useColorScheme } from 'react-native';

type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption' | 'label';
type WeightVariant = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: WeightVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  italic?: boolean;
  underline?: boolean;
  lineThrough?: boolean;
  uppercase?: boolean;
  muted?: boolean;
}

const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  weight = 'regular',
  color,
  align,
  italic = false,
  underline = false,
  lineThrough = false,
  uppercase = false,
  muted = false,
  style,
  ...rest
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // Get variant style
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'display':
        return {
          fontSize: theme.typography.fontSize.display,
          lineHeight: theme.typography.fontSize.display * theme.typography.lineHeight.tight,
        };
      case 'h1':
        return {
          fontSize: theme.typography.fontSize.xxxl,
          lineHeight: theme.typography.fontSize.xxxl * theme.typography.lineHeight.tight,
        };
      case 'h2':
        return {
          fontSize: theme.typography.fontSize.xxl,
          lineHeight: theme.typography.fontSize.xxl * theme.typography.lineHeight.tight,
        };
      case 'h3':
        return {
          fontSize: theme.typography.fontSize.xl,
          lineHeight: theme.typography.fontSize.xl * theme.typography.lineHeight.tight,
        };
      case 'h4':
        return {
          fontSize: theme.typography.fontSize.lg,
          lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.normal,
        };
      case 'body-sm':
        return {
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
        };
      case 'caption':
        return {
          fontSize: theme.typography.fontSize.xs,
          lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
        };
      case 'label':
        return {
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
          letterSpacing: 0.5,
        };
      default: // body
        return {
          fontSize: theme.typography.fontSize.md,
          lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.normal,
        };
    }
  };

  // Get weight style
  const getWeightStyle = (): TextStyle => {
    switch (weight) {
      case 'light':
        return { fontWeight: '300' as TextStyle['fontWeight'] };
      case 'medium':
        return { fontWeight: '500' as TextStyle['fontWeight'] };
      case 'semibold':
        return { fontWeight: '600' as TextStyle['fontWeight'] };
      case 'bold':
        return { fontWeight: '700' as TextStyle['fontWeight'] };
      default: // regular
        return { fontWeight: '400' as TextStyle['fontWeight'] };
    }
  };

  // Determine text color
  const getTextColor = (): string => {
    if (color) return color;
    if (muted) return isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500];
    return isDarkMode ? theme.colors.neutral[100] : theme.colors.secondary[900];
  };

  // Combine all styles
  const textStyles: TextStyle = {
    ...getVariantStyle(),
    ...getWeightStyle(),
    color: getTextColor(),
    ...(align && { textAlign: align }),
    ...(italic && { fontStyle: 'italic' }),
    ...(underline && { textDecorationLine: 'underline' }),
    ...(lineThrough && { textDecorationLine: 'line-through' }),
    ...(underline && lineThrough && { textDecorationLine: 'underline line-through' }),
    ...(uppercase && { textTransform: 'uppercase' }),
  };

  return (
    <RNText style={[textStyles, style]} {...rest}>
      {children}
    </RNText>
  );
};

export default Text; 