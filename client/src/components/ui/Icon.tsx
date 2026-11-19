/**
 * Icons per Name – so können Inhalte (JSON) Icons verwenden, ohne Code zu ändern.
 * Neue Icons: unten in ICONS eintragen (Namen von https://lucide.dev).
 */
import {
  Award, BadgeCheck, Blocks, BookOpen, Braces, Brain, Bug, Calculator, CalendarDays, Code, CodeXml, Coffee, Crown, Dices,
  Flag, Flame, Footprints, Gamepad2, Gem, GitBranch, Globe, GraduationCap, Heart, Joystick, Keyboard, Layers, Lightbulb, List,
  ListOrdered, Lock, MessageCircle, Moon, MousePointerClick, Paintbrush, Palette, PartyPopper, PenTool, Puzzle, Repeat,
  Rocket, Route, Shapes, Shuffle, Sparkles, SquareFunction, SquareTerminal, Sprout, Star, Swords, Target, Terminal, Trophy,
  Turtle, Variable, WandSparkles, Zap, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  award: Award, "badge-check": BadgeCheck, blocks: Blocks, book: BookOpen, braces: Braces, brain: Brain, bug: Bug,
  calculator: Calculator, calendar: CalendarDays, code: Code, "code-xml": CodeXml, coffee: Coffee, crown: Crown, dice: Dices,
  flag: Flag, flame: Flame, footprints: Footprints, gamepad: Gamepad2, gem: Gem, branch: GitBranch, globe: Globe,
  graduation: GraduationCap, heart: Heart, joystick: Joystick, keyboard: Keyboard, layers: Layers, lightbulb: Lightbulb,
  list: List, "list-ordered": ListOrdered, lock: Lock, message: MessageCircle, moon: Moon, click: MousePointerClick,
  brush: Paintbrush, palette: Palette, party: PartyPopper, pen: PenTool, puzzle: Puzzle, repeat: Repeat, rocket: Rocket,
  route: Route, shapes: Shapes, shuffle: Shuffle, sparkles: Sparkles, function: SquareFunction, terminal: SquareTerminal,
  sprout: Sprout, star: Star, swords: Swords, target: Target, prompt: Terminal, trophy: Trophy, turtle: Turtle,
  variable: Variable, wand: WandSparkles, zap: Zap,
};

export function Icon({ name, className, size = 22, strokeWidth = 2.4 }: { name: string; className?: string; size?: number; strokeWidth?: number }) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
