# Column Copy interface

## Product mark

The logo uses the existing charcoal and paper palette with a blue scanning rule. Two brackets enclose three short text lines, directly representing the selected column. The square mark is drawn as SVG and rendered into 16, 32, 48, and 128px extension icons. The repository uses this mark above a short, left-aligned product description and download link; no decorative badges or additional marketing sections.

## Larger panel and visible scanning

The current brief calls for a more substantial reading tool, a quieter default view, and a clear view of the page during reading. The frontend-design skill is installed in `skills/frontend-design` and registered in the project guidance for later turns.

Plan: keep Paper `#fafaf9`, Ink `#252525`, Muted `#646464`, Line `#d7d7d4`, and Wash `#efefec`; reserve Laser `#4263eb` for the requested scan animation. Use the system interface face with a 20px/750 title, 15px body, and 16px/700 action labels. Increase the panel to 510px and buttons to 52px. Keep labels left aligned. Hide secondary cleanup options behind a real settings button with expanded-state semantics.

```text
Column Copy                         [settings] [close]
Drag across the text you want to read.
From [   ] to [   ]              [Redraw] [Full width]
[x] Entire page, including text below the screen
[ Read page                 ] [ Copy output        ]
Shortcut and status
Output after reading
```

Review against the brief: preserve the requested neutral palette and familiar layout. The one expressive element is the user-triggered laser; no ambient animation or ornamental badges. Hide the full panel while reading and place a compact cancel/progress control only in a margin wide enough to avoid the selected band. If there is no free margin, leave the page unobstructed and retain Escape to cancel. Restore the panel for completed, cancelled, and failed reads. Respect reduced-motion preferences and stop the animation on every exit path.

The original panel gave its most prominent button two jobs and put the actual partial-output copy action beneath a warning at a smaller size. Bright green accents and repeated height labels competed with the text the user was trying to read.

The revised panel uses two persistent, equal-width, 52px-high actions: **Read page** and **Copy output**. Read scans and populates the editor. Copy writes that output, including manual edits, without scanning again. Both remain in the same position for complete and partial results. Redraw and Full width are smaller supporting controls beside the coordinate fields.

## Visual tokens

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#fafaf9` | Panel and secondary controls |
| Ink | `#252525` | Main text, Read button, focus ring |
| Muted | `#646464` | Instructions and status |
| Line | `#d7d7d4` | Dividers and control borders |
| Wash | `#efefec` | Hover states |
| Control radius | `7px` | Inputs, editor, buttons |
| Main spacing | `8px / 12px / 16px` | Gaps, header, panel content |

Typography uses the operating system's interface font. There are no decorative badges, gradients, colored selection fills, or green accents. The selected column has thin contrasting boundaries with neutral drag handles.

## States and keyboard behavior

Read is disabled until a valid column exists. Copy is disabled until nonempty output exists. During reading or clipboard writing, settings and both actions are disabled. Status changes use an ARIA live region; the dialog exposes its busy state. Partial results keep a persistent warning and the regular Copy output button.

Enter reads when focus is outside controls and editable text. Option/Alt+Shift+R invokes the extension reading command. Escape cancels reading and restores the panel and scroll position; otherwise it dismisses open settings or closes the picker. Inputs, buttons, summary controls, and the editable output use visible focus rings. Enter inside the output is ordinary text editing.

Cleanup shows a reviewable list of common typo corrections, preserves the original blocks for undo, and does not invent replacements for unrecognized words. The editor enables native spellchecking and preserves basic formatting when copied.

Applied guidance: locally installed **design-system** and **design-critique** skills, focusing on consistent component states, hierarchy, keyboard access, and control sizing.
