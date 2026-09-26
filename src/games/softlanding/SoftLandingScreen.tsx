import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerRow, HoldButton, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, playPalette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BASE_Y,
  COLUMN,
  DESCENTS_PER_ROUND,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  HALF_WIDTH,
  PAD_Y,
  createGame,
  descentNow,
  groundUnder,
  onPad,
  setEngine,
  starsForLandings,
  step,
  type Engines,
  type SoftLandingState,
} from './logic';

/** The rocket's parts, in field units up from its feet. */
const LEG = 10;
const BODY = 24;
const BODY_HALF = 9;
const NOSE = 12;
const FLAME = 14;
const FLAME_HALF = 5;
const SIDE_FLAME = 8;
const FLAG_HALF = 7;
/** The speed gauge: down speed from nothing to three times the safe speed. */
const GAUGE = { x: 296, top: 70, height: 150, width: 10 } as const;

function Rocket({ state, k }: { readonly state: SoftLandingState; readonly k: number }) {
  const { x, y } = state.rocket;
  const landed = state.phase === 'landed';
  const bumped = landed && state.landings[state.landings.length - 1] !== 'soft';
  const burning = state.fuel > 0 && !landed;
  const left = (v: number) => (v - (x - HALF_WIDTH)) * k;
  const top = (v: number) => (v - (y - LEG - BODY - NOSE)) * k;
  return (
    <View
      testID="rocket"
      style={{
        position: 'absolute',
        left: (x - HALF_WIDTH) * k,
        top: (y - LEG - BODY - NOSE) * k,
        width: HALF_WIDTH * 2 * k,
        height: (LEG + BODY + NOSE) * k,
        // A bumpy landing leaves it leaning, so it's seen as well as said.
        transform: bumped ? [{ rotate: '-10deg' }] : [],
      }}
    >
      {burning && state.engines.up ? (
        <View
          testID="flame"
          style={[
            styles.flameDown,
            {
              left: left(x - FLAME_HALF),
              top: top(y - LEG),
              borderLeftWidth: FLAME_HALF * k,
              borderRightWidth: FLAME_HALF * k,
              borderTopWidth: FLAME * k,
            },
          ]}
        />
      ) : null}
      {/* Nose, body, window. */}
      <View
        style={[
          styles.nose,
          { left: left(x - BODY_HALF), top: 0, borderLeftWidth: BODY_HALF * k, borderRightWidth: BODY_HALF * k, borderBottomWidth: NOSE * k },
        ]}
      />
      <View style={[styles.body, { left: left(x - BODY_HALF), top: top(y - LEG - BODY), width: BODY_HALF * 2 * k, height: BODY * k }]}>
        <View style={[styles.window, { left: (BODY_HALF - 4) * k, top: 5 * k, width: 8 * k, height: 8 * k }]} />
      </View>
      {/* Legs, and the bar across that holds them. */}
      <View style={[styles.leg, { left: 0, top: top(y - LEG - 2), width: HALF_WIDTH * 2 * k, height: 2 * k }]} />
      {[x - HALF_WIDTH, x + HALF_WIDTH - 3].map((at) => (
        <View key={at} style={[styles.leg, { left: left(at), top: top(y - LEG), width: 3 * k, height: LEG * k }]} />
      ))}
      {/* Side puffs, from the side opposite the way it's pushed. */}
      {burning && state.engines.left ? (
        <View
          style={[
            styles.flameSide,
            { left: left(x + BODY_HALF), top: top(y - LEG - BODY / 2 - 4), borderTopWidth: FLAME_HALF * k, borderBottomWidth: FLAME_HALF * k, borderLeftWidth: SIDE_FLAME * k },
          ]}
        />
      ) : null}
      {burning && state.engines.right ? (
        <View
          style={[
            styles.flameSide,
            { left: left(x - BODY_HALF - SIDE_FLAME), top: top(y - LEG - BODY / 2 - 4), borderTopWidth: FLAME_HALF * k, borderBottomWidth: FLAME_HALF * k, borderRightWidth: SIDE_FLAME * k },
          ]}
        />
      ) : null}
    </View>
  );
}

