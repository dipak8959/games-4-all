import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageLabel, StageScroll, fitTiles } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { PICTURES, createGame, nextPicture, tapSquare, type MirrorPictureState } from './logic';

/** How long a finished picture shows before the next. */
const SHOW_MS = 1100;
/** The mirror line's thickness. */
const MIRROR = 6;

export function MirrorPictureScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the finished picture waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MirrorPictureState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.done || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => nextPicture(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.done, state.complete, paused, settings]);

  const onTap = useCallback(
    (cell: number) => {
      tap(settings);
      setState((prev) => tapSquare(prev, cell));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const given = state.givens[Math.min(state.index, state.givens.length - 1)];
  const across = state.cols * (state.across ? 1 : 2);
  const { tile, bleed } = fitTiles(across, 88);
  const rows = Array.from({ length: state.rows }, (_, r) => r);
  const cols = Array.from({ length: state.cols }, (_, c) => c);
  const stars = starsForMistakes(state.slips);

  const givenCell = (r: number, c: number) => {
    const i = r * state.cols + c;
    return <View key={`g${i}`} testID={`given:${i}:${given[i] ? 1 : 0}`} style={[given[i] ? styles.on : styles.givenOff, { width: tile, height: tile }]} />;
  };
  const fillCell = (r: number, c: number) => {
    const i = r * state.cols + c;
    const on = state.filled[i];
    return (
      <Pressable
        key={`f${i}`}
        accessibilityRole="button"
        accessibilityLabel={`Row ${r + 1}, square ${c + 1}: ${on ? 'filled' : 'empty'}`}
        aria-pressed={on}
        testID={`fill:${i}:${on ? 1 : 0}`}
        onPress={() => onTap(i)}
        style={({ pressed }) => [on ? styles.on : styles.off, { width: tile, height: tile }, pressed && styles.pressed]}
      />
    );
  };

  return (
    <GameFrame title="Mirror Picture" icon="mirror" onExit={onExit} progress={(state.index + (state.done ? 1 : 0)) / PICTURES}>
      <StageLabel live>{state.done ? 'A PERFECT MIRROR!' : state.across ? 'FILL THE BOTTOM HALF TO MATCH THE TOP' : 'FILL THE RIGHT HALF TO MATCH THE LEFT'}</StageLabel>
      <StageScroll>
        <View style={[styles.board, { marginHorizontal: -bleed }]} accessibilityLabel={`${state.across ? 'Top' : 'Left'} half given; fill in the other half as its mirror.`}>
          {state.across ? (
            <>
              {rows.map((r) => (
                <View key={`gr${r}`} style={styles.row}>
                  {cols.map((c) => givenCell(r, c))}
                </View>
              ))}
              <View style={[styles.mirror, { height: MIRROR }]} />
              {rows.map((r) => (
                <View key={`fr${r}`} style={styles.row}>
                  {cols.map((c) => fillCell(r, c))}
                </View>
              ))}
            </>
          ) : (
            rows.map((r) => (
              <View key={r} style={styles.row}>
                {cols.map((c) => givenCell(r, c))}
                <View style={[styles.mirror, { width: MIRROR, alignSelf: 'stretch' }]} />
                {cols.map((c) => fillCell(r, c))}
              </View>
            ))
          )}
        </View>
      </StageScroll>

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
  board: { alignSelf: 'center', gap: rule.hair },
  row: { flexDirection: 'row', gap: rule.hair },
  on: { backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.ink },
  givenOff: { backgroundColor: palette.surface, borderWidth: rule.hair, borderColor: palette.inkSoft },
  off: { backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  pressed: { opacity: 0.7 },
  mirror: { backgroundColor: palette.accent, marginVertical: space.xs / 2 },
});
