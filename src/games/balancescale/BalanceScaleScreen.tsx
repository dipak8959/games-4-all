import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../../components/BigButton';
import { StageLabel, StageScroll, fitTiles } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  PUZZLES,
  createGame,
  fewestWeighings,
  movePlace,
  nextPuzzle,
  pick,
  starsForExtra,
  weigh,
  type BalanceScaleState,
} from './logic';

/** How long a found coin shows before the next puzzle. */
const SHOW_MS = 1100;
const TILT = 9;
const PER_ROW = 4;

const name = (coins: readonly number[]) => coins.map((c) => c + 1).join(' ');

export function BalanceScaleScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the moment before the next one waits.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BalanceScaleState>(() => createGame(systemRng, level));
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!state.found || state.complete || paused) return undefined;
    correct(settings);
    const t = setTimeout(() => {
      setPicking(false);
      setState((prev) => nextPuzzle(prev));
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [state.found, state.complete, settings, paused]);

  useEffect(() => {
    if (state.ruledOut.length) nudge(settings);
  }, [state.ruledOut.length, settings]);

  const onCoin = useCallback(
    (coin: number) => {
      tap(settings);
      setState((prev) => (picking ? pick(prev, coin) : movePlace(prev, coin)));
    },
    [settings, picking],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setPicking(false);
    setState(createGame(systemRng, atLevel));
  }, []);

  const placedLeft = state.places.flatMap((p, i) => (p === 'left' ? [i] : []));
  const placedRight = state.places.flatMap((p, i) => (p === 'right' ? [i] : []));
  const last = state.history[state.history.length - 1];
  // Coins on the pans now, level; or else the last weighing, tipped.
  const placing = placedLeft.length > 0 || placedRight.length > 0;
  const pans = placing || !last ? { left: placedLeft, right: placedRight, result: null } : last;
  const tilt = pans.result === 'left' ? -TILT : pans.result === 'right' ? TILT : 0;
  const { tile } = fitTiles(PER_ROW, 80);
  const coins = Array.from({ length: state.coins }, (_, i) => i);
  const rows: number[][] = [];
  for (let i = 0; i < coins.length; i += PER_ROW) rows.push(coins.slice(i, i + PER_ROW));
  const fewest = fewestWeighings(state.coins);
  const label = state.found
    ? 'FOUND IT!'
    : picking
      ? 'TAP THE HEAVY COIN'
      : `PUT COINS ON THE PANS, THEN WEIGH · ${fewest} WEIGHING${fewest === 1 ? '' : 'S'} CAN DO IT`;
  const stars = starsForExtra(state.extra);
  const said = (r: string) => (r === 'left' ? 'LEFT SIDE DOWN' : r === 'right' ? 'RIGHT SIDE DOWN' : 'LEVEL');

  return (
    <GameFrame title="Balance Scale" icon="balance" onExit={onExit} progress={(state.index + (state.found ? 1 : 0)) / PUZZLES}>
      <StageLabel live>{label}</StageLabel>
      <StageScroll>
        {/* The scale: a beam that tips to the heavy side, and its two pans. */}
        <View style={styles.scale} accessible accessibilityLabel={`Left pan: ${name(pans.left) || 'empty'}. Right pan: ${name(pans.right) || 'empty'}.${pans.result ? ` ${said(pans.result)}.` : ''}`}>
          <View style={[styles.beam, { transform: [{ rotate: `${tilt}deg` }] }]}>
            <View style={styles.pan}>
              <Text style={styles.panText}>{name(pans.left) || '—'}</Text>
            </View>
            <View style={styles.pan}>
              <Text style={styles.panText}>{name(pans.right) || '—'}</Text>
            </View>
          </View>
          <View style={styles.post} />
          <Text style={[type.mono, styles.result]}>{pans.result ? said(pans.result) : ' '}</Text>
        </View>

        <View style={styles.coins}>
          {rows.map((row) => (
            <View key={row[0]} style={styles.coinRow}>
              {row.map((c) => {
                const out = state.ruledOut.includes(c);
                const place = state.places[c];
                const found = state.found && state.heavies[state.index] === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`Coin ${c + 1}${out ? ', not it' : place !== 'off' ? `, on the ${place} pan` : ''}`}
                    testID={`coin:${c}:${place}:${out ? 1 : 0}`}
                    disabled={out}
                    onPress={() => onCoin(c)}
                    style={({ pressed }) => [styles.coinCell, { width: tile, height: tile }, pressed && styles.pressed]}
                  >
                    <View style={[found ? styles.coinFound : out ? styles.coinOut : styles.coin, { width: tile * 0.72, height: tile * 0.72, borderRadius: tile * 0.36 }]}>
                      <Text style={[styles.coinText, found && styles.coinTextFound]}>{c + 1}</Text>
                    </View>
                    <Text style={type.mono}>{out ? 'NOT IT' : place === 'left' ? 'LEFT' : place === 'right' ? 'RIGHT' : ' '}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <BigButton label="WEIGH" icon="balance" disabled={picking || !placing || state.found} onPress={() => setState((prev) => weigh(prev))} />
          <BigButton
            label={picking ? 'BACK TO WEIGHING' : 'PICK THE HEAVY ONE'}
            icon={picking ? 'back' : 'search'}
            tone="quiet"
            disabled={state.found}
            onPress={() => setPicking((p) => !p)}
          />
        </View>

        <View style={styles.history}>
          {state.history.map((w, i) => (
            <Text key={i} style={type.meta} testID={`weighing:${w.left.join('.')}:${w.right.join('.')}:${w.result}`}>
              {`${i + 1}.  ${name(w.left) || '—'}  against  ${name(w.right) || '—'}  →  ${said(w.result).toLowerCase()}`}
            </Text>
          ))}
        </View>
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
  scale: { alignItems: 'center', paddingTop: space.md, marginBottom: space.md },
  beam: { flexDirection: 'row', justifyContent: 'space-between', width: 260, borderTopWidth: rule.major * 2, borderTopColor: palette.ink },
  pan: { width: 110, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: rule.major, borderTopWidth: 0, borderColor: palette.ink, backgroundColor: palette.surface },
  panText: { fontFamily: fonts.heavy, fontSize: 16, color: palette.ink },
  post: { width: rule.major * 2, height: 28, backgroundColor: palette.ink },
  result: { marginTop: space.xs },
  coins: { gap: rule.hair, alignItems: 'center' },
  coinRow: { flexDirection: 'row', gap: rule.hair },
  coinCell: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  coin: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  coinOut: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: rule.major, borderColor: palette.inkSoft, borderStyle: 'dashed' },
  coinFound: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.accent },
  coinText: { fontFamily: fonts.heavy, fontSize: 20, color: palette.ink },
  coinTextFound: { color: palette.bg },
  pressed: { backgroundColor: 'rgba(32,30,29,0.08)' },
  actions: { marginTop: space.md, gap: space.sm },
  history: { marginTop: space.md, gap: space.xs },
});