export function SoftLandingScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the rocket hangs in the sky where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<SoftLandingState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const moving = state.phase !== 'waiting';
  useEffect(() => {
    if (!moving || state.complete || paused) return undefined;
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
  }, [moving, state.complete, paused]);

  // A soft landing is a little cheer; anything else, the gentle nudge.
  const heard = useRef(0);
  useEffect(() => {
    if (state.landings.length <= heard.current) return;
    heard.current = state.landings.length;
    if (state.landings[state.landings.length - 1] === 'soft') correct(settings);
    else nudge(settings);
  }, [state.landings, settings]);

  const onEngine = useCallback(
    (engine: keyof Engines, on: boolean) => {
      setState((prev) => {
        const next = setEngine(prev, engine, on);
        if (prev.phase === 'waiting' && next.phase === 'flying') tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = 0;
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const descent = descentNow(state);
  const { rocket } = state;
  const last = state.landings[state.landings.length - 1];
  const height = groundUnder(descent, rocket.x) - rocket.y;
  const over = onPad(state, rocket.x, descent);

  const label =
    state.phase === 'waiting'
      ? state.sideways
        ? 'PRESS TO DROP — STEER TO THE PAD'
        : 'PRESS TO DROP — HOLD TO SLOW DOWN'
      : state.phase === 'landed'
        ? last === 'soft'
          ? 'SOFT LANDING!'
          : last === 'off'
            ? 'MISSED THE PAD'
            : rocket.vy > state.safeV
              ? 'BUMP! COMING DOWN TOO FAST'
              : 'BUMP! SLIDING SIDEWAYS'
        : state.fuel <= 0
          ? 'OUT OF FUEL'
          : rocket.vy > state.safeV && height < 160
            ? 'TOO FAST — HOLD UP'
            : state.sideways && !over
              ? 'STEER OVER THE PAD'
              : 'GENTLY DOES IT';

  const speedShare = Math.max(0, Math.min(1, rocket.vy / (state.safeV * 3)));
  const stars = starsForLandings(state);
  const progress = state.landings.length / DESCENTS_PER_ROUND;
  const stripes = Math.max(4, Math.round(state.padW / 12));

  return (
    <GameFrame title="Soft Landing" icon="lander" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        accessible
        accessibilityLabel={`Rocket ${Math.round(Math.max(0, height))} high, falling ${
          rocket.vy > state.safeV ? 'too fast' : 'gently'
        }. The pad is ${
          Math.abs(descent.padX - rocket.x) < 4 ? 'right below' : descent.padX < rocket.x ? 'to the left' : 'to the right'
        }. Rocket ${state.index + 1} of ${DESCENTS_PER_ROUND}.`}
        testID="sky"
      >
        {k > 0 ? (
          <View style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {/* The ground, column by column, hills and all. */}
            {descent.ground.map((top, c) => (
              <View key={c} style={[styles.ground, { left: c * COLUMN * k, top: top * k, width: COLUMN * k + 1, height: (FIELD_HEIGHT - top) * k }]} />
            ))}
            {/* The pad: a flat striped block. */}
            <View
              testID={`pad:${Math.round(descent.padX)}`}
              style={[styles.pad, { left: (descent.padX - state.padW / 2) * k, top: PAD_Y * k, width: state.padW * k, height: (BASE_Y - PAD_Y) * k }]}
            >
              {Array.from({ length: stripes }, (_, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? palette.ink : playPalette.sun }} />
              ))}
            </View>

            {/* Wind, up in the top bar with the fuel: the flag points the
                way it blows. No flag, no wind. */}
            {descent.wind ? (
              <View testID={`wind:${descent.wind > 0 ? 'right' : 'left'}`} style={[styles.windAt, { left: 196 * k, top: 12 * k }]}>
                <Text allowFontScaling={false} style={[styles.gaugeText, { fontSize: 11 * k }]}>
                  WIND
                </Text>
                <View
                  style={[
                    styles.flag,
                    {
                      borderTopWidth: FLAG_HALF * k,
                      borderBottomWidth: FLAG_HALF * k,
                      borderLeftWidth: descent.wind > 0 ? 30 * k : 0,
                      borderRightWidth: descent.wind > 0 ? 0 : 30 * k,
                    },
                  ]}
                />
              </View>
            ) : null}

            {/* Fuel, as a bar that empties. */}
            <View style={[styles.fuelAt, { left: 10 * k, top: 12 * k }]}>
              <Text allowFontScaling={false} style={[styles.gaugeText, { fontSize: 11 * k }]}>
                FUEL
              </Text>
              <View style={[styles.track, { width: 70 * k, height: 10 * k }]}>
                <View style={{ width: `${(state.fuel / state.fuelFull) * 100}%`, height: '100%', backgroundColor: palette.ink }} />
              </View>
            </View>

            {/* Speed: the bar grows down as the rocket falls faster. Past the
                line is too fast to land. */}
            <View
              style={[
                styles.track,
                { position: 'absolute', left: GAUGE.x * k, top: GAUGE.top * k, width: GAUGE.width * k, height: GAUGE.height * k },
              ]}
            >
              <View style={{ width: '100%', height: `${speedShare * 100}%`, backgroundColor: speedShare > 1 / 3 ? palette.accent : palette.ink }} />
              <View style={[styles.safeLine, { top: (GAUGE.height / 3) * k - 1 }]} />
            </View>
            <Text
              allowFontScaling={false}
              style={[styles.gaugeText, { position: 'absolute', left: (GAUGE.x - 26) * k, top: (GAUGE.top - 16) * k, fontSize: 11 * k }]}
            >
              SPEED
            </Text>

            <Rocket state={state} k={k} />
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.controls}>
        {state.sideways ? (
          <HoldButton accessibilityLabel="Push left" testID="engine:left" size={hitTarget + 8} onHold={(on) => onEngine('left', on)}>
            <Icon name="back" size={34} color={palette.ink} />
          </HoldButton>
        ) : null}
        <HoldButton accessibilityLabel="Engine: slow down" testID="engine:up" size={hitTarget + 8} onHold={(on) => onEngine('up', on)}>
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <Icon name="back" size={34} color={palette.ink} />
          </View>
        </HoldButton>
        {state.sideways ? (
          <HoldButton accessibilityLabel="Push right" testID="engine:right" size={hitTarget + 8} onHold={(on) => onEngine('right', on)}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="back" size={34} color={palette.ink} />
            </View>
          </HoldButton>
        ) : null}
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
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  ground: { position: 'absolute', backgroundColor: palette.inkSoft },
  pad: { position: 'absolute', flexDirection: 'row', borderWidth: rule.hair, borderColor: palette.ink },
  windAt: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.ink,
    borderRightColor: palette.ink,
  },
  fuelAt: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { borderWidth: rule.hair, borderColor: palette.ink, backgroundColor: palette.bg, overflow: 'hidden' },
  safeLine: { position: 'absolute', left: -4, right: -4, height: rule.major, backgroundColor: palette.ink },
  gaugeText: { fontFamily: fonts.heavy, color: palette.ink, letterSpacing: 1 },
  nose: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.ink,
  },
  body: { position: 'absolute', backgroundColor: palette.accent },
  window: { position: 'absolute', backgroundColor: palette.bg, borderWidth: rule.hair, borderColor: palette.ink },
  leg: { position: 'absolute', backgroundColor: palette.ink },
  flameDown: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: playPalette.sun,
  },
  flameSide: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: playPalette.sun,
    borderRightColor: playPalette.sun,
  },
  controls: { paddingTop: rule.major * 4 },
});
