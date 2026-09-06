import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { BigButton } from './BigButton';
import { GradientSurface } from './GradientSurface';
import { font, gradients, palette, radius, shadowFloating, space } from '../theme/tokens';

/** Praise scales with effort, never with failure — even one star gets a warm
 *  headline, since finishing a round is always worth celebrating. */
const PRAISE: readonly { readonly hero: string; readonly text: string }[] = [
  { hero: '👍', text: 'Nice try!' },
  { hero: '🎉', text: 'Great job!' },
  { hero: '🎉', text: 'Great job!' },
  { hero: '🏆', text: 'Amazing!' },
];

/** Decorative confetti around the card. Fixed positions, not random, so the
 *  layout is stable across renders and re-renders don't jitter. */
const CONFETTI: readonly {
  readonly emoji: string;
  readonly left: DimensionValue;
  readonly top?: DimensionValue;
  readonly bottom?: DimensionValue;
}[] = [
  { emoji: '✨', top: '-3%', left: '8%' },
  { emoji: '🎈', top: '-4%', left: '80%' },
  // Anchored from the bottom edge rather than a top percentage, so these sit
  // just outside the card instead of drifting over the button row as the
  // card's height changes with content.
  { emoji: '🌟', bottom: '-3%', left: '4%' },
  { emoji: '🎊', bottom: '-4%', left: '84%' },
];

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
  const { hero, text } = PRAISE[Math.max(0, Math.min(PRAISE.length - 1, stars))];

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
        {!reduceMotion &&
          CONFETTI.map((c, i) => (
            <Text
              key={i}
              style={[styles.confetti, { top: c.top, bottom: c.bottom, left: c.left }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {c.emoji}
            </Text>
          ))}

        <GradientSurface colors={gradients.bg} style={styles.card}>
          <Text style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
            {hero}
          </Text>

          <Text style={styles.praise} accessibilityRole="header">
            {text}
          </Text>

          <Text
            style={styles.stars}
            accessibilityLabel={`You earned ${stars} ${stars === 1 ? 'star' : 'stars'}`}
          >
            {'⭐'.repeat(stars)}
          </Text>

          <BigButton label="Play again" icon="🔁" onPress={onPlayAgain} color={palette.leaf} />
          <BigButton label="Back to games" icon="🏠" onPress={onExit} tone="quiet" style={styles.gap} />
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
  confetti: { position: 'absolute', fontSize: 30, zIndex: 1 },
  card: {
    borderRadius: radius.xl,
    padding: space.lg,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  hero: { fontSize: font.hero, textAlign: 'center' },
  praise: {
    fontSize: font.title,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
    marginBottom: space.xs,
  },
  stars: { fontSize: 40, textAlign: 'center', marginBottom: space.lg },
  gap: { marginTop: space.sm },
});
