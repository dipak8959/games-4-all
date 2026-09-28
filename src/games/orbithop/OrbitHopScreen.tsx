import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { type } from '../../theme/type';
import { systemRng } from '../../util/random';
import { Shape as ShapeMark } from '../shapes/Shape';
import { nextLevel, type GameScreenProps } from '../types';
import {
  CENTRE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  RINGS,
  ROCK,
  SATELLITE,
  STAR,
  STARS,
  createGame,
  hop,
  position,
  starsForBumps,
  step,
  type OrbitHopState,
} from './logic';

const PLANET = 30;

export function OrbitHopScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: everything holds still in its orbit.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<OrbitHopState>(() => createGame(systemRng, level));
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

  // A star is a cheer; a bump on the shield, the gentle nudge.
  const heard = useRef({ collected: 0, bumps: 0 });
  useEffect(() => {
    if (state.collected > heard.current.collected) correct(settings);
    if (state.bumps > heard.current.bumps) nudge(settings);
    heard.current = { collected: state.collected, bumps: state.bumps };
  }, [state.collected, state.bumps, settings]);

  const onHop = useCallback(
    (way: -1 | 1) => {
      tap(settings);
      setState((prev) => hop(prev, way));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = { collected: 0, bumps: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const sat = position(state.ring, state.angle);
  const star = position(state.star.ring, state.star.angle);
  const stars = starsForBumps(state.bumps);
  const ringName = ['inner', 'middle', 'outer'][state.ring];

  return (
    <GameFrame title="Orbit Hop" icon="orbit" onExit={onExit} progress={state.collected / STARS}>
      <StageLabel live>{state.shield > 0 ? 'BUMP! THE SHIELD HELD' : 'HOP IN AND OUT · COLLECT THE STARS'}</StageLabel>
      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        accessible
        accessibilityLabel={`On the ${ringName} ring. The star is on the ${['inner', 'middle', 'outer'][state.star.ring]} ring. ${state.collected} of ${STARS} stars.`}
      >
        {k > 0 ? (
          <View testID="field" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {RINGS.map((r) => (
              <View key={r} style={[styles.ring, { left: (CENTRE.x - r) * k, top: (CENTRE.y - r) * k, width: r * 2 * k, height: r * 2 * k, borderRadius: r * k }]} />
            ))}
            <View style={[styles.planet, { left: (CENTRE.x - PLANET) * k, top: (CENTRE.y - PLANET) * k, width: PLANET * 2 * k, height: PLANET * 2 * k, borderRadius: PLANET * k }]} />
            <View testID={`star:${state.star.ring}:${state.star.angle.toFixed(3)}`} style={{ position: 'absolute', left: (star.x - STAR) * k, top: (star.y - STAR) * k }}>
              <ShapeMark shape="star" color="sun" size={STAR * 2 * k} />
            </View>
            {state.rocks.map((r, i) => {
              const at = position(r.ring, r.angle);
              return (
                <View key={i} testID={`rock:${r.ring}:${r.angle.toFixed(3)}`} style={{ position: 'absolute', left: (at.x - ROCK) * k, top: (at.y - ROCK) * k, width: ROCK * 2 * k, height: ROCK * 2 * k }}>
                  {[0, 45].map((turn) => (
                    <View key={turn} style={[styles.rock, { width: ROCK * 2 * k, height: ROCK * 2 * k, transform: [{ rotate: `${turn + i * 20}deg` }] }]} />
                  ))}
                </View>
              );
            })}
            {state.shield > 0 ? (
              <View style={[styles.shield, { left: (sat.x - SATELLITE - 6) * k, top: (sat.y - SATELLITE - 6) * k, width: (SATELLITE + 6) * 2 * k, height: (SATELLITE + 6) * 2 * k, borderRadius: (SATELLITE + 6) * k }]} />
            ) : null}
            <View
              testID={`sat:${state.ring}:${state.angle.toFixed(3)}`}
              style={[styles.satellite, { left: (sat.x - SATELLITE) * k, top: (sat.y - SATELLITE) * k, width: SATELLITE * 2 * k, height: SATELLITE * 2 * k, transform: [{ rotate: `${(-state.angle * 180) / Math.PI}deg` }] }]}
            />
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.buttons}>
        <AnswerButton size={130} accessibilityLabel="Hop in" disabled={state.ring === 0} onPress={() => onHop(-1)}>
          <Text style={type.h3}>IN</Text>
        </AnswerButton>
        <AnswerButton size={130} accessibilityLabel="Hop out" disabled={state.ring === RINGS.length - 1} onPress={() => onHop(1)}>
          <Text style={type.h3}>OUT</Text>
        </AnswerButton>
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
  stage: { flex: 1 },
  field: { position: 'absolute', top: 0, backgroundColor: palette.ink, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: rule.hair, borderColor: palette.inkSoft },
  planet: { position: 'absolute', backgroundColor: palette.inkSoft },
  rock: { position: 'absolute', borderWidth: rule.major, borderColor: palette.bg, backgroundColor: palette.inkSoft },
  satellite: { position: 'absolute', backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.bg },
  shield: { position: 'absolute', borderWidth: rule.major, borderColor: palette.bg },
  buttons: { justifyContent: 'center', paddingVertical: 8 },
});
