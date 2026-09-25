import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import { canSlide, createGame, slide, starsForMoves, type TileSlideState } from './logic';

export function TileSlideScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<TileSlideState>(() => createGame(systemRng, level));

  const onTap = useCallback(
    (cell: number) => {
      setState((prev) => {
        if (prev.complete) return prev;
        if (!canSlide(prev, cell)) {
          nudge(settings);
          return prev;
        }
        const after = slide(prev, cell);
        if (after.complete) correct(settings);
        else tap(settings);
        return after;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { size, board } = state;
  const tile = useMemo(() => {
    const across = Dimensions.get('window').width - gutter * 2;
    return Math.max(hitTarget, Math.min(104, Math.floor((across - (size - 1) * rule.hair) / size)));
  }, [size]);

  const stars = starsForMoves(state.moves, state.par);
  const home = board.filter((t, i) => t !== 0 && t === i + 1).length;
  const progress = home / (size * size - 1);

  return (
    <GameFrame title="Tile Slide" icon="slide" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <StageLabel>PUT THE NUMBERS IN ORDER</StageLabel>

        <AnswerRow style={{ maxWidth: size * tile + (size - 1) * rule.hair, alignSelf: 'center' }}>
          {board.map((number, cell) => {
            const where = `row ${Math.floor(cell / size) + 1}, column ${(cell % size) + 1}`;
            if (number === 0) {
              return (
                <View
                  key="gap"
                  accessible
                  accessibilityLabel={`Gap, ${where}`}
                  style={[styles.gap, { width: tile, height: tile }]}
                />
              );
            }
            return (
              <AnswerButton
                key={number}
                label={String(number)}
                accessibilityLabel={`${number}, ${where}${canSlide(state, cell) ? ', can slide' : ''}`}
                size={tile}
                onPress={() => onTap(cell)}
              />
            );
          })}
        </AnswerRow>
      </View>

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
  stage: { flex: 1, justifyContent: 'center' },
  // The gap is the ground showing through the frame — an empty cell, drawn
  // as nothing but its rule.
  gap: { borderWidth: rule.hair, borderColor: palette.border, borderStyle: 'dashed' },
});
