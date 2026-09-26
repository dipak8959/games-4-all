import { GAMES_META } from './catalog';
import { BalloonCountScreen } from './ballooncount/BalloonCountScreen';
import { BigToSmallScreen } from './bigtosmall/BigToSmallScreen';
import { BounceBricksScreen } from './bouncebricks/BounceBricksScreen';
import { ClockTimeScreen } from './clocktime/ClockTimeScreen';
import { CodeCrackerScreen } from './codecracker/CodeCrackerScreen';
import { CountAroundScreen } from './countaround/CountAroundScreen';
import { CountingScreen } from './counting/CountingScreen';
import { DuckCrossingScreen } from './duckcrossing/DuckCrossingScreen';
import { EchoBeatScreen } from './echobeat/EchoBeatScreen';
import { PaperPlaneScreen } from './paperplane/PaperPlaneScreen';
import { CloudHopperScreen } from './cloudhopper/CloudHopperScreen';
import { FruitCatchScreen } from './fruitcatch/FruitCatchScreen';
import { HoopShotScreen } from './hoopshot/HoopShotScreen';
import { HungryWormScreen } from './hungryworm/HungryWormScreen';
import { LaneDashScreen } from './lanedash/LaneDashScreen';
import { MarketMemoryScreen } from './marketmemory/MarketMemoryScreen';
import { MazeScreen } from './maze/MazeScreen';
import { MazeTeamScreen } from './mazeteam/MazeTeamScreen';
import { MemoryGridScreen } from './memorygrid/MemoryGridScreen';
import { MemoryScreen } from './memory/MemoryScreen';
import { NumberCrunchScreen } from './numbercrunch/NumberCrunchScreen';
import { OddOneOutScreen } from './oddoneout/OddOneOutScreen';
import { PatternPlayScreen } from './patternplay/PatternPlayScreen';
import { PeekabooScreen } from './peekaboo/PeekabooScreen';
import { PuddleHopScreen } from './puddlehop/PuddleHopScreen';
import { RhymeTimeScreen } from './rhymetime/RhymeTimeScreen';
import { ShadowMatchScreen } from './shadowmatch/ShadowMatchScreen';
import { ShapeBuilderScreen } from './shapebuilder/ShapeBuilderScreen';
import { ShapesScreen } from './shapes/ShapesScreen';
import { SoftLandingScreen } from './softlanding/SoftLandingScreen';
import { StarJarScreen } from './starjar/StarJarScreen';
import { SudokuScreen } from './sudoku/SudokuScreen';
import { TallTowerScreen } from './talltower/TallTowerScreen';
import { TileSlideScreen } from './tileslide/TileSlideScreen';
import { TreasureHuntScreen } from './treasurehunt/TreasureHuntScreen';
import type { GameDefinition } from './types';
import { WaterWorksScreen } from './waterworks/WaterWorksScreen';
import { WhichCupScreen } from './whichcup/WhichCupScreen';
import { WordBuilderScreen } from './wordbuilder/WordBuilderScreen';
import { WordLadderScreen } from './wordladder/WordLadderScreen';

/**
 * Attaches each game's screen component to its catalogue metadata.
 *
 * Kept separate from `catalog.ts` (which has the actual game data —
 * titles, icons, age ranges) so that anything only needing metadata —
 * `gamesForAge`, Parent Zone's game list, tests — never has to load React
 * Native screen components just to read a title.
 */
const SCREEN_BY_ID: Readonly<Record<string, GameDefinition['Screen']>> = {
  memory: MemoryScreen,
  counting: CountingScreen,
  shapes: ShapesScreen,
  wordbuilder: WordBuilderScreen,
  sudoku: SudokuScreen,
  patternplay: PatternPlayScreen,
  numbercrunch: NumberCrunchScreen,
  shapebuilder: ShapeBuilderScreen,
  puddlehop: PuddleHopScreen,
  lanedash: LaneDashScreen,
  oddoneout: OddOneOutScreen,
  memorygrid: MemoryGridScreen,
  shadowmatch: ShadowMatchScreen,
  whichcup: WhichCupScreen,
  bigtosmall: BigToSmallScreen,
  tileslide: TileSlideScreen,
  wordladder: WordLadderScreen,
  fruitcatch: FruitCatchScreen,
  maze: MazeScreen,
  ballooncount: BalloonCountScreen,
  treasurehunt: TreasureHuntScreen,
  waterworks: WaterWorksScreen,
  bouncebricks: BounceBricksScreen,
  hungryworm: HungryWormScreen,
  peekaboo: PeekabooScreen,
  hoopshot: HoopShotScreen,
  softlanding: SoftLandingScreen,
  talltower: TallTowerScreen,
  duckcrossing: DuckCrossingScreen,
  codecracker: CodeCrackerScreen,
  clocktime: ClockTimeScreen,
  rhymetime: RhymeTimeScreen,
  marketmemory: MarketMemoryScreen,
  countaround: CountAroundScreen,
  starjar: StarJarScreen,
  mazeteam: MazeTeamScreen,
  echobeat: EchoBeatScreen,
  paperplane: PaperPlaneScreen,
  cloudhopper: CloudHopperScreen,
};

export const GAMES: readonly GameDefinition[] = GAMES_META.map((meta) => {
  const Screen = SCREEN_BY_ID[meta.id];
  if (!Screen) {
    // A catalogue entry with no matching screen is a wiring bug, not a
    // runtime condition to handle gracefully — fail loudly at startup.
    throw new Error(`No screen registered for game "${meta.id}"`);
  }
  return { ...meta, Screen };
});

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
