import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel, StageScroll } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  DOWN,
  LEFT,
  PUZZLES_PER_ROUND,
  RIGHT,
  UP,
  createGame,
  nextPuzzle,
  openSides,
  starsForTurns,
  turnPiece,
  wet,
  type WaterWorksState,
} from './logic';

/** How long a watered flower stays on show before the next puzzle. */
const WATERED_MS = 1200;
/** Room either side of the grid for the tap and the flower. */
const SIDE = 34;
const FLOWER_MIN = 24;

const SIDE_NAMES: readonly [number, string][] = [
  [UP, 'up'],
  [RIGHT, 'right'],
  [DOWN, 'down'],
  [LEFT, 'left'],
];

/**
 * One pipe piece: an arm from the middle to each open side. Water shows as
 * a light channel inside the pipe — a shape as well as a colour, so it reads
 * without colour vision.
 */
function Pipe({ sides, size, full }: { readonly sides: number; readonly size: number; readonly full: boolean }) {
  const w = size * 0.28;
  const c = (size - w) / 2;
  const arm = (side: number) => {
    if (side === UP) return { left: c, top: 0, width: w, height: c + w };
    if (side === DOWN) return { left: c, top: c, width: w, height: size - c };
    if (side === LEFT) return { left: 0, top: c, width: c + w, height: w };
    return { left: c, top: c, width: size - c, height: w };
  };
  const channel = (box: { left: number; top: number; width: number; height: number }, side: number) => {
    const inset = w * 0.28;
    return side === UP || side === DOWN
      ? { left: box.left + inset, top: box.top, width: box.width - inset * 2, height: box.height }
      : { left: box.left, top: box.top + inset, width: box.width, height: box.height - inset * 2 };
  };
  return (
    <View style={{ width: size, height: size }}>
      {SIDE_NAMES.filter(([side]) => sides & side).map(([side]) => (
        <React.Fragment key={side}>
          <View style={[styles.pipe, arm(side)]} />
          {full ? <View style={[styles.water, channel(arm(side), side)]} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

/** The flower: a stem, and petals that open once it has water. */
function Flower({ size, watered }: { readonly size: number; readonly watered: boolean }) {
  // Shut, the bud is grey but still clear against the ground: it is the
  // goal, and has to be found before it has water.
  const petal = watered ? size * 0.34 : size * 0.26;
  const colour = watered ? palette.grape : palette.inkSoft;
  const middle = size / 2;
  return (
    <View style={{ width: size, height: size * 1.6 }}>
      <View style={[styles.stem, { left: middle - 2, top: size * 0.5, height: size * 1.1 }]} />
      {[
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].map(([dx, dy]) => (
        <View
          key={`${dx}${dy}`}
          style={{
            position: 'absolute',
            left: middle - petal / 2 + dx * petal * 0.6,
            top: size * 0.5 - petal / 2 + dy * petal * 0.6,
            width: petal,
            height: petal,
            borderRadius: petal / 2,
            backgroundColor: colour,
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: middle - petal * 0.3,
          top: size * 0.5 - petal * 0.3,
          width: petal * 0.6,
          height: petal * 0.6,
          borderRadius: petal * 0.3,
          backgroundColor: palette.sun,
        }}
      />
    </View>
  );
}

export function WaterWorksScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<WaterWorksState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.solved) return undefined;
    const on = setTimeout(() => setState((prev) => nextPuzzle(prev, systemRng, level)), WATERED_MS);
    return () => clearTimeout(on);
  }, [state.solved, level]);

  const onTurn = useCallback(
    (cell: number) => {
      setState((prev) => {
        if (prev.solved || prev.complete) return prev;
        const next = turnPiece(prev, cell);
        if (next.solved) correct(settings);
        else tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { puzzle } = state;
  const { tile, side } = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const across = Math.floor((width - gutter * 2 - SIDE * 2 - (puzzle.cols - 1) * rule.hair) / puzzle.cols);
    const down = Math.floor((height - 250) / puzzle.rows);
    const t = Math.max(hitTarget, Math.min(96, across, down));
    // The tap and the flower take what's left either side, down to a narrow
    // strip on a small phone, and the board may use the gutters: the pipes
    // are what's tapped, and they never go under the minimum.
    const grid = puzzle.cols * t + (puzzle.cols - 1) * rule.hair;
    return { tile: t, side: Math.max(14, Math.min(SIDE, Math.floor((width - grid) / 2) - 2)) };
  }, [puzzle.cols, puzzle.rows]);
  const pitch = tile + rule.hair;
  // Never too small to spot: on a narrow phone the flower leans over the
  // end of the last pipe, where the water would reach it anyway.
  const flower = Math.max(FLOWER_MIN, side - 4);
  const flowing = new Set(wet(puzzle));

  const stars = starsForTurns(state.roundTaps, state.roundFewest);
  const progress = (state.puzzleIndex + (state.solved ? 1 : 0)) / PUZZLES_PER_ROUND;

  return (
    <GameFrame title="Water Works" icon="pipes" onExit={onExit} progress={progress}>
      <StageScroll>
        <StageLabel live>{state.solved ? 'THE FLOWER HAS WATER' : 'TURN THE PIPES TO THE FLOWER'}</StageLabel>

        <View style={styles.board}>
          <View style={{ width: side, height: puzzle.rows * pitch }}>
            <View
              accessible
              accessibilityLabel={`The tap, at row ${puzzle.tapRow + 1}`}
              style={[styles.tap, { top: puzzle.tapRow * pitch + tile / 2 - tile * 0.18, height: tile * 0.36 }]}
            />
          </View>

          <AnswerRow style={{ width: puzzle.cols * tile + (puzzle.cols - 1) * rule.hair, paddingBottom: 0 }}>
            {puzzle.pieces.map((piece, cell) => {
              const sides = openSides(piece);
              const open = SIDE_NAMES.filter(([side]) => sides & side).map(([, name]) => name);
              const full = flowing.has(cell);
              return (
                <AnswerButton
                  key={`${state.puzzleIndex}:${cell}`}
                  accessibilityLabel={`Row ${Math.floor(cell / puzzle.cols) + 1}, column ${(cell % puzzle.cols) + 1}: ${piece.kind}, open ${open.join(' and ')}${full ? ', water in it' : ''}`}
                  size={tile}
                  disabled={state.solved}
                  onPress={() => onTurn(cell)}
                >
                  {/* Edge to edge inside the button's border, over its side
                      padding, so pipes in neighbouring squares meet. */}
                  <View style={styles.bleed}>
                    <Pipe sides={sides} size={tile - rule.hair * 2} full={full} />
                  </View>
                </AnswerButton>
              );
            })}
          </AnswerRow>

          <View style={{ width: side, height: puzzle.rows * pitch }}>
            <View
              accessible
              accessibilityLabel={`The flower, at row ${puzzle.flowerRow + 1}${state.solved ? ', watered' : ''}`}
              pointerEvents="none"
              style={{ position: 'absolute', left: side - 2 - flower, top: puzzle.flowerRow * pitch + tile / 2 - flower / 2 }}
            >
              <Flower size={flower} watered={state.solved} />
            </View>
          </View>
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
  board: { flexDirection: 'row', alignSelf: 'center' },
  pipe: { position: 'absolute', backgroundColor: palette.ink },
  water: { position: 'absolute', backgroundColor: palette.sky },
  tap: { position: 'absolute', left: 0, right: 0, backgroundColor: palette.ink },
  stem: { position: 'absolute', width: 4, backgroundColor: palette.leaf },
  bleed: { marginHorizontal: -space.sm },
});
