import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, hitTarget, palette, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  createGame,
  currentItem,
  deserializeHistory,
  historyFrom,
  isMatch,
  place,
  serializeHistory,
  type Basket,
  type ShapesHistory,
  type ShapesState,
} from './logic';
import { describe, SHAPE_COLORS, Shape } from './Shape';

/** Basket box size in dp, keyed by role. Both stay well above the 72dp
 *  minimum tap target even in "small" size-sort rounds. */
const BASKET_BOX = { normal: 104, small: 92, big: 140 } as const;

function basketLabel(state: ShapesState, basket: Basket): string {
  if (state.sortBy === 'size') return basket.key === 'small' ? 'Basket for small things' : 'Basket for big things';
  const described = describe(basket.shape, basket.color);
  const word = state.sortBy === 'shape' ? described.split(' ')[1] : described.split(' ')[0];
  return `Basket for ${word}`;
}

const GAME_ID = 'shapes';

export function ShapesScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings, getFreshness, setFreshness } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<ShapesState>(() => {
    // Reading this once at mount, not reactively — see MemoryScreen for why.
    return createGame(systemRng, level, deserializeHistory(getFreshness(GAME_ID)));
  });
  // Guards against persisting the same completed round twice; reset whenever
  // a new round actually starts.
  const persistedRef = useRef(false);

  const item = currentItem(state);

  const onDrop = useCallback(
    (basketIndex: number) => {
      setState((prev) => {
        const active = currentItem(prev);
        const basket = prev.baskets[basketIndex];
        if (active && basket) {
          if (isMatch(prev, active, basket)) correct(settings);
          else nudge(settings);
        }
        return place(prev, basketIndex);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number, avoid: ShapesHistory) => {
    persistedRef.current = false;
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel, avoid));
  }, []);

  useEffect(() => {
    if (!state.complete || persistedRef.current) return;
    persistedRef.current = true;
    // Persisted so the very next time this game is opened — even after
    // backing out to Home, even after the app is closed and reopened — it
    // still avoids what was just shown.
    setFreshness(GAME_ID, serializeHistory(historyFrom(state)));
  }, [state, setFreshness]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.queue.length ? state.placed / state.queue.length : 0;
  const rule =
    state.sortBy === 'shape' ? 'Match the shape' : state.sortBy === 'color' ? 'Match the colour' : 'Match the size';
  const ruleIcon = state.sortBy === 'shape' ? '🔺' : state.sortBy === 'color' ? '🎨' : '📏';

  // The item on stage is drawn at its own size only when size is the rule —
  // otherwise size is one of the irrelevant, randomised attributes and every
  // item stays the same visual size so it can't leak the answer.
  const itemDisplaySize = state.sortBy === 'size' ? (item?.size === 'small' ? 88 : 170) : 150;
  const itemLabel = item
    ? state.sortBy === 'size'
      ? `Sort this ${item.size} shape`
      : `Sort this ${describe(item.shape, item.color)}`
    : '';

  return (
    <GameFrame title="Sort It Out" icon="🔺" onExit={onExit} progress={progress}>
      <View style={styles.ruleBadge}>
        <Text style={styles.ruleIcon}>{ruleIcon}</Text>
        <Text style={styles.rule} accessibilityRole="header">
          {rule}
        </Text>
      </View>

      <View style={styles.stageOuter}>
        <View style={styles.stageInner}>
          <Text style={styles.stageRing} accessibilityElementsHidden importantForAccessibility="no">
            ⭕
          </Text>
          {item ? (
            <View accessibilityLabel={itemLabel}>
              <Shape shape={item.shape} color={item.color} size={itemDisplaySize} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.baskets}>
        {state.baskets.map((basket, index) => {
          const box =
            state.sortBy === 'size'
              ? BASKET_BOX[basket.key === 'small' ? 'small' : 'big']
              : BASKET_BOX.normal;

          return (
            <Pressable
              key={basket.key}
              accessibilityRole="button"
              accessibilityLabel={basketLabel(state, basket)}
              onPress={() => onDrop(index)}
              style={({ pressed }) => [
                styles.basketOuter,
                { width: box, height: box, borderColor: SHAPE_COLORS[basket.color] },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.basketInner}>
                <Text style={styles.basketGlyph} accessibilityElementsHidden importantForAccessibility="no">
                  🧺
                </Text>
                <Shape shape={basket.shape} color={basket.color} size={box * 0.48} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart(nextLevel(level, stars), historyFrom(state));
          }}
          onExit={() => {
            onRoundComplete({ stars, level });
            onExit();
          }}
        />
      ) : null}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  ruleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    alignSelf: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginBottom: space.sm,
    ...shadow,
  },
  ruleIcon: { fontSize: font.body },
  rule: { fontSize: font.body, fontWeight: '800', color: palette.ink },
  stageOuter: { flex: 1, borderRadius: radius.lg, marginBottom: space.md, ...shadow },
  stageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  stageRing: { position: 'absolute', fontSize: 220, opacity: 0.05 },
  baskets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingBottom: space.md,
    flexWrap: 'wrap',
  },
  basketOuter: {
    minWidth: hitTarget,
    minHeight: hitTarget,
    borderRadius: radius.md,
    borderWidth: 4,
    ...shadow,
  },
  basketInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md - 2,
    overflow: 'hidden',
  },
  basketGlyph: { position: 'absolute', fontSize: 70, opacity: 0.12 },
  pressed: { transform: [{ scale: 0.94 }] },
});
