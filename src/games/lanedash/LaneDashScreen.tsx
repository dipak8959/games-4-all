import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  CAR_LENGTH,
  CAR_WIDTH,
  ROAD_WIDTH,
  SPIN_FOR,
  createGame,
  laneCentre,
  positionNow,
  rivalDistance,
  rivalLaneAt,
  hoppingOver,
  starsForPlace,
  steerTo,
  step,
  type LaneDashState,
  type Obstacle,
} from './logic';

/** How far up the stage the back of your car sits, in dp — the rest of the
 *  stage is road ahead, which is what the child needs to be looking at. */
const CAR_BASE = 64;

/** react-native-web's own name for "report a press the instant it starts";
 *  see Puddle Hop for why this matters. Native reports press-in at once. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;

const ORDINAL = ['', '1ST', '2ND', '3RD'];

/** What each lane is called, by how many lanes the road has. */
const LANE_NAMES: Readonly<Record<number, readonly string[]>> = {
  2: ['Left lane', 'Right lane'],
  3: ['Left lane', 'Middle lane', 'Right lane'],
};

/** Four small wheels, just outside the body on each side. */
function Wheels({ w, h }: { readonly w: number; readonly h: number }) {
  const wheel = { width: w * 0.12, height: h * 0.22 };
  return (
    <>
      {[0.12, 0.66].map((top) =>
        [-wheel.width, w].map((left) => (
          <View
            key={`${top}${left}`}
            style={[styles.wheel, wheel, { top: h * top, left: left === w ? w : -wheel.width }]}
          />
        )),
      )}
    </>
  );
}

/** Your car: the accent block with googly eyes at the front. The eyes look
 *  where you're steering and cross when you spin — the same face as the
 *  Puddle Hop runner, so a child knows which one is theirs at a glance. */
