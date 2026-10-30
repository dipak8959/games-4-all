import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel, StageScroll } from '../../components/GameStage';
import { BigButton } from '../../components/BigButton';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { MESSAGES_PER_ROUND, claim, coded, createGame, nextMessage, preview, shift, specForLevel, turnWheel, type SecretCodesState } from './logic';

/** How long a read message shows before the next. */
const SHOW_MS = 1400;

export function SecretCodesScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<SecretCodesState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.read || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => setState((prev) => nextMessage(prev)), SHOW_MS);
    return () => clearTimeout(t);
  }, [state.read, state.complete, settings, paused]);

  useEffect(() => {
    if (state.mistakes) nudge(settings);
  }, [state.mistakes, settings]);

  const onTurn = useCallback(
    (by: 1 | -1) => {
      tap(settings);
      setState((prev) => turnWheel(prev, by));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const spec = specForLevel(level);
  const reads = state.read ? state.messages[state.index] : preview(state);
  const label = state.read
    ? 'CRACKED IT!'
    : state.firstWordOnly
      ? 'TURN THE WHEEL TILL THE FIRST WORD READS RIGHT'
      : 'TURN THE WHEEL TILL IT READS RIGHT';
  const stars = starsForMistakes(state.mistakes);

  return (
    <GameFrame title="Secret Codes" icon="cipher" onExit={onExit} progress={(state.index + (state.read ? 1 : 0)) / MESSAGES_PER_ROUND}>
      <StageLabel live>{label}</StageLabel>
      <StageScroll>
        <Text style={type.mono}>IN CODE</Text>
        <Text style={styles.code} testID="coded">
          {coded(state)}
        </Text>
        <View style={styles.rule} />
        <Text style={type.mono}>{`IT READS  ·  EVERY LETTER BACK ${state.turn}`}</Text>
        <Text style={[styles.reads, state.read && styles.readsDone]} testID={`preview:${reads}`} accessibilityLiveRegion="polite">
          {reads}
        </Text>
        <Text style={[type.meta, styles.hint]}>{`A becomes ${shift('A', -state.turn)} · letters were moved up to ${spec.most} places`}</Text>

        <AnswerRow style={styles.wheel}>
          <AnswerButton size={120} accessibilityLabel="Turn the wheel back one" onPress={() => onTurn(-1)}>
            <Text style={type.h3}>BACK ONE</Text>
          </AnswerButton>
          <AnswerButton size={120} accessibilityLabel="Turn the wheel on one" onPress={() => onTurn(1)}>
            <Text style={type.h3}>ON ONE</Text>
          </AnswerButton>
        </AnswerRow>
        <BigButton label="IT SAYS THIS" icon="letters" onPress={() => setState((prev) => claim(prev))} disabled={state.read} style={styles.claim} />
      </StageScroll>

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
  code: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 30, letterSpacing: 2, color: palette.inkSoft, marginTop: space.xs },
  rule: { height: rule.major, backgroundColor: palette.ink, marginVertical: space.md },
  reads: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 34, letterSpacing: 2, color: palette.ink, marginTop: space.xs },
  readsDone: { color: palette.accent },
  hint: { marginTop: space.sm },
  wheel: { marginTop: space.lg, justifyContent: 'center' },
  claim: { marginTop: space.md },
});
