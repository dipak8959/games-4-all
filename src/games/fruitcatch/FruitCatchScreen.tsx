import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  FIELD_HEIGHT,
  THINGS_PER_ROUND,
  createGame,
  heightOf,
  moveTo,
  starsForMisses,
  step,
  type FruitCatchState,
  type ThingKind,
} from './logic';

/** react-native-web's own name for "report a press the instant it starts";
 *  see Puddle Hop for why this matters. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;

/** The basket's height, and the strip of ground under it, in dp. */
const BASKET_H = 44;
const GROUND_H = 14;

/** How long something that landed stays in sight on the ground. */
const SHOW_LANDED = 0.6;

const FRUIT_COLOURS: Record<Exclude<ThingKind, 'cone'>, string> = {
  apple: palette.berry,
  orange: palette.sun,
  plum: palette.grape,
  lime: palette.leaf,
};

/** A fruit: a round body with a stalk and a leaf. Every fruit is round and
 *  the pine cone is pointed, so shape alone tells them apart. */
function Fruit({ kind, size }: { readonly kind: Exclude<ThingKind, 'cone'>; readonly size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          left: 0,
          width: size,
          height: size * 0.88,
          borderRadius: size,
          backgroundColor: FRUIT_COLOURS[kind],
        }}
      />
      <View style={[styles.stalk, { left: size * 0.47, width: size * 0.08, height: size * 0.2 }]} />
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          left: size * 0.56,
          width: size * 0.22,
          height: size * 0.12,
          backgroundColor: palette.leaf,
          transform: [{ rotate: '-25deg' }],
        }}
      />
    </View>
  );
}

/** A pine cone: pointed, dark, with light scale lines across it. */
function Cone({ size }: { readonly size: number }) {
  const w = size * 0.74;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={[styles.stalk, { left: size * 0.46, width: size * 0.08, height: size * 0.14 }]} />
      <View
        style={{
          marginTop: size * 0.12,
          width: w,
          height: 0,
          borderTopWidth: size * 0.86,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderTopColor: palette.ink,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
        }}
      />
      {[0.3, 0.5, 0.68].map((y, i) => {
        const line = w * (0.6 - i * 0.15);
        return (
          <View
            key={y}
            style={[styles.scale, { top: size * y, left: (size - line) / 2, width: line, height: Math.max(2, size * 0.05) }]}
          />
        );
      })}
    </View>
  );
}

function ThingView({ kind, size }: { readonly kind: ThingKind; readonly size: number }) {
  return kind === 'cone' ? <Cone size={size} /> : <Fruit kind={kind} size={size} />;
}

