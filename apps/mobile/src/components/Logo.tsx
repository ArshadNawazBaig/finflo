import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
} from 'react-native-svg';
import { colors, typography } from '../theme/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export default function Logo({
  size = 44,
  showText = true,
  subtitle = 'Banking OS',
}: LogoProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <Defs>
            <LinearGradient
              id="lg"
              x1="0"
              y1="0"
              x2="40"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#3b82f6" />
              <Stop offset="0.5" stopColor="#8b5cf6" />
              <Stop offset="1" stopColor="#ec4899" />
            </LinearGradient>
          </Defs>
          {/* Pulse wave */}
          <Path
            d="M6 28C6 28 10 10 20 10C30 10 34 20 25 20C16 20 10 30 20 30C30 30 34 20 34 20"
            stroke="url(#lg)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Kinetic dot */}
          <Circle cx="34" cy="20" r="3.5" fill="#ec4899" />
        </Svg>
      </View>
      {showText && (
        <View style={styles.textWrap}>
          <Text style={styles.brandText}>
            <Text style={styles.brandLight}>Finance</Text>
            <Text style={styles.brandAccent}>Flow</Text>
          </Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flexDirection: 'column',
    gap: 1,
  },
  brandText: {
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  brandLight: {
    color: colors.text.primary,
    fontWeight: '900',
  },
  brandAccent: {
    color: colors.primary,
    fontWeight: '900',
  },
  subtitleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
});
