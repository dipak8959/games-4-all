import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { Icon } from './Icon';
import { Rule } from './Rule';
import { palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/** Praise scales with effort, never with failure — even one star gets a warm
 *  headline, since finishing a round is always worth celebrating. */
const PRAISE: readonly string[] = ['Nice try!', 'Great job!', 'Great job!', 'Amazing!'];

/**
 * End-of-round celebration.
 *
 * Deliberately has no failure state and no score to beat: it reports stars
 * earned, praises the effort, and offers "play again" or "go back". The praise
 * text is short and paired with large star marks so a pre-reader gets the
 * message from the picture alone.
 */
export function RoundComplete({
  stars,
  onPlayAgain,
  onExit,
  reduceMotion,
}: {
  readonly stars: number;
  readonly onPlayAgain: () => void;
  readonly onExit: () => void;
  readonly reduceMotion: boolean;
}) {
  const rise = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const text = PRAISE[Math.max(0, Math.min(PRAISE.length - 1, stars))];

  useEffect(() => {
    if (reduceMotion) {
      rise.setValue(1);
      return;
    }
    // Under 200ms, and a straight move rather than a bounce — the handoff
    // asks for minimal motion.
    Animated.timing(rise, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [rise, reduceMotion]);

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        ]}
      >
        <Text style={type.mono}>ROUND COMPLETE</Text>
        <Text style={[type.h2, styles.praise]} accessibilityRole="header">
          {text}
        </Text>
        <Rule weight="major" />

        <View
          style={styles.stars}
          accessibilityLabel={`You earned ${stars} ${stars === 1 ? 'star' : 'stars'}`}
        >
          {Array.from({ length: stars }, (_, i) => (
            <Icon key={i} name="star" size={40} color={palette.accent} />
          ))}
        </View>

        <BigButton label="Play again" icon="replay" onPress={onPlayAgain} chevron />
        <BigButton label="Back to games" icon="home" onPress={onExit} tone="quiet" style={styles.gap} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32,30,29,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    padding: space.lg,
    gap: space.md,
  },
  praise: { marginTop: -space.sm },
  stars: { flexDirection: 'row', gap: space.sm, minHeight: 40 },
  gap: { marginTop: space.sm },
});
