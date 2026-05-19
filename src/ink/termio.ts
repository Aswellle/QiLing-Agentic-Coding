/**
 * ANSI Parser Module — adapted from CC's ink/termio.ts
 *
 * Re-exports Parser and all semantic types from the termio sub-modules.
 * The parser produces structured actions (not raw strings) from ANSI input.
 */

export type {
  Action,
  Color,
  CursorAction,
  CursorDirection,
  EraseAction,
  Grapheme,
  LinkAction,
  ModeAction,
  NamedColor,
  ScrollAction,
  TextSegment,
  TextStyle,
  TitleAction,
  UnderlineStyle,
} from './termio/types.js'
export { colorsEqual, defaultStyle, stylesEqual } from './termio/types.js'
