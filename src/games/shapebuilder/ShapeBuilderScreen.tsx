import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  createGame,
  filledBlocks,
  pieceAt,
  selectPiece,
  tapCell,
  turnSelected,
  type Cell,
  type Piece,
  type ShapeBuilderState,
} from './logic';

/** Blocks inside a tray button. Five of them still fit its 72dp face. */
const MINI = 14;

/**
 * A piece drawn small, for the tray. Ink on the surface, or the ground on the
 * accent once it's picked up — the same inversion every lit answer uses.
 */
function MiniPiece({ cells, lit }: { readonly cells: readonly Cell[]; readonly lit: boolean }) {
  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  return (
    <View style={{ width: cols * MINI, height: rows * MINI }}>
      {cells.map(([r, c]) => (
        <View
          key={`${r},${c}`}
          testID="piece-block"
          style={[
            styles.mini,
            { top: r * MINI, left: c * MINI },
            { backgroundColor: lit ? palette.bg : palette.ink, borderColor: lit ? palette.accent : palette.surface },
          ]}
        />
      ))}
    </View>
  );
}

export function ShapeBuilderScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately — the same pattern every other game uses.
  const [level, setLevel] = useState(initialLevel);
  // Every outline is cut fresh, so there's no pool to exhaust and nothing
  // to avoid repeating.
  const [state, setState] = useState<ShapeBuilderState>(() => createGame(systemRng, level));

  const onPickPiece = useCallback(
    (id: number) => {
      tap(settings);
      setState((prev) => selectPiece(prev, id));
    },
    [settings],
  );

  const onTurn = useCallback(() => {
    tap(settings);
    setState(turnSelected);
  }, [settings]);

  const onTapCell = useCallback(
    (cell: Cell) => {
      setState((prev) => {
        const next = tapCell(prev, cell);
        if (next.mistakes > prev.mistakes) nudge(settings);
        else if (filledBlocks(next) > filledBlocks(prev)) correct(settings);
        else if (next !== prev) tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  // Only the rows and columns the outline actually uses are drawn, so a
  // small first puzzle sits in the middle of the stage rather than in the
  // corner of a mostly-empty board.
  const box = useMemo(() => {
    const rs = state.outline.map(([r]) => r);
    const cs = state.outline.map(([, c]) => c);
    return { top: Math.min(...rs), bottom: Math.max(...rs), left: Math.min(...cs), right: Math.max(...cs) };
  }, [state.outline]);
  const inOutline = useMemo(() => new Set(state.outline.map(([r, c]) => `${r},${c}`)), [state.outline]);

  const owner = (cell: Cell): Piece | undefined => pieceAt(state, cell);
  const stars = starsForMistakes(state.mistakes);
  const progress = filledBlocks(state) / state.outline.length;
  const holding = state.selected != null;

  return (
    <GameFrame title="Shape Builder" icon="pieces" onExit={onExit} progress={progress}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StageLabel live>{holding ? 'TAP WHERE IT GOES' : 'PICK A PIECE'}</StageLabel>

        <View style={styles.stage}>
          <View style={styles.board}>
            {Array.from({ length: box.bottom - box.top + 1 }, (_, i) => box.top + i).map((r) => (
              <View key={r} style={styles.boardRow}>
                {Array.from({ length: box.right - box.left + 1 }, (_, j) => box.left + j).map((c) => {
                  if (!inOutline.has(`${r},${c}`)) return <View key={c} style={styles.cellSize} />;
                  const here = owner([r, c]);
                  // A placed piece is one solid block of ink: the rule between
                  // two of its own blocks is dropped, and kept (in the ground
                  // colour) wherever it meets something else — so each piece
                  // reads as a single shape you can pick back up.
                  const same = (dr: number, dc: number) => here != null && owner([r + dr, c + dc])?.id === here.id;
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${here ? 'filled' : 'empty'}`}
                      onPress={() => onTapCell([r, c])}
                      style={({ pressed }) => [
                        styles.cellSize,
                        here
                          ? [
                              styles.filled,
                              {
                                borderTopWidth: same(-1, 0) ? 0 : rule.major,
                                borderBottomWidth: same(1, 0) ? 0 : rule.major,
                                borderLeftWidth: same(0, -1) ? 0 : rule.major,
                                borderRightWidth: same(0, 1) ? 0 : rule.major,
                              },
                            ]
                          : styles.empty,
                        pressed && !here && holding && styles.target,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <AnswerRow>
          {state.pieces.map((piece) => {
            const lit = state.selected === piece.id;
            return (
              <AnswerButton
                key={piece.id}
                accessibilityLabel={`Piece of ${piece.cells.length} blocks${lit ? ', picked up' : ''}${piece.at ? ', placed' : ''}`}
                state={piece.at ? 'spent' : lit ? 'active' : 'idle'}
                onPress={() => onPickPiece(piece.id)}
              >
                <MiniPiece cells={piece.cells} lit={lit} />
              </AnswerButton>
            );
          })}
          {state.rotation ? (
            <AnswerButton
              accessibilityLabel="Turn the piece"
              disabled={!holding}
              state={holding ? 'idle' : 'spent'}
              onPress={onTurn}
            >
              <Icon name="replay" size={34} color={palette.ink} />
            </AnswerButton>
          ) : null}
        </AnswerRow>
      </ScrollView>

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
  scroll: { flexGrow: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg },
  board: { alignSelf: 'center' },
  boardRow: { flexDirection: 'row' },
  // Full touch-target size: four columns of these fit a phone, which is why
  // the board is capped at four (see `BOARD_COLS` in logic.ts).
  cellSize: { width: hitTarget, height: hitTarget },
  empty: {
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  filled: { backgroundColor: palette.ink, borderColor: palette.bg },
  target: { backgroundColor: palette.accentTint },
  mini: { position: 'absolute', width: MINI, height: MINI, borderWidth: rule.hair },
});
