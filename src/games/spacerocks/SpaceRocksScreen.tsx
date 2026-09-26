import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, playPalette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  ROCK_RADIUS,
  SHIP,
  SHIP_RADIUS,
  WAVES,
  createGame,
  progressOf,
  starsForBumps,
  step,
  tapAt,
  type Rock,
  type SpaceRocksState,
} from './logic';

/** Presses land the moment a finger does: the web otherwise holds them back. */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;
/** The ship's arrowhead: this wide either side of its nose line. */
const SHIP_HALF_WIDTH = 10;

/** Far-off stars, always in the same places. */
const STARS: readonly [number, number][] = [
  [24, 40], [90, 16], [150, 70], [230, 30], [300, 88], [40, 150], [270, 170], [18, 260], [120, 210],
  [300, 300], [60, 340], [200, 380], [280, 420], [30, 450], [140, 460], [240, 250], [100, 300], [180, 130],
];

/** A rock: two squares, one turned, outlined — a jagged, eight-pointed lump. */
function RockShape({ rock, k }: { rock: Rock; k: number }) {
  const r = ROCK_RADIUS[rock.size] * 0.78;
  const spin = (rock.id * 37) % 90;
  return (
    <View testID={`rock:${rock.size}`} style={{ position: 'absolute', left: (rock.x - r) * k, top: (rock.y - r) * k, width: r * 2 * k, height: r * 2 * k }}>
      {[0, 45].map((turn) => (
        <View key={turn} style={[styles.rock, { width: r * 2 * k, height: r * 2 * k, transform: [{ rotate: `${spin + turn}deg` }] }]} />
      ))}
    </View>
  );
}

export function SpaceRocksScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: space holds still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<SpaceRocksState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (state.complete || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds, systemRng));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.complete, paused]);

  // A wave cleared is a cheer; a bump on the shield, the gentle nudge.
  const heard = useRef({ bumps: 0, wave: 0 });
  useEffect(() => {
    if (state.bumps > heard.current.bumps) nudge(settings);
    if (state.wave > heard.current.wave) correct(settings);
    heard.current = { bumps: state.bumps, wave: state.wave };
  }, [state.bumps, state.wave, settings]);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  const onTap = useCallback(
    (x: number, y: number) => {
      if (k <= 0) return;
      tap(settings);
      setState((prev) => tapAt(prev, (x - offsetX) / k, y / k));
    },
    [k, offsetX, settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { bumps: 0, wave: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const near = state.rocks.filter((r) => Math.hypot(r.x - SHIP.x, r.y - SHIP.y) < 120).length;
  const label = state.complete
    ? 'SPACE IS CLEAR!'
    : state.pause > 0
      ? `WAVE ${state.wave + 1} OF ${WAVES} DRIFTING IN`
      : state.flash > 0
        ? 'BUMP! THE SHIELD HELD'
        : 'TAP WHERE TO SHOOT';
  const stars = starsForBumps(state.bumps);
  const shipTurn = (state.angle * 180) / Math.PI + 90;

  return (
    <GameFrame title="Space Rocks" icon="rocks" onExit={onExit} progress={progressOf(state)}>
      <StageLabel live>{label}</StageLabel>

      <Pressable
        {...PRESS_AT_ONCE}
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onPressIn={(e) => onTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        accessible
        accessibilityLabel={`Wave ${Math.min(WAVES, state.wave + 1)} of ${WAVES}. ${state.rocks.length} rocks, ${near} close to the ship. Tap where to shoot.`}
        testID={`space:${state.wave}:${state.rocks.length}`}
      >
        {k > 0 ? (
          <View testID="field" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {STARS.map(([x, y]) => (
              <View key={`${x}:${y}`} style={[styles.star, { left: x * k, top: y * k, width: 2 * k, height: 2 * k }]} />
            ))}
            {state.rocks.map((r) => (
              <RockShape key={r.id} rock={r} k={k} />
            ))}
            {state.shots.map((s, i) => (
              <View key={i} style={[styles.shot, { left: (s.x - 2.5) * k, top: (s.y - 2.5) * k, width: 5 * k, height: 5 * k }]} />
            ))}
            {state.flash > 0 ? (
              <View
                style={[
                  styles.shield,
                  {
                    left: (SHIP.x - SHIP_RADIUS - 6) * k,
                    top: (SHIP.y - SHIP_RADIUS - 6) * k,
                    width: (SHIP_RADIUS + 6) * 2 * k,
                    height: (SHIP_RADIUS + 6) * 2 * k,
                    borderRadius: (SHIP_RADIUS + 6) * k,
                  },
                ]}
              />
            ) : null}
            <View
              testID="ship"
              style={{
                position: 'absolute',
                left: (SHIP.x - SHIP_RADIUS) * k,
                top: (SHIP.y - SHIP_RADIUS) * k,
                width: SHIP_RADIUS * 2 * k,
                height: SHIP_RADIUS * 2 * k,
                alignItems: 'center',
                transform: [{ rotate: `${shipTurn}deg` }],
              }}
            >
              <View style={[styles.ship, { borderLeftWidth: SHIP_HALF_WIDTH * k, borderRightWidth: SHIP_HALF_WIDTH * k, borderBottomWidth: SHIP_RADIUS * 2 * k }]} />
            </View>
          </View>
        ) : null}
      </Pressable>

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
  stage: { flex: 1, marginBottom: rule.major * 4 },
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: palette.ink,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  star: { position: 'absolute', backgroundColor: palette.inkSoft },
  rock: { position: 'absolute', borderWidth: rule.major, borderColor: palette.bg, backgroundColor: palette.inkSoft },
  shot: { position: 'absolute', backgroundColor: playPalette.sun },
  shield: { position: 'absolute', borderWidth: rule.major, borderColor: playPalette.sky },
  ship: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.accent,
  },
});
