import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import theme from '../../services/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: (event: GestureResponderEvent) => void;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padded?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  borderColor?: string;
  backgroundColor?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevation = 'sm',
  padded = true,
  rounded = 'md',
  borderColor,
  backgroundColor,
}) => {
  // Determine shadow based on elevation
  const getShadowStyle = (): ViewStyle => {
    switch (elevation) {
      case 'none':
        return {};
      case 'sm':
        return theme.shadows.sm;
      case 'md':
        return theme.shadows.md;
      case 'lg':
        return theme.shadows.lg;
      default:
        return theme.shadows.sm;
    }
  };

  // Determine border radius based on rounded prop
  const getBorderRadius = (): number => {
    switch (rounded) {
      case 'none':
        return 0;
      case 'sm':
        return theme.borderRadius.sm;
      case 'md':
        return theme.borderRadius.md;
      case 'lg':
        return theme.borderRadius.lg;
      case 'full':
        return theme.borderRadius.full;
      default:
        return theme.borderRadius.md;
    }
  };

  // Base card style
  const cardStyle: ViewStyle = {
    backgroundColor: backgroundColor || theme.colors.white,
    borderRadius: getBorderRadius(),
    padding: padded ? theme.spacing.md : 0,
    ...getShadowStyle(),
    ...(borderColor && { borderWidth: 1, borderColor }),
  };

  // If onPress is provided, wrap in TouchableOpacity, otherwise use View
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: theme.spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
});

export default Card; 