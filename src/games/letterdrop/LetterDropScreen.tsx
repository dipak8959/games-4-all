import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  TILE,
  TOP,
  WORDS,
  createGame,
  laneX,
  progressOf,
  step,
  tapLetter,
  wordNow,
  type LetterDropState,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
const BOX = 46;
const BOX_GAP = 8;
const PICTURE = 64;
/** The box to fill next is underlined this much heavier. */
const NEXT_LINE = 4;

export function LetterDropScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the letters hang where they are.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<LetterDropState>(() => createGame(systemRng, level));
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

  // A word spelled is a cheer; a wrong letter, the gentle nudge.
  const heard = useRef({ words: 0, mistakes: 0 });
  useEffect(() => {
    const words = state.index + (state.said === 'word' || state.complete ? 1 : 0);
    if (words > heard.current.words) correct(settings);
    if (state.mistakes > heard.current.mistakes) nudge(settings);
    heard.current = { words, mistakes: state.mistakes };
  }, [state.index, state.said, state.complete, state.mistakes, settings]);

  const onTap = useCallback(
    (id: number) => {
      tap(settings);
      setState((prev) => tapLetter(prev, id));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { words: 0, mistakes: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const word = wordNow(state);
  const puzzle = state.words[Math.min(state.index, state.words.length - 1)];
  const label = state.complete
    ? 'EVERY WORD SPELLED!'
    : state.said === 'word'
      ? `${word.toUpperCase()}!`
      : state.said === 'not'
        ? 'NOT THAT ONE — WHICH COMES NEXT?'
        : 'TAP THE LETTERS IN ORDER';
  const stars = starsForMistakes(state.mistakes);
  const tile = Math.max(hitTarget, TILE * k);
  const boxesWidth = word.length * BOX + (word.length - 1) * BOX_GAP;

  return (
    <GameFrame title="Letter Drop" icon="letters" onExit={onExit} progress={progressOf(state)}>
      <StageLabel live>{label}</StageLabel>

      <View style={styles.stage} onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {k > 0 ? (
          <View testID="field" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.letters.map((l) => (
              <Pressable
                key={l.id}
                {...PRESS_AT_ONCE}
                accessibilityRole="button"
                accessibilityLabel={`${l.char.toUpperCase()}${l.tried ? ', tried' : ''}`}
                testID={`letter:${l.id}:${l.char}:${l.tried ? 1 : 0}`}
                onPressIn={() => onTap(l.id)}
                style={[
                  l.tried ? styles.tileTried : styles.tile,
                  { left: laneX(state, l.lane) * k - tile / 2, top: l.y * k - tile / 2, width: tile, height: tile },
                ]}
              >
                <Text allowFontScaling={false} style={[styles.letter, { fontSize: tile * 0.62 }, l.tried && styles.letterTried]}>
                  {l.char.toUpperCase()}
                </Text>
              </Pressable>
            ))}

            {/* The picture and its boxes, over everything, at the top. */}
            <View style={[styles.banner, { height: TOP * k }]}>
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Spell: ${word}. ${state.filled} of ${word.length} letters in.`}
                testID={`picture:${word}:${state.filled}`}
                style={{ height: (PICTURE + 8) * k, justifyContent: 'center' }}
              >
                <Text allowFontScaling={false} style={{ fontSize: PICTURE * k, lineHeight: (PICTURE + 8) * k }}>
                  {puzzle.emoji}
                </Text>
              </View>
              <View style={[styles.boxes, { width: boxesWidth * k, gap: BOX_GAP * k }]}>
                {word.split('').map((c, i) => {
                  const inBox = i < state.filled;
                  const next = i === state.filled && !state.complete && state.said !== 'word';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.box,
                        { width: BOX * k, height: BOX * k },
                        next && [styles.boxNext, { borderBottomWidth: NEXT_LINE * k }],
                      ]}
                    >
                      <Text allowFontScaling={false} style={[styles.boxLetter, { fontSize: BOX * 0.62 * k }, !inBox && styles.ghost]}>
                        {inBox || state.showWord ? c.toUpperCase() : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
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
      {/* Five words a round. */}
      <View accessible accessibilityLabel={`Word ${Math.min(WORDS, state.index + 1)} of ${WORDS}.`} />
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
  tile: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  tileTried: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.inkSoft,
    borderStyle: 'dashed',
  },
  letter: { fontFamily: fonts.heavy, color: palette.ink },
  letterTried: { color: palette.inkSoft },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderBottomWidth: rule.major,
    borderBottomColor: palette.ink,
  },
  boxes: { flexDirection: 'row' },
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: rule.major, borderColor: palette.ink },
  boxNext: { borderBottomColor: palette.accent },
  boxLetter: { fontFamily: fonts.heavy, color: palette.ink },
  ghost: { color: palette.inkSoft },
});
