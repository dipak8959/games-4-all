import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { FIELD_HEIGHT, FIELD_WIDTH, PICTURES_PER_ROUND, createGame, dotAt, nextPicture, tapDot, type DotToDotState } from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** How long a finished picture shows before the next. */
const SHOW_MS = 1800;
const DOT = 8;
const RING = 22;
/** Room for a dot's number. */
const LABEL = 34;

/** A straight line between two dots. */
function Line({ a, b, k, done }: { a: { x: number; y: number }; b: { x: number; y: number }; k: number; done: boolean }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const thick = done ? 6 : 4;
  return (
    <View
      style={[
        done ? styles.lineDone : styles.line,
        { left: ((a.x + b.x) / 2 - length / 2) * k, top: ((a.y + b.y) / 2 - thick / 2) * k, width: length * k, height: thick * k, transform: [{ rotate: `${angle}deg` }] },
      ]}
    />
  );
}

export function DotToDotScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the finished picture waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<DotToDotState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!state.done || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => nextPicture(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.done, state.complete, paused, settings]);

  useEffect(() => {
    if (state.mistakes) nudge(settings);
  }, [state.mistakes, settings]);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  const onPress = useCallback(
    (x: number, y: number) => {
      if (k <= 0) return;
      setState((prev) => {
        const dot = dotAt(prev, (x - offsetX) / k, y / k);
        if (dot == null) return prev;
        tap(settings);
        return tapDot(prev, dot);
      });
    },
    [k, offsetX, settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const picture = state.pictures[Math.min(state.index, state.pictures.length - 1)];
  const { dots } = picture;
  const count = dots.length;
  const next = dots[state.joined % count];
  const lines = Array.from({ length: Math.max(0, Math.min(state.joined, count + 1) - 1) }, (_, i) => [dots[i], dots[(i + 1) % count]]);
  const label = state.done ? `A ${picture.name.toUpperCase()}!` : state.hint ? `JOIN THE DOTS · NEXT IS ${next.label}` : 'JOIN THE DOTS IN ORDER';
  const stars = starsForMistakes(state.mistakes);

  return (
    <GameFrame title="Dot to Dot" icon="dots" onExit={onExit} progress={(state.index + (state.done ? 1 : 0)) / PICTURES_PER_ROUND}>
      <StageLabel live>{label}</StageLabel>
      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onPressIn={(e) => onPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        accessibilityRole="button"
        accessibilityLabel={state.done ? `Finished: a ${picture.name}.` : `${state.joined} of ${count} dots joined. Next is ${next.label}.`}
        testID={`sheet:${state.index}:${state.joined}`}
      >
        {k > 0 ? (
          <View testID="field" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {lines.map(([a, b], i) => (
              <Line key={i} a={a} b={b} k={k} done={state.done} />
            ))}
            {state.hint && !state.done ? (
              <View style={[styles.ring, { left: (next.x - RING) * k, top: (next.y - RING) * k, width: RING * 2 * k, height: RING * 2 * k, borderRadius: RING * k }]} />
            ) : null}
            {dots.map((d, i) => {
              const joined = i < state.joined;
              return (
                <View key={i} testID={`dot:${i}:${d.label}:${joined ? 1 : 0}`} style={{ position: 'absolute', left: (d.x - DOT) * k, top: (d.y - DOT) * k }}>
                  <View style={[joined ? styles.dotJoined : styles.dot, { width: DOT * 2 * k, height: DOT * 2 * k, borderRadius: DOT * k }]} />
                  {/* The number beside its dot, on the side nearer the middle, so it
                      never hangs off the picture. */}
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.number,
                      { fontSize: 15 * k, width: LABEL * k, top: -DOT * 1.4 * k },
                      d.x > FIELD_WIDTH / 2 ? { left: -LABEL * k - DOT * 0.2 * k, textAlign: 'right' } : { left: DOT * 2.2 * k },
                    ]}
                  >
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Pressable>

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
  stage: { flex: 1, marginBottom: rule.major * 4 },
  field: { position: 'absolute', top: 0, backgroundColor: palette.surface, borderWidth: rule.major, borderColor: palette.ink, overflow: 'hidden' },
  line: { position: 'absolute', backgroundColor: palette.ink },
  lineDone: { position: 'absolute', backgroundColor: palette.accent },
  ring: { position: 'absolute', borderWidth: rule.major * 2, borderColor: palette.accent },
  dot: { backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  dotJoined: { backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.ink },
  number: { position: 'absolute', fontFamily: fonts.heavy, color: palette.ink },
});
