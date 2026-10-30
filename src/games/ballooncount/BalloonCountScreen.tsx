import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, playPalette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { BUNCHES_PER_ROUND, createGame, nextBunch, nextNumber, pop, type BalloonCountState } from './logic';

/** How long a full string stays on show before the next bunch. */
const DONE_MS = 1000;
/** How long a balloon popped out of turn wobbles. */
const WOBBLE_MS = 450;

/** Balloon colours: decoration only. Every balloon of every colour can be in
 *  the count or not, so colour never says which to pop. */
const COLOURS = [playPalette.berry, playPalette.sky, playPalette.leaf, playPalette.sun, playPalette.grape];

/** Dots for the youngest: one to three, in a row. */
function Dots({ n, size }: { readonly n: number; readonly size: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.ink }} />
      ))}
    </View>
  );
}

function Mark({ value, dots, size }: { readonly value: number; readonly dots: boolean; readonly size: number }) {
  if (dots) return <Dots n={value} size={size * 0.16} />;
  return (
    <Text allowFontScaling={false} style={[styles.numeral, { fontSize: value >= 100 ? size * 0.3 : size * 0.38 }]}>
      {value}
    </Text>
  );
}

/** A balloon: a round body with its number, a knot and a string. */
function Balloon({ value, dots, size, colour }: { readonly value: number; readonly dots: boolean; readonly size: number; readonly colour: string }) {
  const w = size * 0.72;
  const h = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={[styles.balloon, { width: w, height: h, borderRadius: w / 2, backgroundColor: colour }]}>
        <Mark value={value} dots={dots} size={size} />
      </View>
      <View style={{ width: size * 0.08, height: size * 0.06, backgroundColor: colour }} />
      <View style={[styles.string, { height: size * 0.14 }]} />
    </View>
  );
}

export function BalloonCountScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BalloonCountState>(() => createGame(systemRng, level));
  // A clock for the gentle bob; nothing moves while motion is reduced.
  const [now, setNow] = useState(0);
  const wobble = useRef<{ index: number; at: number } | null>(null);

  useEffect(() => {
    if (settings.reduceMotion) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 60);
    return () => clearInterval(timer);
  }, [settings.reduceMotion]);

  useEffect(() => {
    if (!state.done) return undefined;
    const on = setTimeout(() => setState((prev) => nextBunch(prev, systemRng, level)), DONE_MS);
    return () => clearTimeout(on);
  }, [state.done, level]);

  const onPop = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.done || prev.complete || prev.popped.includes(index)) return prev;
        if (prev.bunch.balloons[index].value === nextNumber(prev)) correct(settings);
        else {
          if (!prev.missed.includes(index)) nudge(settings);
          wobble.current = { index, at: Date.now() };
        }
        return pop(prev, index);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { bunch } = state;
  const across = Dimensions.get('window').width - gutter * 2;
  const n = bunch.balloons.length;
  const columns = n <= 4 ? n : 3;
  const tile = useMemo(
    () => Math.max(hitTarget, Math.min(108, Math.floor((across - (columns - 1) * rule.hair) / columns))),
    [across, columns],
  );
  const slot = Math.min(44, Math.floor((across - (bunch.count.length - 1) * rule.hair) / bunch.count.length));
  // Colours are dealt per bunch, so they don't shuffle about mid-count.
  const colours = useMemo(
    () => bunch.balloons.map((_, i) => COLOURS[(i * 3 + bunch.count[0]) % COLOURS.length]),
    [bunch],
  );

  const onString = [...bunch.count.slice(0, bunch.prefilled), ...state.popped.map((i) => bunch.balloons[i].value)];
  const stars = starsForMistakes(state.mistakes);
  const progress = (state.bunchIndex + (onString.length - bunch.prefilled) / (bunch.count.length - bunch.prefilled)) / BUNCHES_PER_ROUND;

  return (
    <GameFrame title="Balloon Count" icon="balloons" onExit={onExit} progress={progress}>
      <StageLabel>POP THEM IN ORDER</StageLabel>

      <GameStage>
        <View
          accessible
          accessibilityLabel={`On the string: ${onString.join(', ') || 'nothing yet'}. ${bunch.count.length - onString.length} more to go.`}
          style={styles.stringRow}
        >
          {bunch.count.map((_, i) => {
            const value = onString[i];
            return (
              <View
                key={i}
                style={[styles.slot, value === undefined && styles.slotOpen, { width: slot, height: slot }]}
              >
                {value !== undefined ? <Mark value={value} dots={bunch.dots} size={slot * 1.3} /> : null}
              </View>
            );
          })}
        </View>
      </GameStage>

      <AnswerRow style={{ maxWidth: columns * tile + (columns - 1) * rule.hair, alignSelf: 'center' }}>
        {bunch.balloons.map((balloon, i) => {
          const popped = state.popped.includes(i);
          const bob = settings.reduceMotion ? 0 : Math.sin(now / 500 + i * 1.7) * 3;
          const w = wobble.current;
          const wobbling = w !== null && w.index === i && now - w.at < WOBBLE_MS && !settings.reduceMotion;
          const tilt = wobbling ? Math.sin((now - (w?.at ?? 0)) / 40) * 10 : 0;
          const name = bunch.dots ? `Balloon with ${balloon.value} ${balloon.value === 1 ? 'dot' : 'dots'}` : `Balloon ${balloon.value}`;
          return (
            <AnswerButton
              key={`${state.bunchIndex}:${i}`}
              accessibilityLabel={`${name}${popped ? ', popped' : ''}`}
              size={tile}
              state={popped ? 'spent' : 'idle'}
              disabled={state.done}
              onPress={() => onPop(i)}
            >
              {popped ? null : (
                <View style={{ transform: [{ translateY: bob }, { rotate: `${tilt}deg` }] }}>
                  <Balloon value={balloon.value} dots={bunch.dots} size={tile - space.sm * 2 - rule.hair * 2} colour={colours[i]} />
                </View>
              )}
            </AnswerButton>
          );
        })}
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
  stringRow: {
    flexDirection: 'row',
    gap: rule.hair,
    paddingBottom: rule.major * 2,
    borderBottomWidth: rule.major,
    borderColor: palette.ink,
  },
  slot: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  slotOpen: { backgroundColor: 'transparent', borderWidth: rule.hair, borderColor: palette.border, borderStyle: 'dashed' },
  balloon: { alignItems: 'center', justifyContent: 'center' },
  string: { width: rule.hair, backgroundColor: palette.ink },
  numeral: { fontFamily: fonts.heavy, color: palette.ink, includeFontPadding: false },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
});
