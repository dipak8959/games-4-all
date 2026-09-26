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
  CLOUD_HEIGHT,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  HOPPER,
  cloudX,
  createGame,
  progressOf,
  setSteer,
  starsForMisses,
  step,
  type CloudHopperState,
  type Steer,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
const SUN = 26;
/** The ground cloud sits this far up from the bottom of the view. */
const BASE = 44;

/** A cloud: a flat strip with three bumps on top. A puff cloud, which
 *  goes after one bounce, is only a dashed outline. */
function Cloud({ left, top, width, k, puff, testID }: { left: number; top: number; width: number; k: number; puff: boolean; testID: string }) {
  if (puff) {
    return <View testID={testID} style={[styles.puff, { left: left * k, top: top * k, width: width * k, height: CLOUD_HEIGHT * k }]} />;
  }
  const bump = Math.min(width / 3, 30);
  return (
    <>
      {[0.25, 0.5, 0.75].map((at) => (
        <View
          key={at}
          style={[
            styles.cloud,
            {
              left: (left + width * at - bump / 2) * k,
              top: (top - bump * 0.4) * k,
              width: bump * k,
              height: bump * k,
              borderRadius: (bump / 2) * k,
            },
          ]}
        />
      ))}
      <View testID={testID} style={[styles.cloud, { left: left * k, top: top * k, width: width * k, height: CLOUD_HEIGHT * k }]} />
    </>
  );
}

function Hopper({ state, k, top }: { state: CloudHopperState; k: number; top: number }) {
  // Squashed for a moment on each bounce, stretched on the way up.
  const [squash, setSquash] = useState(false);
  const seen = useRef(state.bounces);
  useEffect(() => {
    if (state.bounces === seen.current) return undefined;
    seen.current = state.bounces;
    setSquash(true);
    const off = setTimeout(() => setSquash(false), 90);
    return () => clearTimeout(off);
  }, [state.bounces]);
  const w = HOPPER * 2 * (squash ? 1.25 : 1);
  const h = HOPPER * 2 * (squash ? 0.75 : 1);
  const eye = 5;
  return (
    <View
      testID="hopper"
      style={[
        styles.hopper,
        {
          left: (state.hopper.x - w / 2) * k,
          top: (top + HOPPER * 2 - h) * k,
          width: w * k,
          height: h * k,
          borderRadius: (h / 2) * k,
        },
      ]}
    >
      {[-1, 1].map((side) => (
        <View
          key={side}
          style={[
            styles.eye,
            { left: (w / 2 + side * 5 - eye / 2 + state.steer * 2) * k, top: (h * 0.3) * k, width: eye * k, height: eye * k, borderRadius: (eye / 2) * k },
          ]}
        />
      ))}
    </View>
  );
}

export function CloudHopperScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the hopper hangs in the air where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<CloudHopperState>(() => createGame(systemRng, level));
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

  // A miss is the gentle nudge; the sun, the cheer.
  const heard = useRef({ misses: 0, done: false });
  useEffect(() => {
    if (state.misses > heard.current.misses) nudge(settings);
    if (state.complete && !heard.current.done) correct(settings);
    heard.current = { misses: state.misses, done: state.complete };
  }, [state.misses, state.complete, settings]);

  const onSteer = useCallback(
    (steer: Steer) => {
      setState((prev) => {
        const next = setSteer(prev, steer);
        if (!prev.started && next.started) tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { misses: 0, done: false };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const { clouds, camera, hopper } = state;
  // Heights run up from the ground; the screen runs down from the top.
  const screenY = (height: number) => FIELD_HEIGHT - BASE - (height - camera);
  const sun = clouds[state.sun];
  const next = clouds[Math.min(state.best + 1, state.sun)];
  const nextX = cloudX(next, state.time);
  const way = Math.abs(nextX - hopper.x) < next.width / 4 ? 'straight up' : nextX < hopper.x ? 'up and to the left' : 'up and to the right';

  const label = state.complete
    ? 'YOU REACHED THE SUN!'
    : !state.started
      ? 'HOLD AN ARROW TO START BOUNCING'
      : state.whoops > 0
        ? 'WHOOPS! BACK ON YOUR CLOUD'
        : 'BOUNCE UP TO THE SUN';

  const stars = starsForMisses(state.misses);

  return (
    <GameFrame title="Cloud Hopper" icon="hopper" onExit={onExit} progress={progressOf(state)}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        // Holding either side of the sky steers that way, as the arrows do.
        onPressIn={(e) => onSteer(e.nativeEvent.locationX < stage.width / 2 ? -1 : 1)}
        onPressOut={() => onSteer(0)}
        accessible
        accessibilityLabel={`Cloud ${state.best} of ${state.sun}. The next cloud is ${way}.`}
        testID={`sky:${state.best}:${state.sun}`}
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {/* The sun, over the top cloud. */}
            {screenY(sun.y) > -SUN * 3 ? (
              <View
                testID="sun"
                style={[
                  styles.sun,
                  {
                    left: (sun.x - SUN) * k,
                    top: (screenY(sun.y) - SUN * 2 - 30) * k,
                    width: SUN * 2 * k,
                    height: SUN * 2 * k,
                    borderRadius: SUN * k,
                  },
                ]}
              />
            ) : null}
            {clouds.map((c, i) => {
              const top = screenY(c.y);
              if (top < -40 || top > FIELD_HEIGHT + 40 || state.gone.includes(i)) return null;
              const x = cloudX(c, state.time);
              return <Cloud key={i} testID={`cloud:${i}`} left={x - c.width / 2} top={top} width={c.width} k={k} puff={c.puff} />;
            })}
            <Hopper state={state} k={k} top={screenY(hopper.y) - HOPPER * 2} />

            {/* How far up: a track up the side, the sun at its top. */}
            <View style={[styles.track, { left: (FIELD_WIDTH - 12) * k, top: 30 * k, width: 5 * k, height: 180 * k }]}>
              <View style={{ position: 'absolute', bottom: 0, width: '100%', height: `${progressOf(state) * 100}%`, backgroundColor: palette.ink }} />
            </View>
          </View>
        ) : null}
      </Pressable>

      <AnswerRow style={styles.controls}>
        <HoldButton accessibilityLabel="Steer left" testID="steer:left" size={hitTarget + 8} onHold={(on) => onSteer(on ? -1 : 0)}>
          <Icon name="back" size={34} color={palette.ink} />
        </HoldButton>
        <HoldButton accessibilityLabel="Steer right" testID="steer:right" size={hitTarget + 8} onHold={(on) => onSteer(on ? 1 : 0)}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
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
  cloud: { position: 'absolute', backgroundColor: palette.bg },
  puff: { position: 'absolute', borderWidth: rule.major, borderColor: palette.bg, borderStyle: 'dashed' },
  sun: { position: 'absolute', backgroundColor: playPalette.sun, borderWidth: rule.major, borderColor: palette.ink },
  hopper: { position: 'absolute', backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.ink },
  eye: { position: 'absolute', backgroundColor: palette.ink },
  track: { position: 'absolute', borderWidth: rule.hair, borderColor: palette.ink, backgroundColor: palette.bg },
  controls: { paddingTop: rule.major * 4 },
});
