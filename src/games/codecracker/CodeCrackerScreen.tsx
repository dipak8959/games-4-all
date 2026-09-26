import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { Shape, describe } from '../shapes/Shape';
import type { ColorKind, ShapeKind } from '../shapes/logic';
import { nextLevel, type GameScreenProps } from '../types';
import { MAX_GUESSES, add, check, createGame, starsForCode, undo, type CodeCrackerState, type Guess } from './logic';

/** Each symbol is its own shape — and its own colour, as a second signal. */
const SYMBOLS: readonly { shape: ShapeKind; color: ColorKind }[] = [
  { shape: 'circle', color: 'berry' },
  { shape: 'square', color: 'sky' },
  { shape: 'triangle', color: 'leaf' },
  { shape: 'star', color: 'sun' },
  { shape: 'diamond', color: 'grape' },
  { shape: 'heart', color: 'berry' },
];

const name = (i: number) => describe(SYMBOLS[i].shape, SYMBOLS[i].color);

/** How long the answer stays on show before the stars come up. */
const LINGER_MS = 1600;

function CodeSymbol({ index, size }: { readonly index: number; readonly size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Shape shape={SYMBOLS[index].shape} color={SYMBOLS[index].color} size={size * 0.8} />
    </View>
  );
}

/** A peg: filled for right-and-here, hollow for right-but-elsewhere. Told
 *  apart by fill, never by colour. */
function Peg({ filled, size }: { readonly filled: boolean; readonly size: number }) {
  return <View style={[styles.peg, { width: size, height: size }, filled ? styles.pegFilled : null]} />;
}

