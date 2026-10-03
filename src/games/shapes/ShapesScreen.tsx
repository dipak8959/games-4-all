import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule as ruleWeight, space } from '../../theme/tokens';
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
import { describe, Shape } from './Shape';

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
    <GameFrame title="Sort It Out" icon="shapes" onExit={onExit} progress={progress}>
      <StageLabel>{rule.toUpperCase()}</StageLabel>

      <GameStage>
        {item ? (
          <View accessibilityLabel={itemLabel}>
            <Shape shape={item.shape} color={item.color} size={itemDisplaySize} />
          </View>
        ) : null}
      </GameStage>

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
                styles.basket,
                { width: box, height: box },
                pressed && styles.basketPressed,
              ]}
            >
              {/* The one place colour survives inside a game, because here it
                  is the content: a colour-sort round is literally asking
                  which colour this is. The basket around it is ink like every
                  other control in the app. */}
              <Shape shape={basket.shape} color={basket.color} size={box * 0.48} />
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
  baskets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruleWeight.hair,
    paddingBottom: space.md,
    flexWrap: 'wrap',
  },
  basket: {
    minWidth: hitTarget,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: ruleWeight.hair,
    borderColor: palette.border,
  },
  basketPressed: { backgroundColor: palette.accentTint, borderColor: palette.accent },
});
