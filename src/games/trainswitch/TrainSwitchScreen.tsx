import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { Shape as ShapeMark } from '../shapes/Shape';
import type { ColorKind } from '../shapes/logic';
import { nextLevel, type GameScreenProps } from '../types';
import {
  ENTRY,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  TRAINS,
  createGame,
  flip,
  start,
  starsForTrains,
  step,
  trainAt,
  type Shape,
  type TrainSwitchState,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** Each shape's colour — a second cue; the shape is what matches. */
const COLOUR: Record<Shape, ColorKind> = { circle: 'berry', square: 'sky', triangle: 'leaf', star: 'sun', diamond: 'grape', heart: 'berry' };
const STATION = 46;
const ENGINE_L = 40;
const ENGINE_H = 28;

/** A straight piece of track between two points. */
function Rail({ a, b, k, live }: { a: { x: number; y: number }; b: { x: number; y: number }; k: number; live: boolean }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const thick = live ? 7 : 3;
  return (
    <View
      style={[
        live ? styles.railLive : styles.rail,
        {
          left: ((a.x + b.x) / 2 - length / 2) * k,
          top: ((a.y + b.y) / 2 - thick / 2) * k,
          width: length * k,
          height: thick * k,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

export function TrainSwitchScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the trains stop where they are.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<TrainSwitchState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [news, setNews] = useState<'home' | 'astray' | null>(null);

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

  // A train home is a cheer; at the wrong station, the gentle nudge.
  const heard = useRef(0);
  useEffect(() => {
    if (state.arrivals.length <= heard.current) return undefined;
    heard.current = state.arrivals.length;
    const right = state.arrivals[state.arrivals.length - 1].right;
    if (right) correct(settings);
    else nudge(settings);
    setNews(right ? 'home' : 'astray');
    const off = setTimeout(() => setNews(null), 1000);
    return () => clearTimeout(off);
  }, [state.arrivals, settings]);

  const onFlip = useCallback(
    (junction: number) => {
      tap(settings);
      setState((prev) => flip(prev, junction));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = 0;
    setNews(null);
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const { nodes } = state;
  const root = nodes[state.root];
  const label = state.complete
    ? 'EVERY TRAIN IS IN!'
    : !state.started
      ? 'TAP A JUNCTION TO START THE TRAINS'
      : news === 'home'
        ? 'HOME!'
        : news === 'astray'
          ? 'WRONG STATION — ON TO THE NEXT'
          : 'SEND EACH TRAIN TO ITS OWN STATION';
  const stars = starsForTrains(state);
  const coming = state.trains[0] ?? null;
  const beyond = (id: number): Shape[] => {
    const n = nodes[id];
    return n.next ? [...beyond(n.next[0]), ...beyond(n.next[1])] : [n.shape as Shape];
  };

  return (
    <GameFrame title="Train Switch" icon="train" onExit={onExit} progress={state.arrivals.length / TRAINS}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onPressIn={() => setState((prev) => start(prev))}
        accessible={false}
        testID={`yard:${state.arrivals.length}`}
      >
        {k > 0 ? (
          <View testID="field" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {/* The way in, and every piece of track: the way each junction
                is set drawn solid, the other a thin rail. */}
            <Rail a={{ x: 0, y: root.y }} b={root} k={k} live />
            {nodes.map((n) =>
              n.next
                ? n.next.map((to, way) => <Rail key={`${n.id}:${to}`} a={n} b={nodes[to]} k={k} live={state.points[n.id] === way} />)
                : null,
            )}
            {nodes
              .filter((n) => n.shape)
              .map((n) => (
                <View
                  key={n.id}
                  testID={`station:${n.shape}`}
                  style={[styles.station, { left: (n.x - STATION / 2) * k, top: (n.y - STATION / 2) * k, width: STATION * k, height: STATION * k }]}
                >
                  <ShapeMark shape={n.shape as Shape} color={COLOUR[n.shape as Shape]} size={STATION * 0.62 * k} />
                </View>
              ))}
            {state.trains.map((t) => {
              const at = trainAt(state, t);
              const to = nodes[t.to];
              const from = t.from < 0 ? { x: ENTRY.x, y: to.y } : nodes[t.from];
              const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
              return (
                <View
                  key={t.id}
                  testID={`train:${t.shape}`}
                  style={[
                    styles.engine,
                    {
                      left: (at.x - ENGINE_L / 2) * k,
                      top: (at.y - ENGINE_H / 2) * k,
                      width: ENGINE_L * k,
                      height: ENGINE_H * k,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                >
                  <View style={[styles.window, { width: ENGINE_H * 0.8 * k, height: ENGINE_H * 0.8 * k }]}>
                    <ShapeMark shape={t.shape} color={COLOUR[t.shape]} size={ENGINE_H * 0.6 * k} />
                  </View>
                </View>
              );
            })}
            {/* The junctions: big buttons, each with an arrow the way it's set. */}
            {nodes
              .filter((n) => n.next)
              .map((n) => {
                const to = nodes[(n.next as readonly [number, number])[state.points[n.id]]];
                const angle = (Math.atan2(to.y - n.y, to.x - n.x) * 180) / Math.PI;
                return (
                  <Pressable
                    key={n.id}
                    {...PRESS_AT_ONCE}
                    accessibilityRole="button"
                    accessibilityLabel={`Junction ${n.id}: set ${state.points[n.id] ? 'down' : 'up'}. Tap to flip.`}
                    // What the track shows by eye: the stations up each way.
                    testID={`junction:${n.id}:${state.points[n.id]}:${beyond(n.next![0]).join('.')}:${beyond(n.next![1]).join('.')}`}
                    onPressIn={() => onFlip(n.id)}
                    style={({ pressed }) => [
                      styles.junction,
                      { left: n.x * k - hitTarget / 2, top: n.y * k - hitTarget / 2, width: hitTarget, height: hitTarget },
                      pressed && styles.junctionPressed,
                    ]}
                  >
                    <View style={[styles.lever, { transform: [{ rotate: `${angle + 180}deg` }] }]}>
                      <Icon name="back" size={26} color={palette.bg} />
                    </View>
                  </Pressable>
                );
              })}
          </View>
        ) : null}
      </Pressable>

      {/* What's coming, for anyone who can't see the yard. */}
      <View accessible accessibilityLabel={coming ? `Next train: ${coming.shape}.` : 'No train on the track.'} />

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
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  rail: { position: 'absolute', backgroundColor: palette.inkSoft },
  railLive: { position: 'absolute', backgroundColor: palette.ink },
  station: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  engine: { position: 'absolute', alignItems: 'flex-end', justifyContent: 'center', paddingRight: 3, backgroundColor: palette.ink },
  window: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
  junction: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  junctionPressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  lever: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.ink },
});
