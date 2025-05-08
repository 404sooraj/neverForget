import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../services/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.6 : 1,
    };

    // Handle size
    switch (size) {
      case 'sm':
        baseStyle.paddingVertical = theme.spacing.xs;
        baseStyle.paddingHorizontal = theme.spacing.md;
        break;
      case 'lg':
        baseStyle.paddingVertical = theme.spacing.md;
        baseStyle.paddingHorizontal = theme.spacing.lg;
        break;
      default: // md
        baseStyle.paddingVertical = theme.spacing.sm;
        baseStyle.paddingHorizontal = theme.spacing.md;
    }

    // Handle full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Handle variant
    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary[600],
          ...theme.shadows.sm,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary[600],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.error[600],
          ...theme.shadows.sm,
        };
      default: // primary
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary[600],
          ...theme.shadows.sm,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600' as TextStyle['fontWeight'],
    };

    // Handle size
    switch (size) {
      case 'sm':
        baseStyle.fontSize = theme.typography.fontSize.sm;
        break;
      case 'lg':
        baseStyle.fontSize = theme.typography.fontSize.lg;
        break;
      default: // md
        baseStyle.fontSize = theme.typography.fontSize.md;
    }

    // Handle variant
    switch (variant) {
      case 'outline':
      case 'ghost':
        return {
          ...baseStyle,
          color: theme.colors.primary[600],
        };
      default:
        return {
          ...baseStyle,
          color: theme.colors.white,
        };
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return theme.colors.primary[600];
      default:
        return theme.colors.white;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default: // md
        return 20;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary[600] : theme.colors.white}
          style={styles.loader}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && (
            <Ionicons
              name={leftIcon as any}
              size={getIconSize()}
              color={getIconColor()}
              style={styles.leftIcon}
            />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon as any}
              size={getIconSize()}
              color={getIconColor()}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: theme.spacing.xs,
  },
  rightIcon: {
    marginLeft: theme.spacing.xs,
  },
  loader: {
    marginHorizontal: theme.spacing.sm,
  },
});

export default Button; 