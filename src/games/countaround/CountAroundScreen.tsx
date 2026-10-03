import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { PlayersPicker, TurnBanner } from '../../components/Players';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette, rule, space } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, key, say, type CountAroundState, type Say } from './logic';

const ACTIONS: readonly { say: Exclude<Say, number>; label: string }[] = [
  { say: 'clap', label: 'CLAP' },
  { say: 'stomp', label: 'STOMP' },
  { say: 'both', label: 'BOTH' },
];

function ActionMark({ what, size }: { readonly what: Exclude<Say, number>; readonly size: number }) {
  if (what === 'both') {
    return (
      <View style={styles.both}>
        <Icon name="clap" size={size * 0.7} color={palette.ink} />
        <Icon name="stomp" size={size * 0.7} color={palette.ink} />
      </View>
    );
  }
  return <Icon name={what} size={size} color={palette.ink} />;
}

export function CountAroundScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [players, setPlayers] = useState(0);
  const [state, setState] = useState<CountAroundState | null>(null);

  const start = useCallback((count: number, atLevel: number) => {
    setPlayers(count);
    setState(createGame(systemRng, atLevel, count));
  }, []);

  const onSay = useCallback(
    (what: Say) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = say(prev, what, systemRng);
        if (next.mistakes > prev.mistakes) nudge(settings);
        else if (next !== prev) correct(settings);
        return next;
      });
    },
    [settings],
  );

  if (!state) {
    return (
      <GameFrame title="Count Around" icon="countaround" onExit={onExit} progress={0}>
        <PlayersPicker onPick={(n) => start(n, level)} />
      </GameFrame>
    );
  }

  const stars = starsForMistakes(state.mistakes);
  const actions = ACTIONS.slice(0, state.rules.length === 0 ? 0 : state.rules.length === 1 ? 1 : 3);

  return (
    <GameFrame title="Count Around" icon="countaround" onExit={onExit} progress={(state.n - 1) / state.to}>
      <TurnBanner player={state.turn} doing="What comes next?" />
      <StageLabel live>{`COUNT TO ${state.to} TOGETHER`}</StageLabel>

      {/* The rules, if there are any: which numbers get a clap or a stomp. */}
      {state.rules.length ? (
        <View style={styles.rules} accessible accessibilityLabel={state.rules.map((r, i) => `On every ${r}, ${i === 0 ? 'clap' : 'stomp'}`).join('. ')}>
          {state.rules.map((r, i) => (
            <View key={r} style={styles.rule}>
              <Text style={type.mono}>{`EVERY ${r}`}</Text>
              <ActionMark what={i === 0 ? 'clap' : 'stomp'} size={28} />
            </View>
          ))}
        </View>
      ) : null}

      <GameStage>
        <View accessible accessibilityLabel={state.n === 1 ? 'Start the count' : `The last one was ${state.n - 1}`} testID={`count:${state.n}`}>
          <Text allowFontScaling={false} style={styles.said}>
            {state.n === 1 ? 'GO!' : `${state.n - 1} …`}
          </Text>
        </View>
      </GameStage>

      <AnswerRow>
        {state.numbers.map((n) => (
          <AnswerButton
            key={`${state.n}:${n}`}
            label={`${n}`}
            state={state.ruledOut.includes(key(n)) ? 'spent' : 'idle'}
            onPress={() => onSay(n)}
          />
        ))}
      </AnswerRow>
      {actions.length ? (
        <AnswerRow style={styles.actions}>
          {actions.map((a) => (
            <AnswerButton
              key={`${state.n}:${a.say}`}
              accessibilityLabel={a.label.toLowerCase()}
              state={state.ruledOut.includes(a.say) ? 'spent' : 'idle'}
              onPress={() => onSay(a.say)}
            >
              <ActionMark what={a.say} size={32} />
              <Text style={styles.actionText}>{a.label}</Text>
            </AnswerButton>
          ))}
        </AnswerRow>
      ) : null}

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

const styles = StyleSheet.create({
  rules: { flexDirection: 'row', gap: space.lg, paddingBottom: space.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: rule.hair, borderColor: palette.border, paddingHorizontal: space.sm, paddingVertical: space.xs },
  said: { fontFamily: fonts.heavy, fontSize: 72, lineHeight: 80, color: palette.ink },
  actions: { paddingBottom: space.lg },
  actionText: { fontFamily: fonts.heavy, fontSize: font.meta, color: palette.ink, marginTop: space.xs },
  both: { flexDirection: 'row' },
});
