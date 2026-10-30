import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel, StageScroll, fitTiles } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import { BOARDS, createGame, nextBoard, starsForTaps, tapTile, type FlipItState } from './logic';

/** How long a lit board shows before the next. */
const SHOW_MS = 900;

export function FlipItScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<FlipItState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.done || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => nextBoard(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.done, state.complete, settings, paused]);

  const onTap = useCallback(
    (cell: number) => {
      tap(settings);
      setState((prev) => tapTile(prev, cell));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { tile, bleed } = fitTiles(state.size, 96);
  const par = state.pars[Math.min(state.index, state.pars.length - 1)];
  const dark = state.lit.filter((on) => !on).length;
  const stars = starsForTaps(state.totalTaps, state.totalPar);
  const rows = Array.from({ length: state.size }, (_, r) => r);

  return (
    <GameFrame title="Flip It" icon="flip" onExit={onExit} progress={(state.index + (state.done ? 1 : 0)) / BOARDS}>
      <StageLabel live>{state.done ? 'ALL FILLED!' : `FILL EVERY SQUARE · ${par} TAP${par === 1 ? '' : 'S'} CAN DO IT`}</StageLabel>
      <StageScroll>
        <View style={[styles.grid, { marginHorizontal: -bleed }]} accessibilityLabel={`${dark} of ${state.lit.length} squares empty. ${state.taps} taps so far.`}>
          {rows.map((r) => (
            <View key={r} style={styles.row}>
              {rows.map((c) => {
                const cell = r * state.size + c;
                const on = state.lit[cell];
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${r + 1}, column ${c + 1}: ${on ? 'filled' : 'empty'}`}
                    testID={`tile:${cell}:${on ? 1 : 0}`}
                    onPress={() => onTap(cell)}
                    style={({ pressed }) => [on ? styles.lit : styles.dark, { width: tile, height: tile }, pressed && styles.pressed]}
                  >
                    {on ? null : <View style={[styles.hollow, { width: tile * 0.34, height: tile * 0.34 }]} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={[type.mono, styles.taps]}>{`TAPS ${state.taps}`}</Text>
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
  grid: { gap: rule.hair, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: rule.hair },
  lit: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.ink },
  dark: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: rule.major, borderColor: palette.ink },
  hollow: { borderWidth: rule.major, borderColor: palette.inkSoft },
  pressed: { opacity: 0.7 },
  taps: { textAlign: 'center', marginTop: space.md },
});
