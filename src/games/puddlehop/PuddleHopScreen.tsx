import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  RUNNER_SIZE,
  RUNNER_X,
  STAGE_WIDTH,
  STUMBLE_TIME,
  createGame,
  hop,
  release,
  starsForRun,
  step,
  type Obstacle,
  type PuddleHopState,
} from './logic';

/** How far up the stage the ground runs. The stage fills the screen, so
 *  there's sky above to hop into and a wide band of ground below to tap. */
const GROUND_SHARE = 0.36;

/**
 * The runner: a square with googly eyes, which is most of the joke.
 *
 * The pupils do the acting. They look ahead while running, roll up on the
 * way up and down on the way down, and cross when it trips — while the body
 * spins once and its legs flail. None of it is needed to play, so with
 * reduce motion on the spin and the leg shuffle go, and it simply blinks
 * cross-eyed through a stumble instead.
 */
function Runner({
  state,
  k,
  ground,
  reduceMotion,
}: {
  readonly state: PuddleHopState;
  readonly k: number;
  readonly ground: number;
  readonly reduceMotion: boolean;
}) {
  const size = RUNNER_SIZE * k;
  const eye = size * 0.36;
  const pupil = eye * 0.5;
  const tripping = state.stumbling > 0;
  const airborne = state.height > 0;

  // Where the pupils sit inside each eye, as offsets from its centre.
  const look = (side: 'left' | 'right') => {
    if (tripping) return { x: side === 'left' ? pupil * 0.5 : -pupil * 0.5, y: 0 };
    const y = airborne ? (state.rise > 0 ? -pupil * 0.5 : pupil * 0.5) : 0;
    return { x: pupil * 0.45, y };
  };

  // The body is the top of the runner's box and the legs fill the rest, so
  // its feet are on the ground exactly when the game thinks they are.
  const bodyHeight = size * 0.72;
  const legRoom = size - bodyHeight;

  // Legs shuffle with distance travelled, so they keep pace with the ground.
  const stride = Math.floor(state.distance / 14) % 2 === 0;
  const legLong = legRoom;
  const legShort = legRoom * 0.45;
  const legs = airborne
    ? [legShort, legShort]
    : reduceMotion
      ? [legLong, legLong]
      : stride
        ? [legLong, legShort]
        : [legShort, legLong];

  const spin =
    tripping && !reduceMotion ? `${Math.round((1 - state.stumbling / STUMBLE_TIME) * 360)}deg` : '0deg';

  return (
    <View
      testID="runner"
      style={{
        position: 'absolute',
        left: RUNNER_X * k,
        bottom: ground + state.height * k,
        width: size,
        height: size,
      }}
    >
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: bodyHeight,
            left: size * (i === 0 ? 0.2 : 0.62),
            width: size * 0.16,
            height: legs[i],
            backgroundColor: palette.ink,
          }}
        />
      ))}
      <View style={[styles.body, { width: size, height: bodyHeight, transform: [{ rotate: spin }] }]}>
        {(['left', 'right'] as const).map((side, i) => {
          const at = look(side);
          return (
            <View
              key={side}
              style={[
                styles.eye,
                {
                  width: eye,
                  height: eye,
                  borderRadius: eye / 2,
                  top: bodyHeight * 0.16,
                  left: size * (i === 0 ? 0.1 : 0.54),
                },
              ]}
            >
              <View
                style={{
                  width: pupil,
                  height: pupil,
                  borderRadius: pupil / 2,
                  backgroundColor: palette.ink,
                  transform: [{ translateX: at.x }, { translateY: at.y }],
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** One obstacle, told apart by shape: squat stone, tall bush, long flat
 *  puddle, or a pair of stones that wants one long hop. */
function Thing({
  obstacle,
  left,
  k,
  ground,
}: {
  readonly obstacle: Obstacle;
  readonly left: number;
  readonly k: number;
  readonly ground: number;
}) {
  const w = obstacle.width * k;
  const h = obstacle.height * k;
  if (obstacle.kind === 'stones') {
    const stone = w * 0.37;
    return (
      <>
        <View testID={`obstacle:${w}`} style={[styles.stone, { left, bottom: ground, width: stone, height: h }]} />
        <View style={[styles.stone, { left: left + w - stone, bottom: ground, width: stone, height: h }]} />
      </>
    );
  }
  if (obstacle.kind === 'puddle') {
    // Sunk into the ground rather than sitting on it — a puddle is a hole
    // full of water, not a lump.
    return (
      <View
        testID={`obstacle:${w}`}
        style={[styles.puddle, { left, bottom: ground - h, width: w, height: h * 2 }]}
      />
    );
  }
  return (
    <View
      testID={`obstacle:${w}`}
      style={[obstacle.kind === 'bush' ? styles.bush : styles.stone, { left, bottom: ground, width: w, height: h }]}
    />
  );
}

/**
 * react-native-web's own name for "report a press the instant it starts".
 * It isn't in React Native's types because native Pressable already reports
 * press-in at once; the web build is the one that needs telling.
 */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;

export function PuddleHopScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; "Play again" adapts locally, like
  // every other game.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<PuddleHopState>(() => createGame(systemRng, level));

  const k = (Dimensions.get('window').width - gutter * 2) / STAGE_WIDTH;
  // The stage takes whatever height the screen has; the ground is placed
  // once it's known.
  const [stageHeight, setStageHeight] = useState(0);
  const ground = Math.round(stageHeight * GROUND_SHARE);

  // The run: one animation frame at a time, only while it's actually going.
  useEffect(() => {
    if (!state.started || state.complete) return undefined;
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
  }, [state.started, state.complete]);

  // A bump gets the same gentle nudge a wrong answer does elsewhere.
  const bumps = useRef(0);
  useEffect(() => {
    if (state.bumps > bumps.current) nudge(settings);
    bumps.current = state.bumps;
  }, [state.bumps, settings]);

  const onHop = useCallback(() => {
    setState((prev) => {
      if (!prev.started) tap(settings);
      return hop(prev);
    });
  }, [settings]);

  // Pressing launches the hop and lifting the finger ends its climb, so the
  // hop is as big as the press is long. `PRESS_AT_ONCE` below matters:
  // react-native-web waits 50ms before reporting a press by default, and a
  // tap shorter than that was never reported at all — the hop was simply
  // lost, and every other hop landed 50ms after the child meant it.
  const onPressOut = useCallback(() => {
    setState(release);
  }, []);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    bumps.current = 0;
    setState(createGame(systemRng, atLevel));
  }, []);

  const stars = starsForRun(state);
  const progress = state.distance / state.finish;
  const visible = (x: number, width: number) =>
    x - state.distance + width > -40 && x - state.distance < STAGE_WIDTH + 40;

  // Ground ticks every 40 units, so the ground itself is seen to move.
  const tickOffset = state.distance % 40;
  const flagLeft = (state.finish + RUNNER_X + RUNNER_SIZE - state.distance) * k;

  return (
    <GameFrame title="Puddle Hop" icon="hop" onExit={onExit} progress={progress}>
      <StageLabel live>{state.started ? 'HOLD TO HOP HIGHER' : 'TAP TO START'}</StageLabel>

      {/* The whole stage is the button — the biggest target on any screen in
          the app. See `onPressOut` above for how a press becomes a hop. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.started ? 'Hop' : 'Start running'}
        {...PRESS_AT_ONCE}
        onPressIn={onHop}
        onPressOut={onPressOut}
        onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        style={styles.stage}
      >
        {Array.from({ length: Math.ceil(STAGE_WIDTH / 40) + 1 }, (_, i) => (
          <View
            key={i}
            style={[styles.tick, { left: (i * 40 - tickOffset) * k, bottom: ground - 10 }]}
          />
        ))}
        <View style={[styles.ground, { bottom: ground - rule.major }]} />

        {state.obstacles
          .filter((o) => visible(o.x, o.width))
          .map((o) => (
            <Thing key={o.x} obstacle={o} left={(o.x - state.distance) * k} k={k} ground={ground} />
          ))}

        {visible(state.finish + RUNNER_X + RUNNER_SIZE, 30) ? (
          <View style={[styles.flag, { left: flagLeft, bottom: ground }]}>
            <View style={[styles.flagCloth, { width: 26 * k, height: 18 * k }]} />
          </View>
        ) : null}

        <Runner state={state} k={k} ground={ground} reduceMotion={settings.reduceMotion} />
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
  stage: {
    flex: 1,
    marginBottom: gutter,
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderTopWidth: rule.hair,
    borderBottomWidth: rule.hair,
    borderColor: palette.border,
  },
  ground: { position: 'absolute', left: 0, right: 0, height: rule.major, backgroundColor: palette.ink },
  tick: { position: 'absolute', width: rule.major, height: 6, backgroundColor: palette.border },
  body: { backgroundColor: palette.accent },
  eye: {
    position: 'absolute',
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stone: { position: 'absolute', backgroundColor: palette.ink },
  bush: { position: 'absolute', backgroundColor: palette.leaf },
  puddle: { position: 'absolute', backgroundColor: palette.sky },
  flag: { position: 'absolute', width: rule.major * 2, height: 84, backgroundColor: palette.ink },
  flagCloth: { position: 'absolute', top: 0, left: rule.major * 2, backgroundColor: palette.accent },
});
