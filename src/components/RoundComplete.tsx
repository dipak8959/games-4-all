import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { BigButton } from './BigButton';
import { Icon } from './Icon';
import { GradientSurface } from './GradientSurface';
import { font, gradients, palette, radius, shadowFloating, space } from '../theme/tokens';

/** Praise scales with effort, never with failure — even one star gets a warm
 *  headline, since finishing a round is always worth celebrating. */
const PRAISE: readonly string[] = ['Nice try!', 'Great job!', 'Great job!', 'Amazing!'];

/**
 * End-of-round celebration.
 *
 * Deliberately has no failure state and no score to beat: it reports stars
 * earned, praises the effort, and offers "play again" or "go back". The praise
 * text is short and paired with a large icon so a pre-reader gets the message
 * from the picture alone.
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
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const text = PRAISE[Math.max(0, Math.min(PRAISE.length - 1, stars))];

  useEffect(() => {
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [pop, reduceMotion]);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.cardOuter, { transform: [{ scale: pop }] }]}>
        <GradientSurface colors={gradients.bg} style={styles.card}>
          <Text style={styles.praise} accessibilityRole="header">
            {text}
          </Text>

          <View
            style={styles.stars}
            accessibilityLabel={`You earned ${stars} ${stars === 1 ? 'star' : 'stars'}`}
          >
            {Array.from({ length: stars }, (_, i) => (
              <Icon key={i} name="star" size={44} color={palette.sun} />
            ))}
          </View>

          <BigButton label="Play again" icon="replay" onPress={onPlayAgain} color={palette.leaf} />
          <BigButton label="Back to games" icon="home" onPress={onExit} tone="quiet" style={styles.gap} />
        </GradientSurface>
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
    backgroundColor: 'rgba(42, 33, 24, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  cardOuter: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    ...shadowFloating,
  },
  card: {
    borderRadius: radius.xl,
    padding: space.lg,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  praise: {
    fontSize: font.title,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
    marginBottom: space.xs,
  },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginBottom: space.lg },
  gap: { marginTop: space.sm },
});
