import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../services/theme';
import { useColorScheme } from 'react-native';

interface HeaderProps {
  title: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  rightSecondaryAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  hideBackButton?: boolean;
  style?: ViewStyle;
  subtitleText?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  leftAction,
  rightAction,
  rightSecondaryAction,
  hideBackButton = false,
  style,
  subtitleText,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // Calculate styles based on color scheme
  const backgroundColor = isDarkMode ? theme.colors.secondary[900] : theme.colors.white;
  const textColor = isDarkMode ? theme.colors.white : theme.colors.secondary[900];
  const iconColor = isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600];
  const statusBarStyle = isDarkMode ? 'light-content' : 'dark-content';
  
  return (
    <>
      <StatusBar barStyle={statusBarStyle} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={[styles.container, style, { backgroundColor }]}>
          <View style={styles.leadingContent}>
            {leftAction && !hideBackButton && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={leftAction.onPress}
                accessibilityLabel={leftAction.accessibilityLabel || 'Back'}
              >
                <Ionicons name={leftAction.icon as any} size={24} color={iconColor} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitleText && (
              <Text style={[styles.subtitle, { color: isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500] }]}>
                {subtitleText}
              </Text>
            )}
          </View>
          
          <View style={styles.trailingContent}>
            {rightSecondaryAction && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={rightSecondaryAction.onPress}
                accessibilityLabel={rightSecondaryAction.accessibilityLabel || 'Action'}
              >
                <Ionicons name={rightSecondaryAction.icon as any} size={24} color={iconColor} />
              </TouchableOpacity>
            )}
            {rightAction && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={rightAction.onPress}
                accessibilityLabel={rightAction.accessibilityLabel || 'Action'}
              >
                <Ionicons name={rightAction.icon as any} size={24} color={iconColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    zIndex: 10,
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight || 0,
      },
    }),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: theme.layout.headerHeight,
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  leadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 60,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  trailingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
  },
  actionButton: {
    padding: theme.spacing.xs,
    marginHorizontal: 2,
  },
});

export default Header; 