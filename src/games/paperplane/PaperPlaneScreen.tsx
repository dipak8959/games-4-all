import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnswerRow, HoldButton, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, playPalette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GROUND_Y,
  MAX_SINK,
  PLANE_HALF_HEIGHT,
  PLANE_HALF_LENGTH,
  PLANE_X,
  STACK_WIDTH,
  createGame,
  gapCentre,
  passed,
  setHolding,
  starsForBumps,
  step,
  type PaperPlaneState,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** The puffs along each cloud's edge at the gap. */
const LIP = 22;

/** The paper dart: a long white wedge, nose to the right, with its fold. */
function Plane({ state, k }: { readonly state: PaperPlaneState; readonly k: number }) {
  const tilt = state.wobble > 0 ? Math.sin(state.time * 30) * 14 : Math.max(-25, Math.min(25, (state.vy / MAX_SINK) * 25));
  const L = PLANE_HALF_LENGTH * 2;
  const H = PLANE_HALF_HEIGHT * 2;
  return (
    <View
      testID="plane"
      style={{
        position: 'absolute',
        left: (PLANE_X - PLANE_HALF_LENGTH) * k,
        top: (state.y - PLANE_HALF_HEIGHT) * k,
        width: L * k,
        height: H * k,
        transform: [{ rotate: `${tilt}deg` }],
      }}
    >
      <View style={[styles.wing, { borderTopWidth: (H / 2) * k, borderBottomWidth: (H / 2) * k, borderLeftWidth: L * k }]} />
      <View style={[styles.fold, { left: 0, top: (H / 2 - 1) * k, width: L * 0.8 * k, height: 2 * k }]} />
    </View>
  );
}

export function PaperPlaneScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the plane hangs in the air where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<PaperPlaneState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!state.started || state.complete || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.started, state.complete, paused]);

  // A bump is the gentle nudge; the landing, the cheer.
  const heard = useRef({ bumps: 0, done: false });
  useEffect(() => {
    if (state.bumps > heard.current.bumps) nudge(settings);
    if (state.complete && !heard.current.done) correct(settings);
    heard.current = { bumps: state.bumps, done: state.complete };
  }, [state.bumps, state.complete, settings]);

  const onHold = useCallback(
    (holding: boolean) => {
      setState((prev) => {
        const next = setHolding(prev, holding);
        if (!prev.started && next.started) tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { bumps: 0, done: false };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  // Along the course, to across the screen: the plane stays put.
  const screenX = (x: number) => x - state.flown + PLANE_X;
  const next = state.stacks.find((s) => s.x + STACK_WIDTH / 2 + PLANE_HALF_LENGTH > state.flown);
  const nextCentre = next ? gapCentre(next, state.time) : null;
  const where =
    nextCentre == null
      ? 'The field is ahead.'
      : Math.abs(nextCentre - state.y) < state.gap / 4
        ? 'The next gap is straight ahead.'
        : nextCentre < state.y
          ? 'The next gap is higher up.'
          : 'The next gap is lower down.';

  const label = state.complete
    ? 'LANDED!'
    : !state.started
      ? 'HOLD TO TAKE OFF'
      : state.wobble > 0
        ? 'BUMP! THROUGH YOU GO'
        : 'HOLD TO CLIMB, LET GO TO GLIDE';

  const stars = starsForBumps(state.bumps);

  return (
    <GameFrame title="Paper Plane" icon="plane" onExit={onExit} progress={Math.min(1, state.flown / state.length)}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        // Holding anywhere on the sky climbs, as the button does.
        onPressIn={() => onHold(true)}
        onPressOut={() => onHold(false)}
        accessible
        accessibilityLabel={`${passed(state)} of ${state.stacks.length} clouds flown past. ${where}`}
        testID={`course:${passed(state)}:${state.stacks.length}`}
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.stacks.map((s, i) => {
              const x = screenX(s.x);
              if (x < -STACK_WIDTH || x > FIELD_WIDTH + STACK_WIDTH) return null;
              const centre = gapCentre(s, state.time);
              const top = centre - state.gap / 2;
              const bottom = centre + state.gap / 2;
              const left = (x - STACK_WIDTH / 2) * k;
              return (
                <React.Fragment key={i}>
                  <View testID={`stack:${i}:top`} style={[styles.stack, { left, top: -2 * k, width: STACK_WIDTH * k, height: (top + 2) * k }]} />
                  <View testID={`stack:${i}:bottom`} style={[styles.stack, { left, top: bottom * k, width: STACK_WIDTH * k, height: (GROUND_Y - bottom) * k }]} />
                  {/* Puffed lips round the gap, so it reads as cloud. */}
                  {/* Mostly tucked into the cloud, so the gap drawn is the gap that's there. */}
                  {[top - LIP * 0.75, bottom - LIP * 0.25].map((y) =>
                    [0.15, 0.5, 0.85].map((at) => (
                      <View
                        key={`${y}:${at}`}
                        style={[
                          styles.lip,
                          { left: (x - STACK_WIDTH / 2 + STACK_WIDTH * at - LIP / 2) * k, top: y * k, width: LIP * k, height: LIP * k, borderRadius: (LIP / 2) * k },
                        ]}
                      />
                    )),
                  )}
                </React.Fragment>
              );
            })}
            {/* The grass, and the flag at the far end of the field. */}
            <View style={[styles.grass, { top: GROUND_Y * k, height: (FIELD_HEIGHT - GROUND_Y) * k }]} />
            {screenX(state.length) < FIELD_WIDTH + 20 ? (
              <View style={{ position: 'absolute', left: (screenX(state.length) + 10) * k, top: (GROUND_Y - 60) * k }}>
                <View style={[styles.pole, { width: 3 * k, height: 60 * k }]} />
                <View style={[styles.flag, { left: 3 * k, width: 22 * k, height: 14 * k }]} />
              </View>
            ) : null}
            <Plane state={state} k={k} />
          </View>
        ) : null}
      </Pressable>

      <AnswerRow style={styles.controls}>
        <HoldButton accessibilityLabel="Hold to climb" testID="climb" size={hitTarget + 24} onHold={onHold}>
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <Icon name="back" size={34} color={palette.ink} />
          </View>
        </HoldButton>
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
  stage: { flex: 1 },
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: playPalette.sky,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  stack: { position: 'absolute', backgroundColor: palette.bg },
  lip: { position: 'absolute', backgroundColor: palette.bg },
  grass: { position: 'absolute', left: 0, right: 0, backgroundColor: playPalette.leaf, borderTopWidth: rule.major, borderTopColor: palette.ink },
  pole: { backgroundColor: palette.ink },
  flag: { position: 'absolute', top: 0, backgroundColor: palette.accent, borderWidth: rule.hair, borderColor: palette.ink },
  wing: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.ink,
  },
  fold: { position: 'absolute', backgroundColor: palette.bg },
  controls: { paddingTop: rule.major * 4 },
});
