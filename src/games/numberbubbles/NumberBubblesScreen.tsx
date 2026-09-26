import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BUBBLE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  TARGETS,
  bubbleAt,
  createGame,
  needs,
  starsForSlips,
  step,
  tapBubble,
  type Kind,
  type NumberBubblesState,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
const BANNER = 66;

const ASK: Record<Kind, string> = {
  add: 'ADD TWO TO MAKE',
  add3: 'ADD THREE TO MAKE',
  take: 'TAKE ONE FROM ANOTHER TO MAKE',
  times: 'TIMES TWO TO MAKE',
};
const SIGN: Record<Kind, string> = { add: '+', add3: '+', take: '−', times: '×' };

export function NumberBubblesScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the bubbles hang where they are.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<NumberBubblesState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (state.complete || paused) return undefined;
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
  }, [state.complete, paused]);

  // Made it is a cheer; a slip, the gentle nudge.
  const heard = useRef({ made: 0, slips: 0 });
  useEffect(() => {
    if (state.made > heard.current.made) correct(settings);
    if (state.slips > heard.current.slips) nudge(settings);
    heard.current = { made: state.made, slips: state.slips };
  }, [state.made, state.slips, settings]);

  const onTap = useCallback(
    (id: number) => {
      tap(settings);
      setState((prev) => tapBubble(prev, id, systemRng));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { made: 0, slips: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const picked = state.picked.map((id) => state.bubbles.find((b) => b.id === id)?.value ?? 0);
  const sofar = picked.length
    ? `${picked.join(` ${SIGN[state.kind]} `)} ${SIGN[state.kind]} ?`
    : Array.from({ length: needs(state.kind) }, () => '?').join(` ${SIGN[state.kind]} `);
  const label = state.complete
    ? 'EVERY BUBBLE POPPED!'
    : state.said === 'made'
      ? 'POP! YOU MADE IT'
      : state.said === 'over'
        ? state.kind === 'add' || state.kind === 'add3'
          ? 'TOO MUCH — THEY FLOAT FREE'
          : 'NOT THAT PAIR — TRY AGAIN'
        : 'TAP THE BUBBLES THAT MAKE IT';
  const stars = starsForSlips(state.slips);

  return (
    <GameFrame title="Number Bubbles" icon="bubbles" onExit={onExit} progress={state.made / TARGETS}>
      <StageLabel live>{label}</StageLabel>

      <View style={styles.stage} onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {k > 0 ? (
          <View testID="field" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.bubbles.map((b) => {
              const at = bubbleAt(state, b);
              const on = state.picked.includes(b.id);
              if (b.hidden || at.y < -BUBBLE || at.y > FIELD_HEIGHT + BUBBLE) return null;
              return (
                <Pressable
                  key={b.id}
                  {...PRESS_AT_ONCE}
                  accessibilityRole="button"
                  accessibilityLabel={`${b.value}${on ? ', picked' : ''}`}
                  aria-pressed={on}
                  testID={`bubble:${b.id}:${b.value}:${on ? 1 : 0}`}
                  onPressIn={() => onTap(b.id)}
                  style={[
                    on ? styles.bubblePicked : styles.bubble,
                    { left: (at.x - BUBBLE) * k, top: (at.y - BUBBLE) * k, width: BUBBLE * 2 * k, height: BUBBLE * 2 * k, borderRadius: BUBBLE * k },
                  ]}
                >
                  <Text allowFontScaling={false} style={[styles.number, { fontSize: BUBBLE * 0.8 * k }, on && styles.numberPicked]}>
                    {b.value}
                  </Text>
                </Pressable>
              );
            })}
            {/* The target, over everything, at the top. */}
            <View pointerEvents="none" style={[styles.banner, { height: BANNER * k }]} accessible accessibilityLabel={`${ASK[state.kind].toLowerCase()} ${state.target}. So far: ${sofar}.`}>
              <View style={styles.bannerLeft}>
                <Text allowFontScaling={false} style={[styles.ask, { fontSize: 10 * k }]}>
                  {ASK[state.kind]}
                </Text>
                <Text allowFontScaling={false} style={[styles.sofar, { fontSize: 16 * k }]}>
                  {sofar}
                </Text>
              </View>
              <Text testID={`target:${state.target}`} allowFontScaling={false} style={[styles.target, { fontSize: 40 * k }]}>
                {state.target}
              </Text>
            </View>
          </View>
        ) : null}
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
  stage: { flex: 1, marginBottom: rule.major * 4 },
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  bubblePicked: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.accent },
  number: { fontFamily: fonts.heavy, color: palette.ink },
  numberPicked: { color: palette.bg },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: palette.bg,
    borderBottomWidth: rule.major,
    borderBottomColor: palette.ink,
  },
  bannerLeft: { flex: 1, gap: 2 },
  ask: { fontFamily: fonts.heavy, color: palette.inkSoft, letterSpacing: 1 },
  sofar: { fontFamily: fonts.heavy, color: palette.ink },
  target: { fontFamily: fonts.heavy, color: palette.ink },
});
