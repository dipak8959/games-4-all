import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel, StageScroll, fitTiles } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, hitTarget, palette, rule } from '../../theme/tokens';
import { fonts, type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  MAPS_PER_ROUND,
  arrowFrom,
  createGame,
  dig,
  nextMap,
  stepsFrom,
  type TreasureHuntState,
} from './logic';

/** How long a found treasure stays on show before the next map. */
const FOUND_MS = 1200;

/** The 'back' icon points left; this turns it to point any of eight ways. */
function arrowTurn(dx: number, dy: number): number {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down
  return angle + 180;
}

function arrowWords(dx: number, dy: number): string {
  const v = dy < 0 ? 'up' : dy > 0 ? 'down' : '';
  const h = dx < 0 ? 'left' : dx > 0 ? 'right' : '';
  return v && h ? `${v} and to the ${h}` : v || `to the ${h}`;
}

/** The chest: a lid and a box, with a clasp. */
function Chest({ size }: { readonly size: number }) {
  return (
    <View style={{ width: size * 0.64, height: size * 0.5 }}>
      <View style={[styles.lid, { height: size * 0.18 }]} />
      <View style={[styles.box, { height: size * 0.3, marginTop: size * 0.02 }]} />
      <View style={[styles.clasp, { left: size * 0.27, top: size * 0.14, width: size * 0.1, height: size * 0.12 }]} />
    </View>
  );
}

export function TreasureHuntScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<TreasureHuntState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.found) return undefined;
    const on = setTimeout(() => setState((prev) => nextMap(prev, systemRng, level)), FOUND_MS);
    return () => clearTimeout(on);
  }, [state.found, level]);

  const onDig = useCallback(
    (cell: number) => {
      setState((prev) => {
        if (prev.found || prev.complete || prev.dug.includes(cell)) return prev;
        if (cell === prev.map.treasure) correct(settings);
        else tap(settings);
        return dig(prev, cell);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { map } = state;
  const { tile, rowWidth } = useMemo(() => {
    // As big as fits across and down, up to 96 — and never under the
    // minimum, with the grid scrolling on a phone too short for it.
    const down = Math.floor((Dimensions.get('window').height - 240) / map.rows);
    return fitTiles(map.cols, Math.min(96, Math.max(hitTarget, down)));
  }, [map.cols, map.rows]);

  const stars = starsForMistakes(state.mistakes);
  const progress = (state.mapIndex + (state.found ? 1 : 0)) / MAPS_PER_ROUND;

  return (
    <GameFrame title="Treasure Hunt" icon="treasure" onExit={onExit} progress={progress}>
      <StageScroll>
        <StageLabel live>{state.found ? 'TREASURE!' : 'DIG TO FIND THE TREASURE'}</StageLabel>

        <AnswerRow style={{ width: rowWidth, alignSelf: 'center' }}>
          {Array.from({ length: map.cols * map.rows }, (_, cell) => {
            const dug = state.dug.includes(cell);
            const where = `Row ${Math.floor(cell / map.cols) + 1}, column ${(cell % map.cols) + 1}`;
            let label = `${where}, not dug`;
            let content: React.ReactNode = null;
            if (dug && cell === map.treasure) {
              label = `${where}: treasure!`;
              content = <Chest size={tile} />;
            } else if (dug && map.clue === 'arrow') {
              const { dx, dy } = arrowFrom(map, cell);
              label = `${where}: the treasure is ${arrowWords(dx, dy)}`;
              content = (
                <View style={{ transform: [{ rotate: `${arrowTurn(dx, dy)}deg` }] }}>
                  <Icon name="back" size={tile * 0.46} color={palette.ink} />
                </View>
              );
            } else if (dug) {
              const steps = stepsFrom(map, cell);
              label = `${where}: the treasure is ${steps} ${steps === 1 ? 'step' : 'steps'} away`;
              content = (
                <View style={styles.steps}>
                  <Text allowFontScaling={false} style={styles.stepsNumber}>
                    {steps}
                  </Text>
                  <Text style={type.monoSm}>{steps === 1 ? 'STEP' : 'STEPS'}</Text>
                </View>
              );
            }
            return (
              <AnswerButton
                key={`${state.mapIndex}:${cell}`}
                accessibilityLabel={label}
                size={tile}
                state={dug && cell === map.treasure ? 'active' : 'idle'}
                disabled={dug || state.found}
                onPress={() => onDig(cell)}
              >
                {dug ? <View style={styles.hole}>{content}</View> : <View style={styles.sand} />}
              </AnswerButton>
            );
          })}
        </AnswerRow>
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
  // Undug sand: a small speckle, so it reads as ground rather than a blank
  // button. A dug square is the hole: the clue sits on the plain ground.
  sand: { width: 6, height: 6, backgroundColor: palette.border },
  hole: { alignItems: 'center', justifyContent: 'center' },
  steps: { alignItems: 'center' },
  stepsNumber: { fontFamily: fonts.heavy, fontSize: font.h2, color: palette.ink, includeFontPadding: false },
  lid: { backgroundColor: palette.ink },
  box: { backgroundColor: palette.sun, borderWidth: rule.major, borderColor: palette.ink },
  clasp: { position: 'absolute', backgroundColor: palette.ink },
});
