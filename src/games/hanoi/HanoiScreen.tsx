import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import { PEGS, TOWERS, createGame, fewest, nextTower, starsForMoves, tapPeg, type HanoiState } from './logic';

/** How long a moved tower shows before the next. */
const SHOW_MS = 1000;
const DISC_H = 22;
const POLE = 6;

export function HanoiScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<HanoiState>(() => createGame(systemRng, level));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!state.done || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => nextTower(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.done, state.complete, settings, paused]);

  useEffect(() => {
    if (state.slipped) nudge(settings);
  }, [state.slipped, state.slips, settings]);

  const onPeg = useCallback(
    (peg: number) => {
      tap(settings);
      setState((prev) => tapPeg(prev, peg));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const pegWidth = width / PEGS;
  const discWidth = (size: number) => Math.max(24, ((pegWidth - 12) * size) / state.discs);
  const label = state.done
    ? 'MOVED!'
    : state.slipped
      ? 'TOO BIG FOR THERE — IT GOES BACK'
      : state.held != null
        ? 'NOW TAP WHERE IT GOES'
        : 'MOVE THE STACK TO THE RIGHT-HAND PEG';
  const stars = starsForMoves(state);
  const standHeight = (state.discs + 2) * DISC_H;

  return (
    <GameFrame title="Tower of Hanoi" icon="hanoi" onExit={onExit} progress={(state.tower + (state.done ? 1 : 0)) / TOWERS}>
      <StageLabel live>{label}</StageLabel>
      <GameStage>
        <View style={styles.pegs} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {state.pegs.map((discs, peg) => {
            const lifted = state.held === peg;
            const resting = lifted ? discs.slice(0, -1) : discs;
            return (
              <Pressable
                key={peg}
                accessibilityRole="button"
                accessibilityLabel={`${['Left', 'Middle', 'Right'][peg]} peg: ${discs.length ? `discs ${discs.join(', ')}, smallest is 1` : 'empty'}${lifted ? ', top disc lifted' : ''}`}
                testID={`peg:${peg}:${discs.join('.')}:${lifted ? 1 : 0}`}
                onPress={() => onPeg(peg)}
                style={({ pressed }) => [styles.peg, { height: standHeight + DISC_H * 2 }, pressed && styles.pressed]}
              >
                {/* The lifted disc floats above its peg. */}
                <View style={[styles.liftRow, { height: DISC_H * 1.5 }]}>
                  {lifted ? <View style={[styles.discHeld, { width: discWidth(discs[discs.length - 1]), height: DISC_H - 2 }]} /> : null}
                </View>
                <View style={[styles.stand, { height: standHeight }]}>
                  <View style={[styles.pole, { width: POLE, height: standHeight }]} />
                  <View style={styles.stack}>
                    {[...resting].reverse().map((size) => (
                      <View key={size} style={[size % 2 ? styles.disc : styles.discAlt, { width: discWidth(size), height: DISC_H - 2 }]} />
                    ))}
                  </View>
                </View>
                <View style={styles.base} />
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.mono, styles.moves]}>{`MOVES ${state.moves} · ${fewest(state.discs)} CAN DO IT`}</Text>
      </GameStage>

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
  pegs: { flexDirection: 'row', alignSelf: 'stretch' },
  peg: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 120 },
  pressed: { backgroundColor: 'rgba(32,30,29,0.08)' },
  liftRow: { justifyContent: 'center', alignItems: 'center' },
  stand: { alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch' },
  pole: { position: 'absolute', bottom: 0, backgroundColor: palette.inkSoft },
  stack: { alignItems: 'center', gap: 2 },
  disc: { backgroundColor: palette.ink },
  discAlt: { backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  discHeld: { backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.ink },
  base: { alignSelf: 'stretch', marginHorizontal: space.xs, height: rule.major * 2, backgroundColor: palette.ink },
  moves: { textAlign: 'center', marginTop: space.md },
});
