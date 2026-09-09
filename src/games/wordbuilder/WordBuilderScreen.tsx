import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, hitTarget, palette, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, tapTile, WORDS_PER_ROUND, type WordBuilderState } from './logic';

const GAME_ID = 'wordbuilder';

export function WordBuilderScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings, getFreshness, setFreshness } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<WordBuilderState>(() => {
    // Reading this once at mount, not reactively — see MemoryScreen for why.
    const lastShown = getFreshness(GAME_ID);
    return createGame(systemRng, level, typeof lastShown === 'string' ? lastShown : null);
  });
  // Guards against persisting the same completed round twice; reset whenever
  // a new round actually starts. A ref rather than state because it drives
  // no rendering of its own.
  const persistedRef = useRef(false);

  const onTapTile = useCallback(
    (tileIndex: number) => {
      setState((prev) => {
        const tile = prev.tiles[tileIndex];
        const isCorrect = tile && !tile.used && tile.letter === prev.puzzle.word[prev.filled.length];
        if (isCorrect) correct(settings);
        else nudge(settings);
        return tapTile(prev, tileIndex, systemRng, level);
      });
    },
    [level, settings],
  );

  const restart = useCallback((atLevel: number, avoidWord: string | null) => {
    persistedRef.current = false;
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel, avoidWord));
  }, []);

  useEffect(() => {
    if (!state.complete || persistedRef.current) return;
    persistedRef.current = true;
    // Persisted so the very next time this game is opened — even after
    // backing out to Home, even after the app is closed and reopened — the
    // first word still avoids what was just shown.
    setFreshness(GAME_ID, state.puzzle.word);
  }, [state.complete, state.puzzle.word, setFreshness]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.wordIndex / WORDS_PER_ROUND;

  return (
    <GameFrame title="Spell It!" icon="letters" onExit={onExit} progress={progress}>
      <View style={styles.stageOuter}>
        <View style={styles.stageInner}>
          <Text style={styles.emoji} accessibilityLabel={state.puzzle.word}>
            {state.puzzle.emoji}
          </Text>

          <View
            style={styles.blanks}
            accessibilityLabel={`${state.filled.length} of ${state.puzzle.word.length} letters filled in`}
          >
            {state.puzzle.word.split('').map((_, i) => {
              const letter = state.filled[i];
              return (
                <View key={i} style={[styles.blank, letter ? styles.blankFilled : null]}>
                  <Text style={styles.blankText}>{letter ? letter.toUpperCase() : ''}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.tiles}>
        {state.tiles.map((tile, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={tile.letter.toUpperCase()}
            accessibilityState={{ disabled: tile.used }}
            disabled={tile.used}
            onPress={() => onTapTile(index)}
            style={({ pressed }) => [
              styles.tileOuter,
              pressed && !tile.used && styles.pressed,
            ]}
          >
            {tile.used ? (
              <View style={[styles.tileInner, styles.tileUsed]} />
            ) : (
              <View style={[styles.tileInner, { backgroundColor: palette.grape }]}>
                <Text style={styles.tileText}>{tile.letter.toUpperCase()}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart(nextLevel(level, stars), state.puzzle.word);
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
  stageOuter: { flex: 1, marginBottom: space.md },
  stageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    overflow: 'hidden',
    gap: space.lg,
  },
  emoji: { fontSize: 100 },
  blanks: { flexDirection: 'row', gap: space.sm },
  blank: {
    width: 52,
    height: 60,
    borderWidth: 3,
    borderColor: palette.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankFilled: { borderStyle: 'solid', borderColor: palette.grape, backgroundColor: palette.surfaceAlt },
  blankText: { fontFamily: fonts.heavy, fontSize: font.playTitle - 4, color: palette.ink },
  tiles: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingBottom: space.md, flexWrap: 'wrap' },
  tileOuter: { minWidth: hitTarget, minHeight: hitTarget },
  tileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileUsed: { backgroundColor: palette.surfaceAlt },
  tileText: { fontFamily: fonts.heavy, fontSize: font.playTitle, color: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.95 }] },
});