function GuessRow({ guess, perSlot, cell }: { readonly guess: Guess; readonly perSlot: boolean; readonly cell: number }) {
  const words = perSlot
    ? guess.symbols
        .map((s, i) => `${name(s)} ${guess.marks[i] === 'here' ? 'right here' : guess.marks[i] === 'elsewhere' ? 'somewhere else' : 'not in the code'}`)
        .join(', ')
    : `${guess.symbols.map(name).join(', ')}: ${guess.exact} right place, ${guess.near} wrong place`;
  return (
    <View accessible accessibilityLabel={words} style={styles.guessRow}>
      <View style={styles.guessShapes}>
        {guess.symbols.map((s, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <CodeSymbol index={s} size={cell} />
            {perSlot ? (
              guess.marks[i] === 'none' ? (
                <View style={{ width: cell * 0.36, height: cell * 0.36 }} />
              ) : (
                <Peg filled={guess.marks[i] === 'here'} size={cell * 0.36} />
              )
            ) : null}
          </View>
        ))}
      </View>
      {!perSlot ? (
        <View style={styles.pegs}>
          {Array.from({ length: guess.exact }, (_, i) => (
            <Peg key={`e${i}`} filled size={cell * 0.34} />
          ))}
          {Array.from({ length: guess.near }, (_, i) => (
            <Peg key={`n${i}`} filled={false} size={cell * 0.34} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CodeCrackerScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<CodeCrackerState>(() => createGame(systemRng, level));
  const [showStars, setShowStars] = useState(false);
  const history = useRef<ScrollView>(null);

  // Once it's over, the answer stays on show a moment before the stars.
  useEffect(() => {
    if (!state.complete) return undefined;
    const timer = setTimeout(() => setShowStars(true), LINGER_MS);
    return () => clearTimeout(timer);
  }, [state.complete]);

  const onSymbol = useCallback(
    (i: number) => {
      tap(settings);
      setState((prev) => add(prev, i));
    },
    [settings],
  );

  const onCheck = useCallback(() => {
    setState((prev) => {
      const next = check(prev);
      if (next !== prev) {
        const last = next.guesses[next.guesses.length - 1];
        if (next.cracked || last.exact + last.near > 0) correct(settings);
        else nudge(settings);
      }
      return next;
    });
    setTimeout(() => history.current?.scrollToEnd({ animated: !settings.reduceMotion }), 50);
  }, [settings]);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setShowStars(false);
    setState(createGame(systemRng, atLevel));
  }, []);

  const cell = state.length > 4 ? 30 : 36;
  const slot = state.length > 4 ? 52 : 60;
  const label = state.cracked
    ? `CRACKED IN ${state.guesses.length}!`
    : state.complete
      ? 'HERE IS THE CODE'
      : state.current.length === state.length
        ? 'CHECK YOUR GUESS'
        : state.guesses.length === 0
          ? 'GUESS THE HIDDEN SHAPES'
          : `GUESS ${state.guesses.length + 1} OF ${MAX_GUESSES}`;
  const stars = starsForCode(state);

  return (
    <GameFrame title="Code Cracker" icon="code" onExit={onExit} progress={state.guesses.length / MAX_GUESSES}>
      <StageLabel live>{label}</StageLabel>

      <ScrollView ref={history} style={styles.history} contentContainerStyle={styles.historyInner}>
        {state.guesses.length === 0 ? (
          <Text style={styles.hint}>
            {state.perSlot
              ? 'UNDER EACH SHAPE: ■ RIGHT HERE   □ SOMEWHERE ELSE'
              : 'PEGS: ■ RIGHT SHAPE, RIGHT PLACE   □ RIGHT SHAPE, WRONG PLACE'}
          </Text>
        ) : null}
        {state.guesses.map((g, i) => (
          <GuessRow key={i} guess={g} perSlot={state.perSlot} cell={cell} />
        ))}
      </ScrollView>

      {/* The guess being built — or, once it's over, the code itself. */}
      <View
        style={styles.current}
        accessible
        accessibilityLabel={
          state.complete
            ? `The code: ${state.code.map(name).join(', ')}`
            : `Your guess so far: ${state.current.length ? state.current.map(name).join(', ') : 'empty'}`
        }
        testID={state.complete ? `code:${state.code.join('')}` : `guess:${state.current.join('')}`}
      >
        {Array.from({ length: state.length }, (_, i) => {
          const shown = state.complete ? state.code[i] : state.current[i];
          return (
            <View key={i} style={[styles.slot, { width: slot, height: slot }, state.complete ? styles.slotRevealed : null]}>
              {shown != null ? <CodeSymbol index={shown} size={slot - 8} /> : null}
            </View>
          );
        })}
      </View>

      {!state.complete ? (
        <>
          <AnswerRow>
            {Array.from({ length: state.symbols }, (_, i) => (
              <AnswerButton
                key={i}
                accessibilityLabel={name(i)}
                size={hitTarget}
                disabled={state.current.length >= state.length}
                onPress={() => onSymbol(i)}
              >
                <CodeSymbol index={i} size={44} />
              </AnswerButton>
            ))}
          </AnswerRow>
          <AnswerRow style={styles.actions}>
            <AnswerButton accessibilityLabel="Take the last shape back" size={hitTarget} disabled={state.current.length === 0} onPress={() => setState(undo)}>
              <Icon name="back" size={30} color={palette.ink} />
            </AnswerButton>
            <AnswerButton
              label="CHECK"
              accessibilityLabel="Check this guess"
              size={hitTarget}
              state={state.current.length === state.length ? 'active' : 'idle'}
              disabled={state.current.length !== state.length}
              onPress={onCheck}
            />
          </AnswerRow>
        </>
      ) : null}

      {state.complete && showStars ? (
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
  history: { flex: 1 },
  historyInner: { paddingVertical: space.sm, gap: rule.hair },
  hint: { fontFamily: fonts.mono, fontSize: 12, color: palette.inkSoft, letterSpacing: 1, paddingVertical: space.md },
  guessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    borderBottomWidth: rule.hair,
    borderColor: palette.border,
  },
  guessShapes: { flexDirection: 'row', gap: space.xs },
  pegs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, maxWidth: 110, justifyContent: 'flex-end' },
  peg: { borderWidth: rule.major, borderColor: palette.ink },
  pegFilled: { backgroundColor: palette.ink },
  current: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.md },
  slot: { borderWidth: rule.major, borderColor: palette.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  slotRevealed: { borderColor: palette.accent },
  actions: { paddingBottom: space.lg },
});
