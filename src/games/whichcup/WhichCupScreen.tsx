import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  QUESTIONS_PER_ROUND,
  ballAfter,
  ballCup,
  createGame,
  cupPlaces,
  next,
  pick,
  showAgain,
  specForLevel,
  startShuffle,
  stopShuffle,
  type WhichCupState,
} from './logic';

/** How long the ball is on show before the cups come down. */
const SHOW_MS = 1800;
/** A beat with the cups down and still, so the shuffle doesn't start the
 *  instant the ball disappears. */
const SETTLE_MS = 600;
/** How long a found ball stays in sight before the next one. */
const FOUND_MS = 1100;

const LABELS = {
  show: 'WATCH THE BALL',
  shuffle: 'KEEP WATCHING',
  choose: 'WHICH CUP?',
  found: 'FOUND IT',
} as const;

export function WhichCupScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the cups stop. A shuffle cut short is shown again
  // from the start — the ball first — when the game comes back.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<WhichCupState>(() => createGame(systemRng, level));
  // The cups are lifted while the ball is on show, then set down.
  const [lifted, setLifted] = useState(true);
  // Milliseconds into the shuffle, driven by the animation frame.
  const [ms, setMs] = useState(0);

  const swapMs = specForLevel(level).swapMs;
  const { question, phase } = state;

  useEffect(() => {
    if (paused) setState(showAgain);
  }, [paused]);

  useEffect(() => {
    if (phase !== 'show' || paused) return undefined;
    setLifted(true);
    setMs(0);
    const down = setTimeout(() => setLifted(false), SHOW_MS);
    const go = setTimeout(() => setState(startShuffle), SHOW_MS + SETTLE_MS);
    return () => {
      clearTimeout(down);
      clearTimeout(go);
    };
  }, [phase, state.questionIndex, paused]);

  useEffect(() => {
    if (phase !== 'shuffle' || paused) return undefined;
    const total = question.swaps.length * swapMs;
    let frame = 0;
    let begun: number | null = null;
    const tick = (now: number) => {
      if (begun === null) begun = now;
      const t = now - begun;
      if (t >= total) {
        setMs(total);
        setState(stopShuffle);
        return;
      }
      setMs(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, question, swapMs, paused]);

  useEffect(() => {
    if (phase !== 'found') return undefined;
    const on = setTimeout(() => setState((prev) => next(prev, systemRng, level)), FOUND_MS);
    return () => clearTimeout(on);
  }, [phase, level]);

  const onPick = useCallback(
    (slot: number) => {
      setState((prev) => {
        if (prev.phase !== 'choose' || prev.ruledOut.includes(slot)) return prev;
        if (slot === ballAfter(prev.question)) correct(settings);
        else nudge(settings);
        return pick(prev, slot);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const tile = useMemo(() => {
    const across = Dimensions.get('window').width - gutter * 2;
    return Math.max(hitTarget, Math.min(104, Math.floor((across - (question.cups - 1) * rule.hair) / question.cups)));
  }, [question.cups]);
  const pitch = tile + rule.hair;
  const width = question.cups * tile + (question.cups - 1) * rule.hair;
  const height = tile * 2.2;

  // Cup and ball geometry, in the space of one slot.
  const cupW = tile * 0.78;
  const cupTop = tile * 0.5;
  const cupH = tile * 0.7;
  const restTop = height - tile * 0.9;
  const ballR = tile * 0.17;
  const bandW = cupTop + (cupW - cupTop) * 0.67;

  const places = cupPlaces(question, phase === 'show' ? 0 : ms, swapMs);
  const ballSlot = phase === 'show' ? question.start : ballAfter(question);
  const ballSeen = (phase === 'show' && lifted) || phase === 'found';
  const endSlotOfCup = (cup: number) => Math.round(places[cup].x);

  const stars = starsForMistakes(state.mistakes);
  const progress = (state.questionIndex + (phase === 'found' ? 1 : 0)) / QUESTIONS_PER_ROUND;

  return (
    <GameFrame title="Which Cup?" icon="cups" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <StageLabel live>{LABELS[phase]}</StageLabel>

        <View style={{ width, height, alignSelf: 'center' }}>
          <AnswerRow style={[styles.slots, { width }]}>
            {Array.from({ length: question.cups }, (_, slot) => {
              const status =
                phase === 'show' && slot === question.start
                  ? ', the ball is under it'
                  : phase === 'found' && slot === ballSlot
                    ? ', the ball was here'
                    : state.ruledOut.includes(slot)
                      ? ', empty'
                      : '';
              return (
                <AnswerButton
                  key={slot}
                  accessibilityLabel={`Cup ${slot + 1}${status}`}
                  size={tile}
                  disabled={phase !== 'choose'}
                  state={state.ruledOut.includes(slot) ? 'spent' : 'idle'}
                  onPress={() => onPick(slot)}
                />
              );
            })}
          </AnswerRow>

          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {ballSeen ? (
              <View
                style={[
                  styles.ball,
                  {
                    left: ballSlot * pitch + tile / 2 - ballR,
                    top: restTop + cupH - ballR * 2,
                    width: ballR * 2,
                    height: ballR * 2,
                    borderRadius: ballR,
                  },
                ]}
              />
            ) : null}

            {places.map((place, cup) => {
              const slot = endSlotOfCup(cup);
              const up =
                (phase === 'show' && lifted) ||
                (phase === 'found' && slot === ballSlot) ||
                ((phase === 'choose' || phase === 'found') && state.ruledOut.includes(slot));
              // Passing cups: one rides over, the other dips a little.
              const pass = place.lift < 0 ? place.lift * tile * 0.5 : place.lift * tile * 0.12;
              return (
                <View
                  key={cup}
                  testID={`cup-${cup}${cup === ballCup(question) ? '-ball' : ''}`}
                  style={{
                    position: 'absolute',
                    left: place.x * pitch + (tile - cupW) / 2,
                    top: restTop + pass - (up ? tile * 0.85 : 0),
                    width: cupW,
                    height: cupH,
                    zIndex: place.lift < 0 ? 2 : 1,
                  }}
                >
                  {/* The border trick: the box is the cup's full width, and
                      its bottom border, cut in at both sides, is the cup. */}
                  <View
                    style={{
                      width: cupW,
                      height: 0,
                      borderBottomWidth: cupH,
                      borderLeftWidth: (cupW - cupTop) / 2,
                      borderRightWidth: (cupW - cupTop) / 2,
                      borderBottomColor: palette.ink,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                    }}
                  />
                  {/* A light band round the cup, as wide as the cup is there. */}
                  <View
                    style={[
                      styles.band,
                      {
                        top: cupH * 0.62,
                        height: cupH * 0.1,
                        left: (cupW - bandW) / 2,
                        width: bandW,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
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
  stage: { flex: 1, justifyContent: 'center' },
  slots: { position: 'absolute', left: 0, bottom: 0, paddingBottom: 0, flexWrap: 'nowrap' },
  ball: { position: 'absolute', backgroundColor: palette.accent },
  band: { position: 'absolute', backgroundColor: palette.bg },
});
