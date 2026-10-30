import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { PlayersPicker, TurnBanner } from '../../components/Players';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { Shape } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, describeItem, pickItem, stopPeeking, type Item, type MarketMemoryState } from './logic';

/** A thing from the shelf: its shape, and a box round it if it's boxed. */
function Thing({ item, size }: { readonly item: Item; readonly size: number }) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, item.boxed ? styles.boxed : null]}>
      <Shape shape={item.shape} color={item.color} size={size * (item.boxed ? 0.58 : 0.8)} />
    </View>
  );
}

export function MarketMemoryScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [players, setPlayers] = useState(0);
  const [state, setState] = useState<MarketMemoryState | null>(null);

  const start = useCallback(
    (count: number, atLevel: number) => {
      setPlayers(count);
      setState(createGame(systemRng, atLevel, count));
    },
    [],
  );

  const onPick = useCallback(
    (item: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = pickItem(prev, item, systemRng);
        if (next.mistakes > prev.mistakes) nudge(settings);
        else if (next.phase === 'add' && prev.phase === 'recall') correct(settings);
        else tap(settings);
        return next;
      });
    },
    [settings],
  );

  if (!state) {
    return (
      <GameFrame title="Market Memory" icon="market" onExit={onExit} progress={0}>
        <PlayersPicker onPick={(n) => start(n, level)} />
      </GameFrame>
    );
  }

  const stars = starsForMistakes(state.mistakes);
  const doing = state.peeking
    ? 'Here is the bag — take a good look'
    : state.phase === 'add'
      ? state.bag.length === 0
        ? 'Put something in the bag'
        : 'Now add one more to the bag'
      : "Tap what's in the bag, in order";

  return (
    <GameFrame title="Market Memory" icon="market" onExit={onExit} progress={state.bag.length / state.target}>
      <TurnBanner player={state.turn} doing={doing} />
      <StageLabel live>{`THE BAG: ${state.bag.length} OF ${state.target}`}</StageLabel>

      {/* The bag: what's been remembered so far this turn face up, the rest
          hidden — or all of it, after a slip or once it's all remembered. */}
      <View
        style={styles.bag}
        accessible
        accessibilityLabel={
          state.bag.length === 0
            ? 'The bag is empty.'
            : `The bag: ${state.bag
                .map((b, i) => (state.peeking || i < state.recalled || state.phase === 'add' ? describeItem(state.items[b]) : 'hidden'))
                .join(', ')}.`
        }
        testID={`bag:${state.bag.length}:${state.recalled}:${state.phase}`}
      >
        {state.bag.map((b, i) => {
          const open = state.peeking || i < state.recalled || state.phase === 'add';
          return (
            <View key={i} style={[styles.slot, !open ? styles.slotHidden : null]}>
              {open ? <Thing item={state.items[b]} size={24} /> : <Text style={styles.hidden}>?</Text>}
            </View>
          );
        })}
      </View>

      {state.peeking ? (
        <AnswerRow style={styles.ready}>
          <AnswerButton label="GOT IT" accessibilityLabel="Got it, carry on" size={hitTarget} onPress={() => setState((prev) => (prev ? stopPeeking(prev) : prev))} />
        </AnswerRow>
      ) : (
        <AnswerRow style={styles.shelf}>
          {state.shelf.map((i) => (
            <AnswerButton key={i} accessibilityLabel={describeItem(state.items[i])} size={hitTarget} onPress={() => onPick(i)}>
              <Thing item={state.items[i]} size={48} />
            </AnswerButton>
          ))}
        </AnswerRow>
      )}

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
  boxed: { borderWidth: rule.major, borderColor: palette.ink },
  bag: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    minHeight: 40,
    alignItems: 'center',
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  slot: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: rule.hair, borderColor: palette.border, backgroundColor: palette.surface },
  slotHidden: { backgroundColor: palette.surfaceAlt },
  hidden: { fontFamily: fonts.heavy, fontSize: 16, color: palette.inkSoft },
  shelf: { flex: 1, alignContent: 'center' },
  ready: { flex: 1, alignItems: 'center' },
});
