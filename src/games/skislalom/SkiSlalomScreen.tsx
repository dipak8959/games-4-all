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
  MAX_ACROSS,
  SKIER_Y,
  TREE,
  createGame,
  missed,
  setSteer,
  starsForRun,
  step,
  type SkiSlalomState,
  type Steer,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
const FLAG = 16;
const POLE = 34;

/** One pole and its flag. Gates alternate red and blue, as on a real run;
 *  once passed, the flag shows a tick or a cross — a shape, not a colour. */
function Flag({ x, y, k, colour, mark }: { x: number; y: number; k: number; colour: string; mark: 'in' | 'missed' | null }) {
  return (
    <View style={{ position: 'absolute', left: (x - 1.5) * k, top: (y - POLE) * k }}>
      <View style={[styles.pole, { width: 3 * k, height: POLE * k }]} />
      <View style={[styles.flag, { left: 3 * k, width: FLAG * k, height: FLAG * 0.8 * k, backgroundColor: colour }]}>
        {mark === 'in' ? (
          // A tick: a short stroke and a long one.
          <>
            <View style={[styles.mark, { left: 3 * k, top: 6 * k, width: 5 * k, height: 2 * k, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.mark, { left: 5 * k, top: 5 * k, width: 9 * k, height: 2 * k, transform: [{ rotate: '-50deg' }] }]} />
          </>
        ) : mark === 'missed' ? (
          // A cross.
          <>
            <View style={[styles.mark, { left: 3 * k, top: 5.5 * k, width: 10 * k, height: 2 * k, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.mark, { left: 3 * k, top: 5.5 * k, width: 10 * k, height: 2 * k, transform: [{ rotate: '-45deg' }] }]} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function Pine({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <View style={{ position: 'absolute', left: (x - TREE) * k, top: (y - TREE * 2) * k, width: TREE * 2 * k, height: TREE * 2.6 * k }}>
      {[0, 0.7].map((at) => (
        <View
          key={at}
          style={[
            styles.pine,
            { top: at * TREE * k, borderLeftWidth: TREE * k, borderRightWidth: TREE * k, borderBottomWidth: TREE * 1.3 * k },
          ]}
        />
      ))}
      <View style={[styles.trunk, { left: (TREE - 2) * k, top: TREE * 2 * k, width: 4 * k, height: TREE * 0.6 * k }]} />
    </View>
  );
}

function Skier({ state, k }: { state: SkiSlalomState; k: number }) {
  const lean = state.tumbling > 0 ? 70 : (state.vx / MAX_ACROSS) * 30;
  return (
    <View
      testID="skier"
      style={{ position: 'absolute', left: (state.x - 12) * k, top: (SKIER_Y - 22) * k, width: 24 * k, height: 30 * k, transform: [{ rotate: `${-lean}deg` }] }}
    >
      <View style={[styles.head, { left: 7 * k, top: 0, width: 10 * k, height: 10 * k, borderRadius: 5 * k }]} />
      <View style={[styles.body, { left: 6 * k, top: 10 * k, width: 12 * k, height: 12 * k }]} />
      {[4, 16].map((x) => (
        <View key={x} style={[styles.ski, { left: (x - 1.5) * k, top: 14 * k, width: 3 * k, height: 16 * k }]} />
      ))}
    </View>
  );
}

export function SkiSlalomScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the skier stops where they are.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<SkiSlalomState>(() => createGame(systemRng, level));
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

  // A gate made is a little cheer; a gate missed or a tumble, the nudge.
  const heard = useRef({ gates: 0, tumbles: 0 });
  useEffect(() => {
    if (state.through.length > heard.current.gates) {
      if (state.through[state.through.length - 1] === 'in') correct(settings);
      else nudge(settings);
    }
    if (state.tumbles > heard.current.tumbles) nudge(settings);
    heard.current = { gates: state.through.length, tumbles: state.tumbles };
  }, [state.through, state.tumbles, settings]);

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
    heard.current = { gates: 0, tumbles: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const screenY = (y: number) => SKIER_Y + (y - state.down);
  const next = state.gates[state.through.length];
  const way = !next
    ? 'The finish is straight ahead.'
    : Math.abs(next.x - state.x) < state.gateWidth / 4
      ? 'The next gate is straight ahead.'
      : `The next gate is to the ${next.x < state.x ? 'left' : 'right'}.`;
  const lastGate = state.through[state.through.length - 1];
  const label = state.complete
    ? 'OVER THE FINISH!'
    : !state.started
      ? 'HOLD AN ARROW TO PUSH OFF'
      : state.tumbling > 0
        ? 'TUMBLE! UP YOU GET'
        : lastGate === 'missed' && next && screenY(next.y) > FIELD_HEIGHT * 0.75
          ? 'MISSED THAT GATE — ON TO THE NEXT'
          : 'BETWEEN THE FLAGS';
  const stars = starsForRun(state);

  return (
    <GameFrame title="Ski Slalom" icon="ski" onExit={onExit} progress={state.down / state.length}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        // Holding either side of the slope carves that way, as the arrows do.
        onPressIn={(e) => onSteer(e.nativeEvent.locationX < stage.width / 2 ? -1 : 1)}
        onPressOut={() => onSteer(0)}
        accessible
        accessibilityLabel={`${state.through.length} of ${state.gates.length} gates, ${missed(state)} missed. ${way}`}
        testID={`slope:${state.through.length}:${state.gates.length}`}
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.trees.map((t, i) => {
              const y = screenY(t.y);
              return y > -40 && y < FIELD_HEIGHT + 60 ? <Pine key={i} x={t.x} y={y} k={k} /> : null;
            })}
            {state.gates.map((g, i) => {
              const y = screenY(g.y);
              if (y < -40 || y > FIELD_HEIGHT + 60) return null;
              const colour = i % 2 ? playPalette.sky : palette.accent;
              const mark = state.through[i] ?? null;
              return (
                <View key={i} testID={`gate:${i}`} style={{ position: 'absolute', left: (g.x - state.gateWidth / 2) * k, top: (y - 2) * k, width: state.gateWidth * k, height: 4 * k }}>
                  <Flag x={0} y={2} k={k} colour={colour} mark={mark} />
                  <Flag x={state.gateWidth} y={2} k={k} colour={colour} mark={mark} />
                </View>
              );
            })}
            {/* The finish: a chequered line across the run. */}
            {screenY(state.length - 60) < FIELD_HEIGHT + 20 ? (
              <View style={[styles.finish, { top: screenY(state.length - 60) * k, height: 12 * k }]}>
                {Array.from({ length: 16 }, (_, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? palette.ink : palette.bg }} />
                ))}
              </View>
            ) : null}
            <Skier state={state} k={k} />
          </View>
        ) : null}
      </Pressable>

      <AnswerRow style={styles.controls}>
        <HoldButton accessibilityLabel="Carve left" testID="carve:left" size={hitTarget + 8} onHold={(on) => onSteer(on ? -1 : 0)}>
          <Icon name="back" size={34} color={palette.ink} />
        </HoldButton>
        <HoldButton accessibilityLabel="Carve right" testID="carve:right" size={hitTarget + 8} onHold={(on) => onSteer(on ? 1 : 0)}>
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
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  pole: { backgroundColor: palette.ink },
  flag: { position: 'absolute', top: 0, borderWidth: rule.hair, borderColor: palette.ink },
  mark: { position: 'absolute', backgroundColor: palette.bg },
  pine: {
    position: 'absolute',
    left: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: playPalette.teal,
  },
  trunk: { position: 'absolute', backgroundColor: palette.ink },
  finish: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', borderTopWidth: rule.hair, borderBottomWidth: rule.hair, borderColor: palette.ink },
  head: { position: 'absolute', backgroundColor: palette.ink },
  body: { position: 'absolute', backgroundColor: palette.accent, borderWidth: rule.hair, borderColor: palette.ink },
  ski: { position: 'absolute', backgroundColor: palette.ink },
  controls: { paddingTop: rule.major * 4 },
});
