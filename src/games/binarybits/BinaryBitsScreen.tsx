import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, StageLabel, fitTiles } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import { NUMBERS, createGame, next, starsForExtra, toggle, type BinaryBitsState } from './logic';

/** How long a made number shows before the next. */
const SHOW_MS = 900;
const PER_ROW = 4;

export function BinaryBitsScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BinaryBitsState>(() => createGame(systemRng, level));

  // A number made: a cheer, a moment to see it, then the next.
  useEffect(() => {
    if (!state.made || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => next(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.made, state.complete, settings, paused]);

  const onToggle = useCallback(
    (bit: number) => {
      tap(settings);
      setState((prev) => toggle(prev, bit));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const target = state.targets[Math.min(state.index, state.targets.length - 1)];
  const { tile } = fitTiles(PER_ROW, 96);
  // Highest bit first, four to a row.
  const order = Array.from({ length: state.bits }, (_, i) => state.bits - 1 - i);
  const rows: number[][] = [];
  for (let i = 0; i < order.length; i += PER_ROW) rows.push(order.slice(i, i + PER_ROW));
  const stars = starsForExtra(state.extra);

  return (
    <GameFrame title="Binary Bits" icon="bits" onExit={onExit} progress={(state.index + (state.made ? 1 : 0)) / NUMBERS}>
      <StageLabel live>{state.made ? 'MADE IT!' : 'SWITCH BITS ON TO MAKE THE NUMBER'}</StageLabel>
      <GameStage style={styles.stage}>
        <View accessible accessibilityLabel={`Make ${target}.`} style={styles.targetWrap}>
          <Text style={type.mono}>MAKE</Text>
          <Text allowFontScaling={false} style={styles.target} testID={`target:${target}`}>
            {target}
          </Text>
        </View>

        <View style={styles.bits}>
          {rows.map((row) => (
            <View key={row[0]} style={styles.bitRow}>
              {row.map((bit) => {
                const on = ((state.value >> bit) & 1) === 1;
                return (
                  <Pressable
                    key={bit}
                    accessibilityRole="switch"
                    accessibilityLabel={`Bit worth ${2 ** bit}`}
                    aria-checked={on}
                    testID={`bit:${bit}:${on ? 1 : 0}`}
                    onPress={() => onToggle(bit)}
                    style={[on ? styles.bitOn : styles.bit, { width: tile, height: tile }]}
                  >
                    <Text allowFontScaling={false} style={[styles.bitValue, on && styles.bitValueOn]}>
                      {2 ** bit}
                    </Text>
                    <Text allowFontScaling={false} style={[type.mono, on && styles.bitValueOn]}>
                      {on ? 'ON' : 'OFF'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[type.h3, styles.total]} accessibilityLiveRegion="polite">
          {state.showTotal ? `ON ADDS UP TO ${state.value}` : ' '}
        </Text>
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
  stage: { gap: space.lg },
  targetWrap: { alignItems: 'center' },
  target: { fontFamily: fonts.heavy, fontSize: 64, lineHeight: 72, color: palette.ink },
  bits: { gap: rule.hair, alignItems: 'center' },
  bitRow: { flexDirection: 'row', gap: rule.hair },
  bit: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  bitOn: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.ink },
  bitValue: { fontFamily: fonts.heavy, fontSize: 24, color: palette.ink },
  bitValueOn: { color: palette.bg },
  total: { textAlign: 'center' },
});
