import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, palette, rule } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { CLOCKS_PER_ROUND, choose, createGame, handAngles, type ClockTimeState } from './logic';

/**
 * A clock face: a ring, a mark for every minute (bolder every five), the
 * numbers 1-12, and two hands. The short hand is thick and the long hand
 * thin — told apart by shape, not only by the long one's colour.
 */
function ClockFace({ hour, minute, size: outer }: { readonly hour: number; readonly minute: number; readonly size: number }) {
  // Everything inside is placed within the ring's border.
  const size = outer - rule.major * 2;
  const r = size / 2;
  const angles = handAngles(hour, minute);
  // A hand is drawn pointing at 12 inside a full-size box, and the box is
  // turned — so it turns about the middle of the face.
  const hand = (angle: number, length: number, width: number, color: string, testID: string) => (
    <View testID={testID} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${angle}deg` }] }]} pointerEvents="none">
      <View style={{ position: 'absolute', left: r - width / 2, top: r - length, width, height: length + width / 2, backgroundColor: color }} />
    </View>
  );
  return (
    <View style={[styles.face, { width: outer, height: outer, borderRadius: outer / 2 }]}>
      {Array.from({ length: 60 }, (_, m) => {
        const five = m % 5 === 0;
        return (
          <View key={m} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${m * 6}deg` }] }]} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left: r - (five ? rule.major : rule.hair) / 2,
                top: size * 0.02,
                width: five ? rule.major * 1.5 : rule.hair,
                height: five ? size * 0.07 : size * 0.035,
                backgroundColor: five ? palette.ink : palette.inkSoft,
              }}
            />
          </View>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        const d = r * 0.64;
        const box = size * 0.16;
        return (
          <Text
            key={n}
            allowFontScaling={false}
            style={[
              styles.number,
              { left: r + d * Math.sin(a) - box / 2, top: r - d * Math.cos(a) - box / 2, width: box, height: box, lineHeight: box, fontSize: size * 0.09 },
            ]}
          >
            {n}
          </Text>
        );
      })}
      {hand(angles.hour, r * 0.5, Math.max(6, size * 0.035), palette.ink, 'hour-hand')}
      {hand(angles.minute, r * 0.82, Math.max(3, size * 0.014), palette.accent, 'minute-hand')}
      <View style={[styles.pin, { left: r - size * 0.03, top: r - size * 0.03, width: size * 0.06, height: size * 0.06, borderRadius: size * 0.03 }]} />
    </View>
  );
}

/** The clock as a child reading it would describe it — where each hand is
 *  pointing — without saying the time, which is the answer. */
function describeClock(hour: number, minute: number): string {
  const number = (n: number) => ((n + 11) % 12) + 1;
  const long =
    minute % 5 === 0
      ? `on the ${number(minute / 5 || 12)}`
      : `${minute % 5} ${minute % 5 === 1 ? 'mark' : 'marks'} past the ${number(Math.floor(minute / 5) || 12)}`;
  const short =
    minute === 0
      ? `on the ${number(hour)}`
      : minute < 20
        ? `just past the ${number(hour)}`
        : minute <= 40
          ? `between the ${number(hour)} and the ${number(hour + 1)}`
          : `nearly on the ${number(hour + 1)}`;
  return `A clock. The short hand is ${short}. The long hand is ${long}.`;
}

export function ClockTimeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<ClockTimeState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(choice)) return prev;
        if (choice === prev.clocks[prev.index].answer) correct(settings);
        else nudge(settings);
        return choose(prev, choice);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const clock = state.clocks[Math.min(state.index, state.clocks.length - 1)];
  const size = Math.min(Dimensions.get('window').width - gutter * 2 - 24, 300);
  const stars = starsForMistakes(state.mistakes);

  return (
    <GameFrame title="What's the Time?" icon="clockface" onExit={onExit} progress={state.index / CLOCKS_PER_ROUND}>
      <StageLabel>WHAT TIME DOES THE CLOCK SAY?</StageLabel>
      <GameStage>
        <View
          accessible
          accessibilityLabel={describeClock(clock.hour, clock.minute)}
          testID="clock"
        >
          <ClockFace hour={clock.hour} minute={clock.minute} size={size} />
        </View>
      </GameStage>

      <AnswerRow>
        {clock.choices.map((text, i) => (
          <AnswerButton
            key={`${state.index}:${text}`}
            label={text}
            state={state.ruledOut.includes(i) ? 'spent' : 'idle'}
            onPress={() => onChoose(i)}
          />
        ))}
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
  face: { backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  number: { position: 'absolute', textAlign: 'center', fontFamily: fonts.heavy, color: palette.ink },
  pin: { position: 'absolute', backgroundColor: palette.ink },
});
