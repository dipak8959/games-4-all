import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { GradientSurface } from '../../components/GradientSurface';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, gradients, hitTarget, palette, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, enterNumber, filledCount, selectCell, type SudokuState } from './logic';

export function SudokuScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  // No freshness bookkeeping here — see logic.ts: every puzzle is freshly
  // generated, so there's nothing pooled to avoid repeating.
  const [state, setState] = useState<SudokuState>(() => createGame(systemRng, level));

  const onSelectCell = useCallback(
    (index: number) => {
      setState((prev) => {
        const cell = prev.cells[index];
        if (cell && !cell.given && !prev.complete) tap(settings);
        return selectCell(prev, index);
      });
    },
    [settings],
  );

  const onEnterNumber = useCallback(
    (value: number) => {
      setState((prev) => {
        if (prev.selected == null) return prev;
        const isCorrect = value === prev.solution[prev.selected];
        if (isCorrect) correct(settings);
        else nudge(settings);
        return enterNumber(prev, value);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { size, boxHeight, boxWidth, cells, selected } = state;
  const givenCount = useMemo(() => cells.filter((c) => c.given).length, [cells]);
  const totalEmpty = cells.length - givenCount;
  const filledEmpty = filledCount(state) - givenCount;
  const progress = totalEmpty > 0 ? filledEmpty / totalEmpty : 1;
  const stars = starsForMistakes(state.mistakes);

  const cellSize = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const widthBudget = width - space.md * 2;
    // Sizing from width alone works on a typical narrow phone screen (the
    // grid naturally stays short enough too), but on a wide-but-short
    // viewport — a tablet in landscape, a resized browser window — width
    // alone can size cells so large the grid spills past the header/progress
    // bar above and the number palette below. ~230dp covers that chrome
    // (see GameFrame's header, the progress track, and the numbers row
    // below), so reserving it keeps a 9x9 board from ever overlapping them.
    const heightBudget = height - 230;
    const budget = Math.min(widthBudget, heightBudget);
    const raw = Math.floor(budget / size);
    return Math.max(28, Math.min(hitTarget, raw));
  }, [size]);

  return (
    <GameFrame title="Sudoku" icon="🧩" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        {/* Built as explicit rows rather than one flex-wrapped list of `size *
            size` cells: relying on wrapping to break every `size`-th cell
            onto a new line is exact-fit-fragile — a sub-pixel rounding
            difference between the container's fixed width and the summed
            cell widths is enough for a browser to wrap one cell early,
            turning the whole grid into a staircase with the last column
            missing from every row. An explicit row per row can't wrap
            wrong: it only ever holds exactly `size` cells. */}
        <View style={styles.grid}>
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: size }, (_, col) => {
                const index = row * size + col;
                const cell = cells[index];
                const isSelected = selected === index;
                const isRightEdge = col !== size - 1 && (col + 1) % boxWidth === 0;
                const isBottomEdge = row !== size - 1 && (row + 1) % boxHeight === 0;

                const cellStyle = [
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRightWidth: isRightEdge ? 3 : 1,
                    borderBottomWidth: isBottomEdge ? 3 : 1,
                  },
                  cell.given && styles.cellGiven,
                  isSelected && styles.cellSelected,
                ];

                return (
                  <Pressable
                    key={col}
                    accessibilityRole="button"
                    accessibilityLabel={cell.value != null ? `${cell.value}` : 'empty cell'}
                    accessibilityState={{ disabled: cell.given, selected: isSelected }}
                    disabled={cell.given}
                    onPress={() => onSelectCell(index)}
                    style={cellStyle}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        { fontSize: cellSize * 0.48 },
                        cell.given ? styles.cellTextGiven : styles.cellTextEntered,
                      ]}
                    >
                      {cell.value ?? ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.numbers}>
        {Array.from({ length: size }, (_, i) => i + 1).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Enter ${value}`}
            onPress={() => onEnterNumber(value)}
            style={({ pressed }) => [styles.numberOuter, pressed && styles.pressed]}
          >
            <GradientSurface colors={gradients.berry} style={styles.numberInner}>
              <Text style={styles.numberText}>{value}</Text>
            </GradientSurface>
          </Pressable>
        ))}
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
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: {
    flexDirection: 'column',
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: palette.ink,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: palette.surface,
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  cellGiven: { backgroundColor: palette.surfaceAlt },
  cellSelected: { backgroundColor: palette.berryLight },
  cellText: { fontWeight: '800' },
  cellTextGiven: { color: palette.ink },
  cellTextEntered: { color: palette.berry },
  numbers: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  numberOuter: { width: hitTarget, height: hitTarget, borderRadius: radius.md, ...shadow },
  numberInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  numberText: { fontSize: font.title, fontWeight: '800', color: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.95 }] },
});