export function FruitCatchScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the clock stops, and nothing moves.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<FruitCatchState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!state.started || state.complete || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.started, state.complete, paused]);

  // A catch gets the little "yes" every right answer gets, a miss the gentle
  // nudge. Counted from the landings, so each is felt exactly once.
  const landed = useRef({ caught: 0, misses: 0 });
  const caught = state.things.filter((t) => t.landing === 'caught').length;
  useEffect(() => {
    if (caught > landed.current.caught) correct(settings);
    if (state.misses > landed.current.misses) nudge(settings);
    landed.current = { caught, misses: state.misses };
  }, [caught, state.misses, settings]);

  const onColumn = useCallback(
    (column: number) => {
      tap(settings);
      setState((prev) => moveTo(prev, column));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    landed.current = { caught: 0, misses: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  // Each column is a button the full height of the stage: on a phone too
  // narrow for four at the minimum width, the stage uses the gutters.
  const needed = state.columns * hitTarget + rule.major * 2;
  const inside = Dimensions.get('window').width - gutter * 2;
  const bleed = needed > inside ? Math.min(gutter, Math.ceil((needed - inside) / 2)) : 0;
  const colW = stage.width / state.columns;
  const size = Math.min(colW * 0.55, 56);
  const basketTop = stage.height - GROUND_H - BASKET_H;
  const topOf = (height: number) => (height / FIELD_HEIGHT) * (basketTop - size);
  const basketW = colW * 0.8;

  // The basket flashes when it catches something, and shakes when a pine
  // cone lands in it (still, if motion is reduced).
  const lastCatch = state.things.reduce(
    (at, t) => (t.landing === 'caught' ? Math.max(at, t.dropAt + state.fallTime) : at),
    -1,
  );
  const lastBump = state.things.reduce(
    (at, t) => (t.landing === 'bumped' ? Math.max(at, t.dropAt + state.fallTime) : at),
    -1,
  );
  const flashing = state.elapsed - lastCatch < 0.25;
  const shaking = !settings.reduceMotion && state.elapsed - lastBump < 0.3;
  const shake = shaking ? Math.sin((state.elapsed - lastBump) * 60) * 4 : 0;

  const stars = starsForMisses(state.misses);
  const landedCount = state.things.filter((t) => t.landing !== null).length;
  const progress = landedCount / THINGS_PER_ROUND;

  return (
    <GameFrame title="Fruit Catch" icon="catch" onExit={onExit} progress={progress}>
      <StageLabel live>{state.started ? 'CATCH THE FRUIT, NOT THE CONES' : 'TAP TO START'}</StageLabel>

      <View
        style={[styles.stage, { marginHorizontal: -bleed }]}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        testID={`field:${state.columns}`}
      >
        {Array.from({ length: state.columns - 1 }, (_, i) => (
          <View key={i} style={[styles.divider, { left: (i + 1) * colW - rule.hair / 2 }]} />
        ))}

        {stage.width > 0
          ? state.things.map((thing, i) => {
              const height = heightOf(state, thing);
              if (height === null) return null;
              const left = thing.column * colW + (colW - size) / 2;
              if (thing.landing === null) {
                return (
                  <View
                    key={i}
                    testID={`falling:${thing.kind === 'cone' ? 'cone' : 'fruit'}:${thing.column}`}
                    style={{ position: 'absolute', left, top: topOf(height) }}
                  >
                    <ThingView kind={thing.kind} size={size} />
                  </View>
                );
              }
              // Fruit that was missed and cones that were let go lie on the
              // ground for a moment, so a child sees where they went.
              const since = state.elapsed - (thing.dropAt + state.fallTime);
              if ((thing.landing === 'missed' || thing.landing === 'dodged') && since < SHOW_LANDED) {
                return (
                  <View
                    key={i}
                    style={{ position: 'absolute', left, top: basketTop + BASKET_H - size * 0.6, opacity: 0.6 }}
                  >
                    <ThingView kind={thing.kind} size={size * 0.6} />
                  </View>
                );
              }
              return null;
            })
          : null}

        {stage.width > 0 ? (
          <View
            testID="basket"
            style={[
              styles.basket,
              flashing && styles.basketFlash,
              {
                left: state.basketX * colW + (colW - basketW) / 2 + shake,
                top: basketTop,
                width: basketW,
                height: BASKET_H,
              },
            ]}
          >
            <View style={[styles.weave, { top: BASKET_H * 0.35 }]} />
            <View style={[styles.weave, { top: BASKET_H * 0.65 }]} />
          </View>
        ) : null}
        <View style={[styles.ground, { height: GROUND_H }]} />

        {/* Each column, the full height of the field, is a button: tap where
            you want the basket. */}
        <View style={styles.controls}>
          {Array.from({ length: state.columns }, (_, column) => (
            <Pressable
              key={column}
              {...PRESS_AT_ONCE}
              accessibilityRole="button"
              accessibilityLabel={`Column ${column + 1} of ${state.columns}${state.basket === column ? ', basket here' : ''}`}
              onPressIn={() => onColumn(column)}
              style={styles.column}
            />
          ))}
        </View>
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
  stage: {
    flex: 1,
    marginBottom: rule.major * 8,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderLeftWidth: rule.major,
    borderRightWidth: rule.major,
    borderColor: palette.ink,
  },
  divider: { position: 'absolute', top: 0, bottom: 0, width: rule.hair, backgroundColor: palette.border },
  stalk: { position: 'absolute', top: 0, backgroundColor: palette.ink },
  scale: { position: 'absolute', backgroundColor: palette.bg },
  basket: {
    position: 'absolute',
    borderWidth: rule.major,
    borderTopWidth: 0,
    borderColor: palette.ink,
    backgroundColor: palette.surfaceAlt,
  },
  basketFlash: { backgroundColor: palette.accentTint },
  weave: { position: 'absolute', left: 0, right: 0, height: rule.major, backgroundColor: palette.ink },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: palette.ink },
  controls: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  column: { flex: 1 },
});
