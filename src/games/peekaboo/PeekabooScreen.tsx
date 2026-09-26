import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  PALS_PER_ROUND,
  createGame,
  missed,
  start,
  starsForPals,
  step,
  tapHole,
  upIn,
  woken,
  type PalKind,
  type PeekabooState,
} from './logic';

type Face = 'awake' | 'sleepy' | 'happy' | 'grumpy';

/** A pal: a round-shouldered block with a face. Awake pals have big open
 *  eyes; sleepy ones have them shut, and a nightcap — so they're told apart
 *  by the face, never only by colour. */
function Pal({ face, size }: { readonly face: Face; readonly size: number }) {
  const body = size * 0.56;
  const eye = body * 0.3;
  const colour = face === 'sleepy' ? palette.deep : palette.accent;
  return (
    <View style={{ width: body, height: body + size * 0.12, alignItems: 'center' }}>
      {face === 'sleepy' ? (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: body * 0.34,
            borderRightWidth: body * 0.34,
            borderBottomWidth: size * 0.14,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: palette.grape,
          }}
        />
      ) : (
        <View style={{ height: size * 0.14 }} />
      )}
      <View style={{ width: body, height: body - size * 0.02, backgroundColor: colour }}>
        {[0.14, 0.56].map((x) => (
          <View key={x} style={[styles.eyeBox, { left: body * x, top: body * 0.18, width: eye, height: eye }]}>
            {face === 'sleepy' || face === 'happy' ? (
              <View style={{ width: eye, height: Math.max(2, eye * 0.18), backgroundColor: palette.ink }} />
            ) : (
              <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2 }]}>
                <View style={{ width: eye * 0.5, height: eye * 0.5, borderRadius: eye / 4, backgroundColor: palette.ink }} />
              </View>
            )}
          </View>
        ))}
        <View
          style={{
            position: 'absolute',
            left: body * 0.3,
            top: face === 'grumpy' ? body * 0.72 : body * 0.66,
            width: body * 0.4,
            height: Math.max(2, body * 0.07),
            backgroundColor: palette.ink,
          }}
        />
      </View>
      {face === 'sleepy' ? (
        <Text allowFontScaling={false} style={[styles.z, { fontSize: size * 0.16, left: body * 0.9, top: 0 }]}>
          z
        </Text>
      ) : null}
    </View>
  );
}

export function PeekabooScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: every pal stays exactly where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<PeekabooState>(() => createGame(systemRng, level));

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

  // A miss (a pal ducking unseen) gets the gentle nudge, once each.
  const seenMissed = useRef(0);
  const nowMissed = missed(state);
  useEffect(() => {
    if (nowMissed > seenMissed.current) nudge(settings);
    seenMissed.current = nowMissed;
  }, [nowMissed, settings]);

  const onHole = useCallback(
    (hole: number) => {
      setState((prev) => {
        if (!prev.started) return start(prev);
        const i = upIn(prev, hole);
        if (i >= 0) {
          if (prev.pops[i].kind === 'awake') correct(settings);
          else nudge(settings);
        }
        return tapHole(prev, hole);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    seenMissed.current = 0;
    setState(createGame(systemRng, atLevel));
  }, []);

  const tile = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const across = Math.floor((width - gutter * 2 - (state.cols - 1) * rule.hair) / state.cols);
    const down = Math.floor((height - 240) / state.rows);
    return Math.max(hitTarget, Math.min(120, across, down));
  }, [state.cols, state.rows]);

  /** What's showing in a hole right now: a pal peeking, or one just tapped
   *  and still on its way down. */
  const faceIn = (hole: number): { face: Face; kind: PalKind } | null => {
    const i = state.pops.findIndex(
      (p) => p.hole === hole && state.elapsed >= p.at && state.elapsed < p.at + p.up,
    );
    if (i < 0) return null;
    const p = state.pops[i];
    if (!state.tapped.includes(i)) return { face: p.kind, kind: p.kind };
    return { face: p.kind === 'awake' ? 'happy' : 'grumpy', kind: p.kind };
  };

  const stars = starsForPals(state);
  const gone = state.pops.filter((p) => state.elapsed >= p.at + p.up).length;
  const progress = gone / PALS_PER_ROUND;
  const label = !state.started ? 'TAP A HOLE TO START' : woken(state) > 0 ? 'SAY HELLO — LET SLEEPY PALS SLEEP' : 'SAY HELLO TO THE PALS';

  return (
    <GameFrame title="Peekaboo Pals" icon="peekaboo" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <StageLabel live>{label}</StageLabel>
        <AnswerRow style={{ maxWidth: state.cols * tile + (state.cols - 1) * rule.hair, alignSelf: 'center' }}>
          {Array.from({ length: state.cols * state.rows }, (_, hole) => {
            const here = faceIn(hole);
            const words = !here
              ? 'empty'
              : here.face === 'happy'
                ? 'a happy pal'
                : here.face === 'grumpy'
                  ? 'a woken pal'
                  : here.kind === 'awake'
                    ? 'an awake pal'
                    : 'a sleepy pal';
            return (
              <AnswerButton
                key={hole}
                accessibilityLabel={`Hole ${hole + 1}, ${words}`}
                size={tile}
                onPress={() => onHole(hole)}
              >
                <View style={[styles.cell, { width: tile - 18, height: tile - 4 }]}>
                  {here ? <Pal face={here.face} size={tile} /> : null}
                  <View style={[styles.hole, { width: tile * 0.7, height: tile * 0.14 }]} />
                </View>
              </AnswerButton>
            );
          })}
        </AnswerRow>
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
  stage: { flex: 1, justifyContent: 'center' },
  cell: { alignItems: 'center', justifyContent: 'flex-end' },
  hole: { backgroundColor: palette.ink },
  eyeBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  eye: { backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  z: { position: 'absolute', fontFamily: fonts.heavy, color: palette.ink },
});
