import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  BOAT_X,
  BOTTOM,
  CATCHES,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FISH_HALF_HEIGHT,
  FISH_HALF_LENGTH,
  KINDS,
  SURFACE,
  cast,
  createGame,
  laneY,
  starsForSlips,
  step,
  type DeepSeaState,
  type Kind,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** The sail: a wedge this tall either side of its middle, and this long. */
const SAIL_HALF = 14;
const SAIL = 22;

/** Each kind's colour — a second cue only: pattern and tail tell them apart. */
const COLOURS = [playPalette.sun, palette.bg, playPalette.berry, playPalette.grape, playPalette.leaf, playPalette.deep];

/** In words, for the screen reader and the stage label. */
export function fishWords(kind: Kind): string {
  const pattern = kind.pattern === 'stripes' ? 'stripy' : kind.pattern === 'spots' ? 'spotty' : 'plain';
  return `${pattern} fish with a ${kind.tail} tail`;
}

/** A fish, facing the way it swims: a round body, a tail behind, and
 *  stripes, spots or nothing. */
export function FishShape({ kind, colour, size, facing }: { kind: Kind; colour: string; size: number; facing: 1 | -1 }) {
  const L = size;
  const H = size * 0.55;
  const tail = size * 0.34;
  return (
    <View style={{ width: L + tail, height: H, flexDirection: facing > 0 ? 'row' : 'row-reverse', alignItems: 'center' }}>
      {kind.tail === 'pointed' ? (
        <View
          style={[
            styles.tailPointed,
            facing > 0
              ? { borderTopWidth: H / 2, borderBottomWidth: H / 2, borderLeftWidth: tail, borderLeftColor: colour }
              : { borderTopWidth: H / 2, borderBottomWidth: H / 2, borderRightWidth: tail, borderRightColor: colour },
          ]}
        />
      ) : (
        <View style={[styles.tailRound, { width: tail, height: H * 0.8, borderRadius: H * 0.4, backgroundColor: colour, marginRight: facing > 0 ? -tail * 0.3 : 0, marginLeft: facing > 0 ? 0 : -tail * 0.3 }]} />
      )}
      <View style={[styles.body, { width: L, height: H, borderRadius: H / 2, backgroundColor: colour }]}>
        {kind.pattern === 'stripes'
          ? [0.3, 0.5].map((at) => <View key={at} style={[styles.stripe, { left: L * at, width: Math.max(2, L * 0.07), height: H }]} />)
          : kind.pattern === 'spots'
            ? [
                [0.28, 0.25],
                [0.46, 0.55],
                [0.3, 0.62],
              ].map(([x, y]) => (
                <View key={`${x}${y}`} style={[styles.spot, { left: L * x, top: H * y - H * 0.1, width: H * 0.22, height: H * 0.22, borderRadius: H * 0.11 }]} />
              ))
            : null}
        <View style={[styles.eye, { left: facing > 0 ? L * 0.74 : L * 0.16, top: H * 0.28, width: H * 0.18, height: H * 0.18, borderRadius: H * 0.09 }]} />
      </View>
    </View>
  );
}

