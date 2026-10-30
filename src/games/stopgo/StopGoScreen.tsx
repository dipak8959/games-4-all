import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HoldButton, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, playPalette, rule, space } from '../../theme/tokens';
import { type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import { CROSSINGS, createGame, hold, starsForOops, step, type StopGoState } from './logic';

const LAMP = 44;
const WALKER = 40;
/** The ready light is a triangle this wide either side of its middle. */
const TRI_HALF = 20;
const TRI_TALL = 34;

export function StopGoScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the signal and the walker hold still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<StopGoState>(() => createGame(systemRng, level));
  const [width, setWidth] = useState(0);

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

  // Across the park is a cheer; a step back, the gentle nudge.
  const heard = useRef({ crossings: 0, oops: 0 });
  useEffect(() => {
    if (state.crossings > heard.current.crossings) correct(settings);
    if (state.oops > heard.current.oops) nudge(settings);
    heard.current = { crossings: state.crossings, oops: state.oops };
  }, [state.crossings, state.oops, settings]);

  const onHold = useCallback((down: boolean) => setState((prev) => hold(prev, down)), []);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { crossings: 0, oops: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const label = state.complete
    ? 'ACROSS FIVE TIMES!'
    : state.oopsFor > 0
      ? 'A STEP BACK — WAIT FOR GO'
      : state.light === 'go'
        ? 'GO! HOLD WALK'
        : state.light === 'ready'
          ? 'GET READY TO STOP'
          : 'STOP! LET GO';
  const stars = starsForOops(state.oops);
  const track = Math.max(0, width - WALKER);

  return (
    <GameFrame title="Stop and Go" icon="signal" onExit={onExit} progress={(state.crossings + state.x) / CROSSINGS}>
      <StageLabel live>{label}</StageLabel>
      <View style={styles.body}>
        {/* The signal: stop square on top, ready triangle, go circle below. */}
        <View style={styles.signal} accessible accessibilityLabel={`The signal says ${state.light === 'ready' ? 'get ready' : state.light}.`} testID={`light:${state.light}`}>
          <View style={[styles.lamp, state.light === 'stop' ? styles.stopOn : styles.off]} />
          <View style={styles.triWrap}>
            <View
              style={[
                styles.tri,
                { borderLeftWidth: TRI_HALF, borderRightWidth: TRI_HALF, borderBottomWidth: TRI_TALL, borderBottomColor: state.light === 'ready' ? playPalette.sun : palette.surface },
              ]}
            />
          </View>
          <View style={[styles.lamp, styles.round, state.light === 'go' ? styles.goOn : styles.off]} />
        </View>

        <View style={styles.park} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={styles.path} />
          <View style={[styles.flag]} />
          <View testID={`walker:${state.x.toFixed(3)}:${state.walking ? 1 : 0}`} style={[styles.walker, { left: track * state.x }]} />
          <View style={styles.crossings}>
            {Array.from({ length: CROSSINGS }, (_, i) => (
              <View key={i} style={[styles.tick, i < state.crossings && styles.tickDone]} />
            ))}
          </View>
          <Text style={[type.mono, styles.count]}>{`${state.crossings} OF ${CROSSINGS} ACROSS`}</Text>
        </View>
      </View>

      <View style={styles.button}>
        <HoldButton size={150} onHold={onHold} accessibilityLabel="Walk. Hold to walk, let go to stop." testID="walk">
          <Text style={type.h3}>WALK</Text>
        </HoldButton>
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
  body: { flex: 1, flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  signal: { width: LAMP + 20, paddingVertical: space.md, alignItems: 'center', gap: space.md, backgroundColor: palette.ink },
  lamp: { width: LAMP, height: LAMP, borderWidth: rule.major, borderColor: palette.bg },
  round: { borderRadius: LAMP / 2 },
  off: { backgroundColor: palette.surface },
  stopOn: { backgroundColor: palette.accent },
  goOn: { backgroundColor: playPalette.leaf },
  triWrap: { width: LAMP, height: LAMP, alignItems: 'center', justifyContent: 'center' },
  tri: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  park: { flex: 1, height: 180, justifyContent: 'center' },
  path: { position: 'absolute', left: 0, right: 0, top: 90 - 4, height: 8, backgroundColor: palette.inkSoft },
  flag: { position: 'absolute', right: 0, top: 30, width: 6, height: 60, backgroundColor: palette.ink },
  walker: { position: 'absolute', top: 90 - WALKER, width: WALKER, height: WALKER, borderRadius: WALKER / 2, backgroundColor: palette.ink },
  crossings: { position: 'absolute', left: 0, top: 120, flexDirection: 'row', gap: space.xs },
  tick: { width: 16, height: 16, borderWidth: rule.major, borderColor: palette.ink },
  tickDone: { backgroundColor: palette.ink },
  count: { position: 'absolute', left: 0, top: 146 },
  button: { alignItems: 'center', paddingVertical: space.md },
});
