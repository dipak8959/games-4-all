import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { PlayerMark, PlayersPicker, TurnBanner } from '../../components/Players';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette, playPalette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { answer, createGame, totalQuestions, type Kind, type Question, type StarJarState } from './logic';

/** The three kinds of question, each shown by an example of itself. */
const KINDS: readonly { kind: Kind; example: string; words: string }[] = [
  { kind: 'count', example: '● ● ●', words: 'counting' },
  { kind: 'add', example: '2 + 3', words: 'adding and taking away' },
  { kind: 'times', example: '3 × 4', words: 'times tables' },
];

/** Dots to count, in rows of five so they can be counted in fives too. */
function Dots({ n }: { readonly n: number }) {
  const rows = Math.ceil(n / 5);
  return (
    <View style={{ gap: space.sm }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: space.sm }}>
          {Array.from({ length: Math.min(5, n - r * 5) }, (_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Ask({ q }: { readonly q: Question }) {
  if (q.kind === 'count') return <Dots n={q.a} />;
  return (
    <Text allowFontScaling={false} style={styles.sum}>
      {`${q.a} ${q.op} ${q.b}`}
    </Text>
  );
}

export function StarJarScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [players, setPlayers] = useState(0);
  // What each player has chosen so far, while choosing.
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [state, setState] = useState<StarJarState | null>(null);

  const onAnswer = useCallback(
    (choice: number) => {
      setState((prev) => {
        if (!prev || prev.complete || prev.ruledOut.includes(choice)) return prev;
        if (choice === prev.question.answer) correct(settings);
        else nudge(settings);
        return answer(prev, choice, systemRng, level);
      });
    },
    [level, settings],
  );

  const choose = (kind: Kind) => {
    const next = [...kinds, kind];
    if (next.length >= players) {
      setKinds(next);
      setState(createGame(systemRng, level, next));
    } else setKinds(next);
  };

  if (!players) {
    return (
      <GameFrame title="Star Jar" icon="starjar" onExit={onExit} progress={0}>
        <PlayersPicker onPick={setPlayers} />
      </GameFrame>
    );
  }

  if (!state) {
    const who = kinds.length;
    return (
      <GameFrame title="Star Jar" icon="starjar" onExit={onExit} progress={0}>
        <TurnBanner player={who} doing="Which questions for you?" />
        <View style={styles.choose}>
          <PlayerMark player={who} size={72} />
          <AnswerRow>
            {KINDS.map((k) => (
              <AnswerButton key={k.kind} accessibilityLabel={`Player ${who + 1}: ${k.words}`} size={104} onPress={() => choose(k.kind)}>
                <Text allowFontScaling={false} style={styles.example}>
                  {k.example}
                </Text>
              </AnswerButton>
            ))}
          </AnswerRow>
        </View>
      </GameFrame>
    );
  }

  const q = state.question;
  const stars = starsForMistakes(state.mistakes);
  const total = totalQuestions(state);

  return (
    <GameFrame title="Star Jar" icon="starjar" onExit={onExit} progress={state.asked / total}>
      <TurnBanner player={state.turn} doing={q.kind === 'count' ? 'How many dots?' : 'What is the answer?'} />

      {/* The jar: one star for every right answer, from everyone. */}
      <View style={styles.jarRow}>
        <StageLabel live>{`THE JAR: ${state.stars} OF ${total}`}</StageLabel>
        <View style={styles.jar} accessible accessibilityLabel={`${state.stars} stars in the jar, out of ${total}`} testID={`jar:${state.stars}`}>
          {Array.from({ length: total }, (_, i) => (
            <Text key={i} allowFontScaling={false} style={[styles.star, i < state.stars ? styles.starIn : null]}>
              {i < state.stars ? '★' : '☆'}
            </Text>
          ))}
        </View>
      </View>

      <GameStage>
        <View
          accessible
          accessibilityLabel={q.kind === 'count' ? `${q.a} dots to count` : `${q.a} ${q.op === '−' ? 'take away' : q.op === '×' ? 'times' : q.op === '÷' ? 'divided by' : 'plus'} ${q.b}`}
          testID={`question:${q.kind}`}
        >
          <Ask q={q} />
        </View>
      </GameStage>

      <AnswerRow>
        {q.choices.map((c) => (
          <AnswerButton key={`${state.asked}:${c}`} label={`${c}`} state={state.ruledOut.includes(c) ? 'spent' : 'idle'} onPress={() => onAnswer(c)} />
        ))}
      </AnswerRow>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            const atLevel = nextLevel(level, stars);
            setLevel(atLevel);
            setState(createGame(systemRng, atLevel, kinds));
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
  choose: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  example: { fontFamily: fonts.heavy, fontSize: 22, color: palette.ink, textAlign: 'center' },
  dot: { width: 30, height: 30, backgroundColor: palette.ink },
  sum: { fontFamily: fonts.heavy, fontSize: font.display, color: palette.ink },
  jarRow: { paddingBottom: space.sm },
  jar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: rule.major,
    borderTopWidth: 0,
    borderColor: palette.ink,
    padding: space.xs,
    minHeight: 36,
  },
  star: { fontSize: 20, lineHeight: 24, color: palette.border },
  starIn: { color: playPalette.sun },
});
