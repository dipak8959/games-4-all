import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { BigButton } from '../../components/BigButton';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { ANGLES, aimAt, createGame, nextAngle, setAngle, type AngleJudgeState } from './logic';

/** How long a set angle shows before the next. */
const SHOW_MS = 1600;
const LINE = 5;
const DOT = 7;
const HANDLE = 18;

/** A straight line out from the middle, at an angle (anticlockwise from
 *  pointing right). */
function Ray({ cx, cy, length, degrees, style }: { cx: number; cy: number; length: number; degrees: number; style: object }) {
  const rad = (degrees * Math.PI) / 180;
  const mx = cx + (Math.cos(rad) * length) / 2;
  const my = cy - (Math.sin(rad) * length) / 2;
  return <View style={[style, { position: 'absolute', left: mx - length / 2, top: my - LINE / 2, width: length, height: LINE, transform: [{ rotate: `${-degrees}deg` }] }]} />;
}

/** The angle that was wanted: a dotted line, told apart by more than its red. */
function DottedRay({ cx, cy, length, degrees }: { cx: number; cy: number; length: number; degrees: number }) {
  const rad = (degrees * Math.PI) / 180;
  const dots = Array.from({ length: Math.floor(length / 12) }, (_, i) => (i + 1) * 12);
  return (
    <>
      {dots.map((d) => (
        <View key={d} style={[styles.wantedDot, { left: cx + Math.cos(rad) * d - DOT / 2, top: cy - Math.sin(rad) * d - DOT / 2 }]} />
      ))}
    </>
  );
}

export function AngleJudgeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<AngleJudgeState>(() => createGame(systemRng, level));
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!state.result || state.complete || paused) return undefined;
    if (state.result.near) correct(settings);
    else nudge(settings);
    const t = setTimeout(() => setState((prev) => nextAngle(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.result, state.complete, settings, paused]);

  const size = Math.min(box.width, box.height);
  const cx = box.width / 2;
  const cy = box.height / 2;
  const length = size * 0.44;
  const target = state.targets[Math.min(state.index, state.targets.length - 1)];
  const base = state.bases[Math.min(state.index, state.bases.length - 1)];

  // A finger anywhere turns the line to point at it.
  const point = useCallback(
    (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.locationX - cx;
      const dy = cy - e.nativeEvent.locationY;
      if (Math.hypot(dx, dy) < 8) return;
      const degrees = (Math.atan2(dy, dx) * 180) / Math.PI - base;
      setState((prev) => aimAt(prev, degrees));
    },
    [cx, cy, base],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const arc = Array.from({ length: Math.floor(state.aim / 6) }, (_, i) => base + 3 + i * 6);
  const label = state.result
    ? state.result.near
      ? `SPOT ON · YOU SET ${state.result.set}°`
      : `YOU SET ${state.result.set}° · ${target}° IS THE DOTTED LINE`
    : 'POINT THE LINE, THEN SET IT';
  const stars = starsForMistakes(state.misses);

  return (
    <GameFrame title="Angle Judge" icon="angle" onExit={onExit} progress={(state.index + (state.result ? 1 : 0)) / ANGLES}>
      <StageLabel live>{label}</StageLabel>
      <Text allowFontScaling={false} style={styles.target} testID={`angle:${target}:${base}:${state.aim}`}>
        {`${target}°`}
      </Text>
      <View
        style={styles.stage}
        onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => !state.result}
        onMoveShouldSetResponder={() => !state.result}
        onResponderGrant={point}
        onResponderMove={point}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Turn the line to ${target} degrees. Tap or drag to point it, then set it.`}
        testID="protractor"
      >
        {size > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.circle, { left: cx - length, top: cy - length, width: length * 2, height: length * 2, borderRadius: length }]} />
            {arc.map((d) => {
              const rad = (d * Math.PI) / 180;
              return <View key={d} style={[styles.arcDot, { left: cx + Math.cos(rad) * length * 0.3 - 2, top: cy - Math.sin(rad) * length * 0.3 - 2 }]} />;
            })}
            <Ray cx={cx} cy={cy} length={length} degrees={base} style={styles.fixed} />
            {state.result && !state.result.near ? <DottedRay cx={cx} cy={cy} length={length} degrees={base + target} /> : null}
            <Ray cx={cx} cy={cy} length={length} degrees={base + state.aim} style={styles.turning} />
            {/* The turning line's handle, at its end. */}
            <View
              style={[
                styles.handle,
                {
                  left: cx + Math.cos(((base + state.aim) * Math.PI) / 180) * length - HANDLE / 2,
                  top: cy - Math.sin(((base + state.aim) * Math.PI) / 180) * length - HANDLE / 2,
                },
              ]}
            />
            <View style={[styles.pivot, { left: cx - 7, top: cy - 7 }]} />
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.nudges}>
        <AnswerButton size={110} accessibilityLabel="1 degree back" disabled={!!state.result} onPress={() => setState((prev) => aimAt(prev, prev.aim - 1))}>
          <Text style={type.h3}>1° BACK</Text>
        </AnswerButton>
        <AnswerButton size={110} accessibilityLabel="1 degree on" disabled={!!state.result} onPress={() => setState((prev) => aimAt(prev, prev.aim + 1))}>
          <Text style={type.h3}>1° ON</Text>
        </AnswerButton>
      </AnswerRow>
      <BigButton label="SET IT" icon="angle" disabled={!!state.result} onPress={() => setState((prev) => setAngle(prev))} style={styles.set} />

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
  target: { fontFamily: fonts.heavy, fontSize: 44, lineHeight: 50, color: palette.ink, textAlign: 'center' },
  stage: { flex: 1, minHeight: 180 },
  circle: { position: 'absolute', borderWidth: rule.hair, borderColor: palette.inkSoft },
  arcDot: { position: 'absolute', width: 4, height: 4, backgroundColor: palette.inkSoft },
  fixed: { backgroundColor: palette.ink },
  turning: { backgroundColor: palette.ink, opacity: 0.85 },
  wantedDot: { position: 'absolute', width: DOT, height: DOT, backgroundColor: palette.accent },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  pivot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: palette.ink },
  nudges: { justifyContent: 'center', marginTop: space.sm },
  set: { marginTop: space.sm, marginBottom: space.sm },
});
