import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel, StageScroll, fitTiles } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { Shape as ShapeMark } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { PAIRS, createGame, pairNow, tapPlace, type Item, type SpotChangeState } from './logic';

/** The top picture's places are this big: it's for looking, not tapping. */
const SMALL = 40;
const TICK_MS = 250;

const said = (item: Item) => (item ? `${item.shape}` : 'empty');

export function SpotChangeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the top picture's time stands still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<SpotChangeState>(() => createGame(systemRng, level));
  const [looked, setLooked] = useState(0);

  // Each new pair: the top picture shows again from the start.
  useEffect(() => setLooked(0), [state.index]);
  useEffect(() => {
    if (!Number.isFinite(state.showFor) || state.complete || paused || looked >= state.showFor) return undefined;
    const t = setTimeout(() => setLooked((s) => s + TICK_MS / 1000), TICK_MS);
    return () => clearTimeout(t);
  }, [looked, state.showFor, state.complete, paused]);

  const onTap = useCallback(
    (place: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(place)) return prev;
        if (pairNow(prev).changed.includes(place)) correct(settings);
        else nudge(settings);
        return tapPlace(prev, place);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const pair = pairNow(state);
  const hidden = looked >= state.showFor;
  const { tile, bleed } = fitTiles(pair.cols, 88);
  const rows = Array.from({ length: pair.rows }, (_, r) => r);
  const cols = Array.from({ length: pair.cols }, (_, c) => c);
  const stars = starsForMistakes(state.mistakes);
  const left = Number.isFinite(state.showFor) ? Math.max(0, Math.ceil(state.showFor - looked)) : null;

  return (
    <GameFrame title="Spot the Change" icon="spot" onExit={onExit} progress={state.index / PAIRS}>
      <StageLabel>{hidden ? 'WHAT CHANGED? TAP IT' : 'TAP WHAT IS DIFFERENT BELOW'}</StageLabel>
      <StageScroll>
        <Text style={type.mono}>{left == null ? 'BEFORE' : hidden ? 'BEFORE · COVERED' : `BEFORE · COVERED IN ${left}`}</Text>
        <View style={styles.small} accessible accessibilityLabel={hidden ? 'The top picture is covered.' : `Before: ${pair.before.map(said).join(', ')}.`}>
          {rows.map((r) => (
            <View key={r} style={styles.row}>
              {cols.map((c) => {
                const i = r * pair.cols + c;
                const item = pair.before[i];
                return (
                  <View key={c} testID={hidden ? undefined : `before:${i}:${item ? `${item.shape}.${item.color}` : '-'}`} style={[styles.smallCell, { width: SMALL, height: SMALL }, hidden && styles.covered]}>
                    {!hidden && item ? <ShapeMark shape={item.shape} color={item.color} size={SMALL * 0.7} /> : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[type.mono, styles.afterLabel]}>AFTER · TAP THE CHANGE</Text>
        <View style={[styles.big, { marginHorizontal: -bleed }]}>
          {rows.map((r) => (
            <View key={r} style={styles.row}>
              {cols.map((c) => {
                const i = r * pair.cols + c;
                const item = pair.after[i];
                const out = state.ruledOut.includes(i);
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${r + 1}, place ${c + 1}: ${said(item)}${out ? ', not this one' : ''}`}
                    testID={`after:${i}:${item ? `${item.shape}.${item.color}` : '-'}:${out ? 1 : 0}`}
                    disabled={out}
                    onPress={() => onTap(i)}
                    style={({ pressed }) => [styles.bigCell, { width: tile, height: tile }, out && styles.out, pressed && styles.pressed]}
                  >
                    {item ? <ShapeMark shape={item.shape} color={item.color} size={tile * 0.62} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
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
  small: { alignSelf: 'center', gap: rule.hair, marginTop: space.xs },
  big: { alignSelf: 'center', gap: rule.hair },
  row: { flexDirection: 'row', gap: rule.hair },
  smallCell: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.hair, borderColor: palette.inkSoft },
  covered: { backgroundColor: palette.inkSoft },
  bigCell: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  out: { opacity: 0.35, borderStyle: 'dashed' },
  pressed: { backgroundColor: palette.surface },
  afterLabel: { marginTop: space.lg, marginBottom: space.xs },
});