export function DeepSeaScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the sea stands still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<DeepSeaState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (state.complete || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds, systemRng));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.complete, paused]);

  // The right fish is a cheer; a wrong one, the gentle nudge.
  const heard = useRef({ catches: 0, slips: 0 });
  useEffect(() => {
    if (state.catches > heard.current.catches) correct(settings);
    if (state.slips > heard.current.slips) nudge(settings);
    heard.current = { catches: state.catches, slips: state.slips };
  }, [state.catches, state.slips, settings]);

  const onCast = useCallback(() => {
    setState((prev) => {
      const next = cast(prev);
      if (next !== prev) tap(settings);
      return next;
    });
  }, [settings]);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { catches: 0, slips: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const wanted = KINDS[state.wanted];
  const label = state.complete
    ? 'A BUCKET FULL OF FISH!'
    : state.said === 'got'
      ? 'GOT IT!'
      : state.said === 'back'
        ? 'NOT THAT ONE — BACK IT GOES'
        : state.hook.going
          ? state.hook.going === 'down'
            ? 'DOWN GOES THE LINE'
            : 'REELING IN'
          : 'TAP TO DROP THE LINE';
  const stars = starsForSlips(state.slips);
  const under = state.fish.filter((f) => Math.abs(f.x - BOAT_X) < FISH_HALF_LENGTH * 2);

  return (
    <GameFrame title="Deep Sea Fishing" icon="fish" onExit={onExit} progress={state.catches / CATCHES}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onPressIn={onCast}
        accessible
        accessibilityLabel={`Catch the ${fishWords(wanted)}. ${state.catches} of ${CATCHES} caught. ${
          under.length ? `Under the boat now: ${under.map((f) => fishWords(KINDS[f.kind])).join(', ')}.` : 'Nothing under the boat just now.'
        }`}
        testID={`sea:${state.catches}:${state.wanted}`}
      >
        {k > 0 ? (
          <View testID="field" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            <View style={[styles.water, { top: SURFACE * k }]} />
            <View style={[styles.sand, { top: BOTTOM * k }]} />
            {/* The one to catch, in its bubble. */}
            <View testID={`wanted:${state.wanted}`} style={[styles.bubble, { left: 10 * k, top: 8 * k, width: 64 * k, height: 58 * k }]}>
              <FishShape kind={wanted} colour={COLOURS[state.wanted]} size={36 * k} facing={1} />
            </View>
            {/* Two short lines, clear of the boat's sail. */}
            <Text allowFontScaling={false} style={[styles.bubbleText, { left: 80 * k, top: 18 * k, fontSize: 11 * k, lineHeight: 15 * k }]}>
              {'CATCH\nTHIS ONE'}
            </Text>
            {/* The boat. */}
            <View style={[styles.hull, { left: (BOAT_X - 30) * k, top: (SURFACE - 16) * k, width: 60 * k, height: 16 * k }]} />
            <View style={[styles.mast, { left: (BOAT_X + 10) * k, top: (SURFACE - 52) * k, width: 3 * k, height: 36 * k }]} />
            <View style={[styles.sail, { left: (BOAT_X + 13) * k, top: (SURFACE - 50) * k, borderTopWidth: SAIL_HALF * k, borderBottomWidth: SAIL_HALF * k, borderLeftWidth: SAIL * k }]} />
            {/* The line and hook, and anything on it. */}
            <View style={[styles.line, { left: (BOAT_X - 1) * k, top: (SURFACE - 8) * k, width: 2 * k, height: Math.max(0, state.hook.y - SURFACE + 8) * k }]} />
            <View testID="hook" style={[styles.hook, { left: (BOAT_X - 1) * k, top: state.hook.y * k, width: 8 * k, height: 3 * k }]} />
            {state.fish.map((f) => {
              const dir = state.laneSpeed[f.lane] > 0 ? 1 : -1;
              return (
                <View
                  key={f.id}
                  testID={`fish:${f.id}:${f.kind}:${f.lane}:${dir}`}
                  style={{ position: 'absolute', left: (f.x - FISH_HALF_LENGTH - (dir > 0 ? FISH_HALF_LENGTH * 0.68 : 0)) * k, top: (laneY(state, f.lane) - FISH_HALF_HEIGHT) * k }}
                >
                  <FishShape kind={KINDS[f.kind]} colour={COLOURS[f.kind]} size={FISH_HALF_LENGTH * 2 * k} facing={dir as 1 | -1} />
                </View>
              );
            })}
            {state.hook.carrying ? (
              <View style={{ position: 'absolute', left: (BOAT_X - FISH_HALF_LENGTH) * k, top: (state.hook.y - FISH_HALF_HEIGHT + 6) * k, transform: [{ rotate: '-80deg' }] }}>
                <FishShape kind={KINDS[state.hook.carrying.kind]} colour={COLOURS[state.hook.carrying.kind]} size={FISH_HALF_LENGTH * 2 * k} facing={1} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <AnswerRow style={styles.controls}>
        <HoldButton accessibilityLabel="Drop the line" testID="cast" size={hitTarget + 24} onHold={(down) => down && onCast()}>
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
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
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  water: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: playPalette.sky, borderTopWidth: rule.major, borderTopColor: palette.ink },
  sand: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: palette.surfaceAlt, borderTopWidth: rule.hair, borderTopColor: palette.ink },
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: playPalette.sky, borderWidth: rule.major, borderColor: palette.ink },
  bubbleText: { position: 'absolute', fontFamily: fonts.heavy, color: palette.ink, letterSpacing: 1 },
  hull: { position: 'absolute', backgroundColor: palette.ink },
  mast: { position: 'absolute', backgroundColor: palette.ink },
  sail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.accent,
  },
  line: { position: 'absolute', backgroundColor: palette.ink },
  hook: { position: 'absolute', backgroundColor: palette.ink },
  tailPointed: { width: 0, height: 0, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  tailRound: { borderWidth: rule.hair, borderColor: palette.ink },
  body: { borderWidth: rule.hair, borderColor: palette.ink, overflow: 'hidden' },
  stripe: { position: 'absolute', top: 0, backgroundColor: palette.ink },
  spot: { position: 'absolute', backgroundColor: palette.ink },
  eye: { position: 'absolute', backgroundColor: palette.ink },
  controls: { paddingTop: rule.major * 4 },
});
