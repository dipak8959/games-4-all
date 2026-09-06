import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { font, palette, radius, shadow, space } from '../theme/tokens';

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

  useEffect(() => {
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [pop, reduceMotion]);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
        <Text style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
          🎉
        </Text>

        <Text style={styles.praise} accessibilityRole="header">
          Nice work!
        </Text>

        <Text
          style={styles.stars}
          accessibilityLabel={`You earned ${stars} ${stars === 1 ? 'star' : 'stars'}`}
        >
          {'⭐'.repeat(stars)}
        </Text>

        <BigButton label="Play again" icon="🔁" onPress={onPlayAgain} color={palette.leaf} />
        <BigButton label="Back to games" icon="🏠" onPress={onExit} tone="quiet" style={styles.gap} />
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: 'stretch',
    ...shadow,
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
