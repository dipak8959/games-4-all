import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { starsForMistakes, type GameScreenProps } from '../types';
import { createGame, currentItem, isMatch, place, type ShapesState } from './logic';
import { describe, SHAPE_COLORS, Shape } from './Shape';

export function ShapesScreen({ level, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [state, setState] = useState<ShapesState>(() => createGame(systemRng, level));

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

  const restart = useCallback(() => setState(createGame(systemRng, level)), [level]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.queue.length ? state.placed / state.queue.length : 0;
  const rule = state.sortBy === 'shape' ? 'Match the shape' : 'Match the colour';
  const ruleIcon = state.sortBy === 'shape' ? '🔺' : '🎨';

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
            <View accessibilityLabel={`Sort this ${describe(item.shape, item.color)}`}>
              <Shape shape={item.shape} color={item.color} size={150} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.baskets}>
        {state.baskets.map((basket, index) => (
          <Pressable
            key={`${basket.shape}-${basket.color}`}
            accessibilityRole="button"
            accessibilityLabel={`Basket for ${
              state.sortBy === 'shape'
                ? describe(basket.shape, basket.color).split(' ')[1]
                : describe(basket.shape, basket.color).split(' ')[0]
            }`}
            onPress={() => onDrop(index)}
            style={({ pressed }) => [
              styles.basketOuter,
              { borderColor: SHAPE_COLORS[basket.color] },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.basketInner}>
              <Text style={styles.basketGlyph} accessibilityElementsHidden importantForAccessibility="no">
                🧺
              </Text>
              <Shape shape={basket.shape} color={basket.color} size={50} />
            </View>
          </Pressable>
        ))}
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart();
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
    justifyContent: 'center',
    gap: space.md,
    paddingBottom: space.md,
    flexWrap: 'wrap',
  },
  basketOuter: {
    width: 104,
    height: 104,
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