function PlayerCar({
  state,
  k,
  reduceMotion,
}: {
  readonly state: LaneDashState;
  readonly k: number;
  readonly reduceMotion: boolean;
}) {
  const w = CAR_WIDTH * k;
  const h = CAR_LENGTH * k;
  const eye = w * 0.34;
  const pupil = eye * 0.5;
  const spinning = state.spinFor > 0;
  const drift = Math.sign(state.lane - state.laneX);
  const look = (i: number) =>
    spinning
      ? { x: i === 0 ? pupil * 0.5 : -pupil * 0.5, y: 0 }
      : { x: drift * pupil * 0.45, y: -pupil * 0.4 };
  const spin = spinning && !reduceMotion ? `${Math.round((1 - state.spinFor / SPIN_FOR) * 360)}deg` : '0deg';

  // Mid-hop, the car's shadow stays on the road a little behind and to the
  // side, so the jump over the middle lane reads as a jump.
  const hopping = hoppingOver(state).length > 0;
  const left = laneCentre(state.lanes, state.laneX) * k - w / 2;

  return (
    <>
      {hopping ? (
        <View style={[styles.hopShadow, { left: left + w * 0.14, bottom: CAR_BASE - h * 0.12, width: w, height: h }]} />
      ) : null}
      <View
        testID="player-car"
        style={{
          position: 'absolute',
          left,
          bottom: CAR_BASE,
          width: w,
          height: h,
          transform: [{ rotate: spin }],
        }}
      >
        <Wheels w={w} h={h} />
        <View style={[styles.playerBody, { width: w, height: h }]}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[
                styles.eye,
                { width: eye, height: eye, borderRadius: eye / 2, top: h * 0.1, left: w * (i === 0 ? 0.1 : 0.56) },
              ]}
            >
              <View
                style={{
                  width: pupil,
                  height: pupil,
                  borderRadius: pupil / 2,
                  backgroundColor: palette.ink,
                  transform: [{ translateX: look(i).x }, { translateY: look(i).y }],
                }}
              />
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

/** A rival: an ink car with its number on it, so it's told apart from yours
 *  by shape and number, never only by colour. */
function RivalCar({ number, left, bottom, k }: { readonly number: number; readonly left: number; readonly bottom: number; readonly k: number }) {
  const w = CAR_WIDTH * k;
  const h = CAR_LENGTH * k;
  return (
    <View testID="rival-car" style={{ position: 'absolute', left, bottom, width: w, height: h }}>
      <Wheels w={w} h={h} />
      <View style={[styles.rivalBody, { width: w, height: h }]}>
        <Text style={[styles.rivalNumber, { fontSize: w * 0.5 }]} allowFontScaling={false}>
          {number}
        </Text>
      </View>
    </View>
  );
}

/** Cones are triangles, puddles flat pools, roadworks long striped blocks. */
function Thing({ o, lanes, k, bottom }: { readonly o: Obstacle; readonly lanes: number; readonly k: number; readonly bottom: number }) {
  const w = o.width * k;
  const h = o.length * k;
  const left = laneCentre(lanes, o.lane) * k - w / 2;
  const tag = { testID: `obstacle:${o.lane}` };
  if (o.kind === 'cone') {
    return (
      <View
        {...tag}
        style={{
          position: 'absolute',
          left,
          bottom,
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: h,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: palette.berry,
        }}
      />
    );
  }
  if (o.kind === 'puddle') {
    return <View {...tag} style={[styles.puddle, { left, bottom, width: w, height: h }]} />;
  }
  return (
    <View {...tag} style={[styles.roadworks, { left, bottom, width: w, height: h }]}>
      {[0.2, 0.5, 0.8].map((at) => (
        <View key={at} style={[styles.stripe, { top: h * at - rule.major }]} />
      ))}
    </View>
  );
}

export function LaneDashScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<LaneDashState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // The race: one animation frame at a time, only while it's running.
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

  const onSteer = useCallback(
    (lane: number) => {
      tap(settings);
      setState((prev) => steerTo(prev, lane));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    bumps.current = 0;
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = stage.width / ROAD_WIDTH;
  const place = state.place ?? positionNow(state);
  const stars = starsForPlace(place);
  const progress = state.distance / state.finish;

  // Track position → distance up the stage.
  const back = state.distance - CAR_LENGTH;
  const bottomOf = (y: number) => CAR_BASE + (y - back) * k;
  const onStage = (y: number, length: number) =>
    k > 0 && bottomOf(y + length) > -20 && bottomOf(y) < stage.height + 20;

  const laneW = (ROAD_WIDTH / state.lanes) * k;
  const dashEvery = 70;
  const firstDash = Math.floor((back - CAR_BASE / Math.max(k, 0.01)) / dashEvery) * dashEvery;
  const dashes = k > 0 ? Array.from({ length: Math.ceil(stage.height / (dashEvery * k)) + 2 }, (_, i) => firstDash + i * dashEvery) : [];

  const label = !state.started
    ? 'TAP A LANE TO GO'
    : state.complete
      ? `YOU CAME ${ORDINAL[place]}`
      : `PLACE ${place} OF 3`;

  return (
    <GameFrame title="Lane Dash" icon="race" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        testID={`road:${state.lanes}`}
      >
        {Array.from({ length: state.lanes - 1 }, (_, i) =>
          dashes.map((y) => (
            <View
              key={`${i}:${y}`}
              style={[styles.dash, { left: (i + 1) * laneW - rule.major / 2, bottom: bottomOf(y), height: 30 * k }]}
            />
          )),
        )}

        {onStage(state.finish, 32) ? (
          <View style={[styles.finish, { bottom: bottomOf(state.finish), height: 32 * k }]}>
            {Array.from({ length: 20 }, (_, i) => (
              <View
                key={i}
                style={{
                  width: '10%',
                  height: '50%',
                  backgroundColor: (i + Math.floor(i / 10)) % 2 === 0 ? palette.ink : palette.bg,
                }}
              />
            ))}
          </View>
        ) : null}

        {state.obstacles
          .filter((o) => onStage(o.y, o.length))
          .map((o) => (
            <Thing key={`${o.y}:${o.lane}`} o={o} lanes={state.lanes} k={k} bottom={bottomOf(o.y)} />
          ))}

        {state.rivals.map((r) => {
          const y = rivalDistance(r, state.elapsed, state.finish);
          if (!onStage(y - CAR_LENGTH, CAR_LENGTH)) return null;
          const lane = rivalLaneAt(r, y);
          return (
            <RivalCar
              key={r.number}
              number={r.number}
              left={laneCentre(state.lanes, lane) * k - (CAR_WIDTH * k) / 2}
              bottom={bottomOf(y - CAR_LENGTH)}
              k={k}
            />
          );
        })}

        {k > 0 ? <PlayerCar state={state} k={k} reduceMotion={settings.reduceMotion} /> : null}

        {/* Each lane of the road is its own button, the full height of the
            stage — as big as a target gets. Tap the lane you want to be in,
            however far across it is. */}
        <View style={styles.controls}>
          {LANE_NAMES[state.lanes].map((name, lane) => (
            <Pressable
              key={name}
              {...PRESS_AT_ONCE}
              accessibilityRole="button"
              accessibilityLabel={`${name}${state.lane === lane ? ', your car' : ''}`}
              onPressIn={() => onSteer(lane)}
              style={styles.lane}
            />
          ))}
        </View>
      </View>

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
    marginBottom: rule.major * 8,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderLeftWidth: rule.major,
    borderRightWidth: rule.major,
    borderColor: palette.ink,
  },
  dash: { position: 'absolute', width: rule.major, backgroundColor: palette.border },
  finish: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', flexWrap: 'wrap' },
  wheel: { position: 'absolute', backgroundColor: palette.ink },
  playerBody: { backgroundColor: palette.accent },
  rivalBody: { backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  rivalNumber: { fontFamily: fonts.heavy, color: palette.bg },
  eye: { position: 'absolute', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  puddle: { position: 'absolute', backgroundColor: palette.sky },
  roadworks: { position: 'absolute', backgroundColor: palette.ink },
  stripe: { position: 'absolute', left: 0, right: 0, height: rule.major * 2, backgroundColor: palette.sun },
  controls: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  lane: { flex: 1 },
  hopShadow: { position: 'absolute', backgroundColor: palette.border },
});
