import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { SHAPE_NAMES, Shape } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { SETS_PER_ROUND, createGame, nextSet, tapItem, wanted, type BigToSmallState, type Item } from './logic';

/** How long a finished line stays on show before the next set. */
const DONE_MS = 900;

export function BigToSmallScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BigToSmallState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.done) return undefined;
    const on = setTimeout(() => setState((prev) => nextSet(prev, systemRng, level)), DONE_MS);
    return () => clearTimeout(on);
  }, [state.done, level]);

  const onTap = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.complete || prev.done || prev.placed.includes(index)) return prev;
        if (index === wanted(prev)) correct(settings);
        else if (!prev.missed.includes(index)) nudge(settings);
        return tapItem(prev, index);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { shape, items } = state.set;
  const count = items.length;
  // Up to four in a row; five and six in threes; seven in fours.
  const columns = count <= 4 ? count : count <= 6 ? 3 : 4;
  const across = Dimensions.get('window').width - gutter * 2;
  const tile = useMemo(
    () => Math.max(hitTarget, Math.min(112, Math.floor((across - (columns - 1) * rule.hair) / columns))),
    [across, columns],
  );
  // The line is a row of slots the width of the tray, one per item.
  const slot = Math.min(72, Math.floor((across - (count - 1) * rule.hair) / count));

  const draw = (item: Item, box: number) => (
    <View style={{ transform: [{ rotate: `${item.turn}deg` }] }}>
      <Shape shape={shape} color={item.color} size={box * 0.74 * item.scale} />
    </View>
  );

  const stars = starsForMistakes(state.mistakes);
  const progress = (state.setIndex + state.placed.length / count) / SETS_PER_ROUND;

  return (
    <GameFrame title="Big to Small" icon="bigsmall" onExit={onExit} progress={progress}>
      <StageLabel>BIGGEST FIRST</StageLabel>

      <GameStage>
        <View
          accessible
          accessibilityLabel={`In line: ${state.placed.length} of ${count}`}
          style={[styles.line, { width: count * slot + (count - 1) * rule.hair }]}
        >
          {Array.from({ length: count }, (_, i) => {
            const index = state.placed[i];
            return (
              <View key={i} style={[styles.slot, index === undefined && styles.open, { width: slot, height: slot }]}>
                {index !== undefined ? draw(items[index], slot) : null}
              </View>
            );
          })}
        </View>
      </GameStage>

      <AnswerRow style={{ maxWidth: columns * tile + (columns - 1) * rule.hair, alignSelf: 'center' }}>
        {items.map((item, i) => {
          const placed = state.placed.includes(i);
          return (
            <AnswerButton
              key={`${state.setIndex}:${i}`}
              accessibilityLabel={`${SHAPE_NAMES[shape]}, size ${Math.round(item.scale * 100)}${placed ? ', in line' : ''}`}
              size={tile}
              state={placed ? 'spent' : 'idle'}
              onPress={() => onTap(i)}
            >
              {placed ? null : draw(item, tile)}
            </AnswerButton>
          );
        })}
      </AnswerRow>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart(nextLevel(level, stars));
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
  // The line stands on a shelf: a rule under the row, like the rules that
  // divide everything else in the app.
  line: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rule.hair,
    borderBottomWidth: rule.major,
    borderColor: palette.ink,
  },
  slot: { alignItems: 'center', justifyContent: 'flex-end' },
  // A place in the line still to fill, drawn the way Tile Slide draws its gap.
  open: { borderWidth: rule.hair, borderBottomWidth: 0, borderColor: palette.border, borderStyle: 'dashed' },
});
