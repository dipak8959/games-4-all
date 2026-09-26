import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { PlayersPicker, TurnBanner } from '../../components/Players';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, playPalette, rule, space } from '../../theme/tokens';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { ECHOES_PER_ROUND, copier, createGame, shown, tapDrum, type EchoBeatState } from './logic';

/**
 * react-native-web's own name for "report a press the instant it starts".
 * A beat is all timing; the web build otherwise waits 50ms.
 */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** A beat in the playback: how long the drum stays lit. */
const FLASH = 170;
/** A breath before the playback starts, and after it ends. */
const LEAD_IN = 700;
const RUN_OUT = 450;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function EchoBeatScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the playback stops, and starts again after.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [players, setPlayers] = useState(0);
  const [state, setState] = useState<EchoBeatState | null>(null);
  const [lit, setLit] = useState(false);

  const start = useCallback((count: number, atLevel: number) => {
    setPlayers(count);
    setState(createGame(atLevel, count));
  }, []);

  // The drum plays the beat back as light, beat by beat.
  const phase = state?.phase;
  const pattern = state?.pattern;
  const tries = state?.tries;
  useEffect(() => {
    if (phase !== 'show' || !pattern || paused) return undefined;
    let frame = 0;
    let t0: number | null = null;
    const end = pattern[pattern.length - 1] + RUN_OUT;
    const loop = (at: number) => {
      if (t0 == null) t0 = at;
      const t = at - t0 - LEAD_IN;
      setLit(pattern.some((p) => t >= p && t < p + FLASH));
      if (t > end) {
        setLit(false);
        setState((prev) => (prev ? shown(prev) : prev));
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      setLit(false);
    };
  }, [phase, pattern, tries, paused]);

  const onDrum = useCallback(() => {
    if (paused) return;
    const at = now();
    setState((prev) => {
      if (!prev) return prev;
      const next = tapDrum(prev, at);
      if (next === prev) return prev;
      if (next.last !== prev.last || next.echoes !== prev.echoes || next.tries !== prev.tries) {
        if (next.last === 'match') correct(settings);
        else if (next.last === 'miss' || next.last === 'moved-on') nudge(settings);
        else tap(settings);
      } else tap(settings);
      return next;
    });
  }, [paused, settings]);

  if (!state) {
    return (
      <GameFrame title="Echo Beat" icon="echo" onExit={onExit} progress={0}>
        <PlayersPicker onPick={(n) => start(n, level)} />
      </GameFrame>
    );
  }

  const stars = starsForMistakes(state.mistakes);
  const player = state.phase === 'make' ? state.maker : copier(state);
  const doing =
    state.phase === 'make'
      ? `Tap a beat on the drum: ${state.beats} taps`
      : state.phase === 'show'
        ? 'Watch the drum'
        : 'Now you: copy the beat';
  const said =
    state.last === 'match'
      ? 'A PERFECT ECHO!'
      : state.last === 'miss'
        ? 'NEARLY — WATCH AGAIN'
        : state.last === 'moved-on'
          ? 'ON TO THE NEXT BEAT'
          : 'ECHO THE BEAT, ROUND THE GROUP';
  const showMarks = state.marks && state.phase !== 'make' && state.pattern.length > 1;
  const span = state.pattern[state.pattern.length - 1] || 1;

  return (
    <GameFrame title="Echo Beat" icon="echo" onExit={onExit} progress={state.echoes / ECHOES_PER_ROUND}>
      <TurnBanner player={player} doing={doing} />
      <StageLabel live>{said}</StageLabel>

      {/* The beat's shape, at the gentlest levels: a mark for every beat,
          spaced as the beat is. */}
      <View style={styles.marksRow} accessible={showMarks} accessibilityLabel={showMarks ? `The beat: ${state.pattern.length} beats` : undefined}>
        {showMarks ? (
          <>
            <View style={styles.marksLine} />
            {state.pattern.map((p, i) => (
              <View key={i} style={[styles.mark, { left: `${(p / span) * 92 + 4}%` }]} />
            ))}
          </>
        ) : null}
      </View>

      <View style={styles.stage}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.phase === 'show' ? 'The drum, playing the beat' : 'The drum: tap it'}
          accessibilityState={{ disabled: state.phase === 'show' }}
          {...PRESS_AT_ONCE}
          onPressIn={onDrum}
          disabled={state.phase === 'show' || state.complete}
          testID={`drum:${state.phase}`}
          style={({ pressed }) => [styles.drum, lit || (pressed && state.phase !== 'show') ? styles.drumLit : null]}
        >
          <View style={styles.skin} />
        </Pressable>

        {/* Taps so far this go: a square for each beat, filled as it's tapped. */}
        <View style={styles.taps}>
          {Array.from({ length: state.beats }, (_, i) => (
            <View key={i} style={[styles.tapBox, i < state.taps.length ? styles.tapFilled : null]} />
          ))}
        </View>
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            const atLevel = nextLevel(level, stars);
            setLevel(atLevel);
            start(players, atLevel);
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

const DRUM = 220;

const styles = StyleSheet.create({
  marksRow: { height: 28, marginBottom: space.sm },
  marksLine: { position: 'absolute', left: '4%', right: '4%', top: 13, height: rule.hair, backgroundColor: palette.inkSoft },
  mark: { position: 'absolute', top: 4, width: 6, height: 20, marginLeft: -3, backgroundColor: palette.ink },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  drum: {
    width: DRUM,
    height: DRUM,
    borderRadius: DRUM / 2,
    backgroundColor: palette.surface,
    borderWidth: rule.major * 3,
    borderColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumLit: { backgroundColor: playPalette.sun },
  skin: { width: DRUM * 0.5, height: DRUM * 0.5, borderRadius: DRUM * 0.25, borderWidth: rule.major, borderColor: palette.ink },
  taps: { flexDirection: 'row', gap: space.sm },
  tapBox: { width: 22, height: 22, borderWidth: rule.major, borderColor: palette.ink },
  tapFilled: { backgroundColor: palette.ink },
});
