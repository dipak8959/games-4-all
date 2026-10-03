import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { useFinishedRound } from './GameFrame';
import { Icon } from './Icon';
import { nextQuote } from './quotes';
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
 *
 * Under the stars, a few words from a sportsperson about practice and
 * trying again — a different one each round.
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
  useFinishedRound(onExit);
  const rise = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const text = PRAISE[Math.max(0, Math.min(PRAISE.length - 1, stars))];
  // Chosen once, when the round ends, so it stays put while the card is up.
  const [quote] = useState(nextQuote);

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
    <ScrollView style={styles.overlay} contentContainerStyle={styles.overlayInner}>
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

        <View style={styles.quote} accessible accessibilityLabel={`${quote.text} ${quote.who}, ${quote.about}.`}>
          <Text style={[type.body, styles.quoteText]}>{`“${quote.text}”`}</Text>
          <Text style={type.mono}>{quote.who.toUpperCase()}</Text>
          <Text style={type.meta}>{quote.about}</Text>
        </View>

        <BigButton label="Play again" icon="replay" onPress={onPlayAgain} chevron />
        <BigButton label="Back to games" icon="home" onPress={onExit} tone="quiet" style={styles.gap} />
      </Animated.View>
    </ScrollView>
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
  },
  // A small phone may not fit the whole card: it scrolls rather than
  // losing its buttons off the edge.
  overlayInner: {
    flexGrow: 1,
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
  quote: { gap: space.xs, borderLeftWidth: rule.major, borderLeftColor: palette.ink, paddingLeft: space.md },
  quoteText: { color: palette.ink },
  gap: { marginTop: space.sm },
});
