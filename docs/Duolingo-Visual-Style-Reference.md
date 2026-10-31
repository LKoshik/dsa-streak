# Duolingo App Visual Reference
## Research notes for the DSA Streak UI project

**Document purpose:** A practical reference for studying Duolingo's visual language and mapping selected design ideas to DSA Streak without copying Duolingo wholesale.

**Research date:** 29 October 2026  
**Evidence sources:** The user's supplied Android screenshots; official Duolingo brand guidelines and design articles; official Duolingo product articles.  
**Important limitation:** Duolingo's full production mobile design system, private design tokens, and exact animation timings are not publicly documented. This guide distinguishes public facts from observations and design interpretations. Screenshots can vary by app version, platform, course, account, experiment, and theme.

---

# 1. Executive summary

Duolingo's interface feels like a playful learning game because several systems reinforce each other:

1. **A recognizable visual language:** saturated colors, rounded shapes, bold silhouettes, friendly typography, and high-contrast controls.
2. **Tactile UI components:** lesson nodes and buttons often appear raised, with a darker lower edge that suggests thickness.
3. **A journey-shaped learning path:** lessons are nodes along a winding route, not just rows in a list.
4. **A world populated by characters and objects:** expressive characters, chests, coins, trophies, stars, and special milestones punctuate the route.
5. **Purposeful motion:** animation attracts attention, communicates state, celebrates progress, and gives characters emotion.
6. **A consistent product system:** distinct tabs and activities still need coherent hierarchy, spacing, and component behavior.
7. **Motivation through feedback:** completed actions receive immediate visual responses; larger milestones receive more substantial celebration.

For DSA Streak, the lesson is not “make everything colorful.” It is to combine **clear learning structure + tactile game objects + expressive characters + meaningful reward moments**, while keeping problem solving fast and readable.

## What the supplied screenshots show

The user's Android screenshots show:
- A compact top resource bar with streak and resource counts.
- Large, full-width section headers in different colors (green, purple, teal, light blue, pink, orange).
- A winding, alternating lesson path.
- Raised circular lesson nodes with icons such as stars, writing symbols, dumbbells, and video.
- Characters placed beside the path, with small star clusters nearby.
- Treasure chests, gold coin rewards, trophies, and numbered milestone badges.
- Locked nodes and characters subdued into dark blue-gray tones.
- A fixed bottom navigation bar with brightly colored icons and a clear active-tab outline.
- A dark background in the provided screenshots. This is an observed screenshot state, not proof that all Duolingo users or screens use the same theme.

---

# 2. Evidence and confidence labels

Use these labels when making decisions from this guide:

- **[OFFICIAL]** Explicitly described in Duolingo's public brand guidelines or official articles.
- **[SCREENSHOT]** Directly visible in the user's supplied screenshots.
- **[OBSERVATION]** A visual interpretation of the public app or supplied screenshots.
- **[INFERENCE]** A useful design hypothesis, not a confirmed internal Duolingo rule.
- **[NOT PUBLIC]** Exact internal values or implementation details not established by available public sources.

Do not treat every sampled color or visual measurement found online as an official Duolingo token. Web and app values can differ, and third-party design-system reconstructions are independent measurements.

---

# 3. Color system

## 3.1 Core and commonly reported colors

The values below are widely documented in Duolingo-related public references and align with the recognizable colors in the screenshots. The official brand site is authoritative for current brand guidance; the precise mobile UI mapping can vary.

| Common name | Hex | Typical visual role | Evidence / notes |
|---|---:|---|---|
| Feather Green | `#58CC02` | Main brand green; primary actions and successful states | [OFFICIAL/COMMONLY DOCUMENTED] |
| Macaw Blue | `#1CB0F6` | Information, active/selected states, utility actions | [COMMONLY DOCUMENTED] |
| Cardinal Red | `#FF4B4B` | Incorrect answers, errors, danger states | [COMMONLY DOCUMENTED] |
| Bee Yellow | `#FFC800` | Rewards, XP, streaks, highlights | [COMMONLY DOCUMENTED] |
| Fox Orange | `#FF9600` | Streak/fire emphasis and secondary warm accent | [COMMONLY DOCUMENTED] |
| Beetle Purple | `#CE82FF` | Playful accent and premium/alternate section treatments | [COMMONLY DOCUMENTED] |
| Pink | `#FF86D2` | Seen in some UI palettes and the supplied screenshots | [THIRD-PARTY / SCREENSHOT-ALIGNED] |
| Humpback Blue | `#2B70C9` | Deep blue accent in some documented palettes | [COMMONLY DOCUMENTED] |
| Mask Green | `#89E219` | Lighter secondary green in some brand references | [COMMONLY DOCUMENTED] |
| White / Snow | `#FFFFFF` | Light canvas, text on saturated surfaces | [OFFICIAL/COMMONLY DOCUMENTED] |
| Eel / Graphite | `#4B4B4B` or `#3C3C3C` | Main text on light backgrounds, depending on surface/reference | [VARIES BY REFERENCE] |
| Surface gray | `#F7F7F7` | Light cards and secondary surfaces in common UI references | [COMMONLY DOCUMENTED] |
| Light border / locked gray | `#E5E5E5` | Dividers, inactive tracks, locked surfaces in light UI | [COMMONLY DOCUMENTED] |

**Important:** Names and exact hex values in secondary palettes may vary by generation of the brand system and product surface. Use these as research starting points, not as a claim that every current Android component uses each exact value.

## 3.2 Colors visible in the supplied screenshots

The screenshots show the following visual categories:

| Screenshot element | Visible treatment | Design purpose |
|---|---|---|
| Section banners | Saturated green, purple, teal, sky blue, pink, orange | Give each unit/section its own identity |
| Active/available lesson nodes | Bright section-related colors, lighter face highlights, darker lower edge | Make the next action easy to spot and feel tactile |
| Completed lesson nodes | Bright faces and strong white symbols | Show progress and completion clearly |
| Locked nodes | Dark, muted blue-gray | Signal unavailable or future content without competing for attention |
| Reward coin | Yellow/gold with orange/brown center symbol | Make rewards recognizable and desirable |
| Treasure chest | Bright yellow/gold hardware, brown chest body | Create a tangible reward object |
| Character art | Multiple saturated colors against a dark environment | Add personality and visual storytelling |
| Top resources | White and saturated icon/count pairs | Keep important counts legible at small sizes |
| Bottom navigation | Bright individual icon colors; active icon surrounded by a visible outline | Keep destinations recognizable and current location clear |
| Background | Very dark blue-green / charcoal | Make saturated nodes and characters pop in the provided screenshots |

The section banner colors in the screenshots appear to include approximately:
- Bright green
- Purple/lavender
- Teal/turquoise
- Light blue
- Pink
- Orange

These are **visual descriptions**, not sampled official hex values. The screenshots alone are not a reliable source for exact color tokens because compression, display settings, and image capture affect color.

## 3.3 Color behavior and mapping principles

**Observed / inferred patterns:**
- Use saturated color to distinguish important actions and lesson families.
- Pair a bright face with a darker edge or base to give key objects depth.
- Use muted, low-contrast color for locked or inactive content, while preserving enough contrast to understand the icon.
- Reserve gold/yellow for rewards and milestone moments so it remains special.
- Keep status semantics stable: success should not randomly change color across screens.
- Section colors can add variety without changing the meaning of success, failure, or locked states.
- The top resource bar and navigation are compact; the main learning path receives most of the color and illustration.

## 3.4 Color accessibility checks

For DSA Streak adaptations:
- Never communicate “locked,” “completed,” or “incorrect” using color alone; include iconography, labels, shape, or state text.
- Check text contrast on each section banner independently.
- Test disabled nodes at real mobile size. Muted should not mean unreadable.
- Ensure active, pressed, focused, and disabled states remain distinguishable.
- Verify colors in both light and dark themes if DSA Streak continues to support both.

---

# 4. Shape language, depth, and material feel

## 4.1 Rounded geometry

**[OFFICIAL]** Duolingo's public design writing describes a move toward brighter, rounder, friendlier illustrations and rounded buttons, replacing earlier hard-edged, muted designs.

**[SCREENSHOT]** The supplied learning-path screen uses:
- Circular lesson nodes.
- Large rounded section banners.
- Rounded square resource icons.
- Rounded bottom-navigation controls.
- Softly shaped character silhouettes.
- Circular or medallion-like milestone objects.

## 4.2 Raised lesson nodes

A recurring visual treatment in the screenshots is a round “pebble” or button with visible thickness:
1. **Top face:** saturated main color.
2. **Lighter face highlights:** irregular, simple shapes that suggest gloss or a lit surface.
3. **Darker bottom lip:** a distinct base/edge, not just a diffuse drop shadow.
4. **Central icon:** large, simple, high contrast.
5. **State-specific finish:** bright for active/complete; muted for locked; special treatment for rewards or milestones.

This creates a toy-like physical object. It should not be assumed that every Duolingo screen or every node is rendered with identical 3D geometry.

### Mapping idea for DSA Streak
If adopted, the component system could define a common node base and variants:
- `lesson-default`
- `lesson-current`
- `lesson-complete`
- `lesson-locked`
- `lesson-review`
- `lesson-special`
- `reward-chest`
- `milestone-trophy`

This is a proposed mapping model, not a claim about Duolingo's internal code.

## 4.3 Extruded button treatment

Common visual pattern:
- Saturated top surface.
- Darker lower edge or “lip.”
- Rounded corners.
- Strong, legible label.
- Press state that visually compresses the object by reducing the offset/lip.

The button feels physical because the shadow is tied to the button's state. A generic blur shadow alone does not create the same effect.

## 4.4 Highlights and gloss

The screenshot nodes include pale diagonal/organic highlight shapes. These add a polished game-object feel but should be used selectively:
- Most useful on major path nodes, rewards, and special buttons.
- Avoid applying glossy highlights to every card and every text container.
- Keep the icon's silhouette readable over the highlights.
- Prefer simple reusable SVG/vector shapes over heavy blur filters where possible.

## 4.5 Locked-state material

Locked nodes in the screenshots are not merely transparent or low-opacity versions of active nodes. They have their own muted blue-gray material treatment. This lets the user read the route while keeping future activities visually secondary.

---

# 5. Typography and text hierarchy

## 5.1 Public brand typography guidance

**[OFFICIAL]** Duolingo's public brand guidelines describe:
- **Feather Bold:** a bespoke display face for short, prominent headlines.
- **DIN Next Rounded:** a rounded typeface for longer headlines, subheadings, and body copy.
- **Nunito:** a suggested substitute when DIN Next Rounded is unavailable.

The brand guidelines give detailed rules for line height, tracking, sentence length, and where each typeface should be used. The bespoke Feather face is not freely available for general reuse.

Reference: https://design.duolingo.com/identity/typography

## 5.2 Screenshot typography observations

- Section metadata is compact, uppercase, and bold (for example, section/unit numbers).
- Unit titles are larger, friendly, and easy to scan.
- Resource counts use strong weight and saturated colors.
- Node icons do most of the communication on the path; labels are not repeated on every node.
- Navigation is icon-led, reducing text density in the persistent bottom bar.


# 6. Learning-path composition

## 6.1 The path is a destination, not a list

**[OFFICIAL]** Duolingo's explanation of its home-screen redesign describes a path of pebble-shaped circles winding down the screen, with lesson levels from different skills interspersed along the journey.

Reference: https://blog.duolingo.com/new-duolingo-home-screen-design/

**[SCREENSHOT]** The supplied Android screenshots show:
- A vertical path that alternates between left and right.
- Section banners that anchor the current learning segment.
- Nodes with distinct icons for different activity types.
- Characters and rewards positioned beside the main route.
- A floating control for returning to the current/next area.
- A fixed top resource bar and fixed bottom navigation.
- A small progress/scroll indicator near the side.

## 6.2 Lesson-node types shown in the screenshots

Visible node/icon types include:
- Star lesson.
- Writing/character lesson.
- Dumbbell/practice/review lesson.
- Video lesson.
- Chest/reward.
- Coin reward.
- Trophy or numbered milestone.
- Special/legendary-looking node with a different outline or decorative effects.
- Locked variants of lesson nodes and characters.

These are visual classifications from the screenshots; the exact meaning of every icon may vary by course or product state.

## 6.3 Section banners

Observed structure:
- Large colored rounded rectangle.
- Small uppercase section/unit label.
- Larger title below.
- A separated right-side icon/action area on some units.
- Darker bottom edge or shadow.
- Banner color varies by unit in the screenshots.

Design rationale:
- Strongly identifies where the learner is.
- Provides a visual pause between groups of nodes.
- Adds variety to a long path.
- Keeps section identity visible while scrolling in some states.

## 6.4 Path rhythm and spacing

The path feels lively because it is not a perfectly straight column of identical centered circles. The nodes alternate horizontally and have varied neighbors: characters, reward objects, star clusters, and milestone items.

For a DSA adaptation:
- Keep the route easy to follow; don't let decoration obscure the next node.
- Alternate nodes with a predictable rhythm rather than random placement.
- Use special objects sparingly to punctuate progress.
- Maintain safe content padding above the fixed bottom navigation.
- Ensure scrolling, focus, and “jump to current lesson” controls don't cover important content.

---

# 7. Characters and environmental storytelling

## 7.1 Official character principles

**[OFFICIAL]** Duolingo's brand guidelines describe characters as enthusiastic, expressive, and culturally varied. Poses should communicate a clear mood or activity. The guidelines call out eyes and pupils as especially important for communicating personality.

References:
- https://design.duolingo.com/identity/imagery
- https://design.duolingo.com/illustration/characters
- https://blog.duolingo.com/building-character/

## 7.2 What the supplied screenshots show

Characters are placed directly in the learning path rather than being confined to a welcome or profile screen. They:
- Sit beside lesson nodes.
- Use varied poses and activities.
- Provide visual breaks between repeated nodes.
- Sometimes appear beside a small row of stars.
- Are bright and expressive when available.
- Become darkened/muted when locked or unavailable.

This turns the route into a small illustrated world instead of a flat lesson index.

## 7.3 Character motion and expression

**[OFFICIAL]** Duolingo has described giving characters distinct animations that can play after correct answers. It has also described using mid-lesson animations as rewards for a run of correct answers.

**[OFFICIAL]** Public guidance for Duo emphasizes small, expressive movements (such as slight wing movement, waving, or a fist pump) rather than sudden, out-of-character motion.

References:
- https://blog.duolingo.com/building-character/
- https://blog.duolingo.com/world-character-visemes/
- https://design.duolingo.com/writing/duo

## 7.4 Mapping ideas for Ember

These are optional ideas to discuss, not approved changes:
- Idle: subtle breathing/blinking or a small weight shift.
- Correct problem: quick celebration or encouraging gesture.
- Streak/milestone: larger cheer with sparkles.
- Locked content: subdued pose or silhouette.
- Rest/review state: calm or thinking pose.
- Reward chest: Ember looks toward or reacts to the reward.
- Avoid looping an elaborate animation continuously; reserve bigger motion for meaningful moments.

A mascot is more effective when the pose communicates a state, not just when it decorates the screen.

---

# 8. Reward objects and milestone language

## 8.1 Objects visible in the screenshots

- **Treasure chest:** a tangible reward container; yellow/gold fittings and brown body.
- **Gold coin:** bright yellow/gold circular object with a central star.
- **Trophy:** a clear symbol of achievement.
- **Star clusters:** small secondary signals of a level or character's reward/status.
- **Numbered badge/medallion:** marks a milestone or level-specific reward.
- **Special node treatment:** a different outline and decorative strokes around a special activity.

## 8.2 Why objects work

**[OBSERVATION]** These objects create a visual vocabulary beyond text and progress bars.

**[INFERENCE]** A chest implies something to discover; a coin implies a collectible; a trophy implies accomplishment; stars imply rating or mastery. This makes the reward's meaning recognizable before the user reads a label.

## 8.3 Reward hierarchy for DSA Streak

If adopted, consider three levels:
1. **Micro-feedback:** a small check pop or XP label after an individual problem.
2. **Session reward:** a brief completion panel, small chest/coin animation, or character celebration.
3. **Milestone reward:** a distinct trophy, badge, path landmark, or larger celebration for a meaningful achievement.

Do not make every solved problem trigger a large celebration. If every event is maximal, nothing feels special and the learning loop becomes slow.

---

# 9. Animation and motion reference

## 9.1 What public sources establish

**[OFFICIAL]** Duolingo's art/design article says illustration and animation are used to direct attention. Motion can attract the eye; animated skill icons became attention-grabbing, and a playful minimalist style helps the team create many visuals without losing coherence.

Reference: https://blog.duolingo.com/shape-language-duolingos-art-style/

**[OFFICIAL]** Duolingo's 2024 announcement about acquiring Hobbes described animation and motion design as ways to amplify game mechanics and make products more fun and engaging.

Reference: https://investors.duolingo.com/news-releases/news-release-details/duolingo-doubles-down-design-and-animation-acquisition-hobbes

**[OFFICIAL]** Its public articles discuss character reactions, mid-lesson animations, chest-opening experiences, streak milestone animations, and lesson-end celebrations.

References:
- https://blog.duolingo.com/building-character/
- https://blog.duolingo.com/product-highlights/
- https://blog.duolingo.com/world-character-visemes/

**[NOT PUBLIC]** Exact durations, cubic-bezier curves, amplitudes, delays, and internal animation identifiers for the current Android learning path are not established by these sources. The screenshots are static, so they cannot prove exact motion behavior.

## 9.2 Animation categories inferred from the app and official articles

| Category | Likely/observed visual behavior | User purpose | DSA Streak adaptation |
|---|---|---|---|
| Idle character motion | Small blink, head/eye movement, subtle body shift | Make characters feel alive without dominating | Rare, low-amplitude Ember idle |
| Attention animation | Animated lesson/skill icon or a subtle pulse | Draw the eye toward a next action | Pulse only on the current/next lesson |
| Button press | Visual compression / pressed feedback | Make taps feel immediate and physical | Reduce node/button lip while pressed |
| Correct-answer reaction | Character-specific celebratory pose or motion | Reinforce success | Brief Ember celebration after a solve |
| Streak milestone | More prominent celebratory animation | Mark a meaningful achievement | Reserve for streak and practice milestones |
| Chest opening | A reveal animation around a reward object | Make the reward feel tangible | Chest lid/reveal only when a reward is earned |
| Lesson-end celebration | A short sequence, potentially including character(s) | Close a session with a sense of completion | Short session-end reward sequence |
| Mid-lesson interstitial | Character/visual moment after a series of correct answers | Break up repetitive exercises and reward a streak | Optional after a small meaningful sequence |
| Progress transition | Progress fills or node state changes | Show that the system registered progress | Animate progress fill when it changes |
| Path navigation | Scroll or move to the relevant part of the route | Maintain orientation | Keep motion short and avoid fighting manual scroll |

These are categories for design planning, not a complete inventory of current Duolingo animations.

## 9.3 Motion principles

1. **Every animation needs a purpose:** feedback, orientation, emphasis, expression, or reward.
2. **Use hierarchy:** small actions get small motion; milestones earn larger motion.
3. **Keep the interaction responsive:** the tap should register immediately, even if the celebration continues.
4. **Use anticipation and payoff sparingly:** a small scale-up, overshoot, and settle can make a reward feel satisfying, but repeated large bounces become tiring.
5. **Avoid perpetual attention competition:** idle animations should not constantly compete with the current lesson.
6. **Coordinate simultaneous effects:** avoid a node pulse, mascot loop, sparkle loop, floating bubble, and reward animation all running at full intensity together.
7. **Support reduced motion:** provide a calmer mode and ensure state changes remain understandable without animation.
8. **Keep performance in mind:** use transforms and opacity where possible; avoid large, repeated blur filters on low-end devices.
9. **Test on real mobile devices:** verify frame pacing, battery use, scroll smoothness, and interaction latency.

## 9.4 Suggested motion tokens for a future DSA Streak discussion

These are **starting points for prototyping, not measured Duolingo values**.

| Token | Suggested starting range | Use |
|---|---:|---|
| `tap-press` | 80–140 ms | Press/release feedback |
| `micro-feedback` | 160–260 ms | Checkmark, small icon pop |
| `ui-transition` | 180–300 ms | Small panel or selection transition |
| `reward-reveal` | 350–700 ms | Chest or reward reveal |
| `character-reaction` | 400–900 ms | A short expressive pose |
| `milestone-celebration` | 700–1400 ms | Major achievement, used sparingly |
| `ambient-loop` | Context-dependent | Low-amplitude idle character motion |

Do not apply these timings without testing and agreeing on the feel.

---

# 10. Sound as part of feedback

Duolingo's public product and design writing covers animation and audio/animation coordination in some learning experiences. Exact sound assets, playback rules, and sound-effect timings are not a universal public design token set.

For DSA Streak, sound can be considered as a separate design layer:
- A soft confirmation for completing a problem.
- A distinct reward sound for a milestone.
- A restrained error cue.
- A setting to turn sound off.
- No essential information communicated by sound alone.
- Avoid using copied proprietary Duolingo audio assets; design or license original sounds for DSA Streak.

Sound design should be discussed separately from visual changes, especially if the current request is focused on UI styling.

---

# 11. Top resource bar and bottom navigation

## 11.1 Top bar

**[SCREENSHOT]** The supplied screens use a compact row of resource indicators:
- Streak icon and number.
- A second flame-like count/icon.
- Blue gem/resource and number.
- Pink energy/heart-like resource and number.

The exact meaning of every resource is app-state dependent; this guide records the visible layout, not an assertion about all Duolingo accounts.

Visual properties:
- Icons carry meaning, with counts beside them.
- Color helps distinguish resource categories.
- The bar is visually quieter than the learning path.
- Spacing allows the icons and numbers to be read at a glance.

## 11.2 Bottom navigation

**[SCREENSHOT]** The bottom bar contains multiple colorful icon-only destinations. The selected destination has a visible rounded rectangular outline; inactive destinations remain colorful rather than being reduced entirely to gray.

Design lessons:
- Make the selected destination unmistakable.
- Keep icons large enough for touch interaction.
- Keep the navigation stable while the path scrolls.
- Preserve bottom safe-area space.
- Use tooltips/labels or accessibility labels where icons alone may not be understandable.

---

# 12. Screen-level component map

| Screen region / object | Visual anatomy | State variants to plan | Possible DSA Streak mapping |
|---|---|---|---|
| Top resource bar | Small icons + colored numeric counts | Default, changed count, depleted/low resource | Streak, XP, lives/energy if applicable |
| Section banner | Saturated rounded panel, metadata + title, sometimes trailing action | Several section colors, expanded/compact if needed | Topic / roadmap unit header |
| Learning-path node | Circular face, highlights, darker base, center icon | Current, available, completed, locked, review, special | Problem, lesson, review activity |
| Character | Expressive illustration in a pose | Idle, correct, thinking, celebration, locked | Ember or original supporting characters |
| Treasure chest | Chest body, bright hardware, lock | Locked, available, opening, opened | Milestone/reward |
| Coin | Gold circular collectible with center symbol | Available, earned, collected | XP or reward |
| Trophy / badge | Distinct silhouette and strong center symbol/number | Earned, upcoming, locked | Topic mastery or streak milestone |
| Star cluster | Small repeated star shapes | Empty, earned, partial rating | Session performance / mastery |
| Current-node bubble | Small floating callout around the next action | Start, continue, hidden | Next recommended problem |
| Bottom navigation | Persistent icon row with active outline | Active/inactive, focus | Existing app tabs |
| Scroll-to-current control | Floating rounded square with arrow | Scroll down/up, visible/hidden | Return to current task |

---

# 13. Layout, layering, and responsive behavior

Exact current Duolingo Android dimensions are not publicly established in this research. Do not copy pixel values from screenshots without measuring them at the target device density.

Observed principles:
- The learning path occupies most of the vertical viewport.
- The top bar remains separate from the scrolling content.
- The bottom navigation remains fixed.
- The section banner sits at the top of the visible path area.
- A side-positioned scroll cue can help users orient themselves in a long route.
- Characters and rewards occupy space around the route without replacing the main node sequence.

Implementation checklist for DSA Streak:
- Account for status and navigation system bars.
- Keep the last visible node clear of the bottom navigation.
- Prevent floating controls from obscuring nodes.
- Keep tap targets comfortably sized.
- Test on narrow and wide phones, font scaling, and long topic names.
- Check that section colors and title text remain readable across all variants.
- Ensure scroll-to-current behavior respects reduced-motion settings and does not unexpectedly interrupt manual scrolling.

---

# 14. Cohesion across screens

**[OFFICIAL]** In its core-tabs redesign article, Duolingo explains that independently developed tabs had drifted in header size, typography hierarchy, and spacing. The redesign aimed for more consistency and intentionality while allowing each tab to retain its own identity.

Reference: https://blog.duolingo.com/core-tabs-redesign/

Practical lesson:
- Share a common spacing and typography system.
- Reuse component behavior.
- Allow different sections to have their own accent colors without changing the whole app's structure.
- Review components together at screen level, not just in isolation.
- Test the final UI on real devices and across relevant states.

For DSA Streak, this means a new node or reward should look like it belongs to the same app as Home, Stats, Settings, and problem-solving screens—even if it has a distinct color or illustration.

---

# 15. Accessibility and usability guardrails

For any Duolingo-inspired work:
- Support reduced motion.
- Maintain readable text contrast on every section color.
- Do not rely only on color for state.
- Ensure icons have meaningful accessible names.
- Preserve keyboard/focus behavior where applicable.
- Make touch targets comfortable.
- Avoid distracting loops near code/problem content.
- Ensure animation does not delay problem interaction.
- Provide a clear non-animated result for reward reveals.
- Test on low-end Android hardware and under system font scaling.

Playfulness should make learning easier to return to, not make the problem itself harder to read.

---



# 18. Sources

The links below are the main public sources used to build this guide. Official Duolingo pages are prioritized. The screenshots provided by the user were also used for observations of the Android learning path.

1. **Duolingo — Shape language and art style**  
   https://blog.duolingo.com/shape-language-duolingos-art-style/  
   Explains the move toward bold, bright, rounded illustrations and how illustration/animation attract attention.

2. **Duolingo — The science behind the home-screen redesign**  
   https://blog.duolingo.com/new-duolingo-home-screen-design/  
   Explains the path-based lesson structure and the use of pebble-shaped nodes.

3. **Duolingo — Typography brand guidelines**  
   https://design.duolingo.com/identity/typography  
   Public guidance for Feather Bold, DIN Next Rounded, and Nunito as a substitute.

4. **Duolingo — Imagery brand guidelines**  
   https://design.duolingo.com/identity/imagery  
   Explains the importance of illustration, Duo, expressive characters, and photography.

5. **Duolingo — Character illustration guidelines**  
   https://design.duolingo.com/illustration/characters  
   Public guidance on expressive character design, especially eyes and facial expression.

6. **Duolingo — Building character**  
   https://blog.duolingo.com/building-character/  
   Describes character placement in exercises, distinct correct-answer animations, and mid-lesson animation rewards.

7. **Duolingo — How Duolingo animates its world characters**  
   https://blog.duolingo.com/world-character-visemes/  
   Describes state-machine-based character animation, mouth shapes, idle behavior, and response reactions.

8. **Duolingo — Core tabs redesign**  
   https://blog.duolingo.com/core-tabs-redesign/  
   Explains the need for consistency across tabs, hierarchy, spacing, and exploration of different visual directions.

9. **Duolingo — 2025 product highlights**  
   https://blog.duolingo.com/product-highlights/  
   Mentions chest experience, animated widgets, streak milestone animations, friend streaks, and lesson-end animations.

10. **Duolingo, Inc. — Acquisition of Hobbes**  
    https://investors.duolingo.com/news-releases/news-release-details/duolingo-doubles-down-design-and-animation-acquisition-hobbes  
    Official announcement describing the role of motion design in amplifying game mechanics and making the product more engaging.

11. **Apple Developer — Behind the Design: Duolingo**  
    https://developer.apple.com/news/?id=jhkvppla  
    A product-design interview about motivation, game mechanics, characters, and the learning path.

12. **Duolingo — Duo's voice and tone**  
    https://design.duolingo.com/writing/duo  
    Defines Duo's intended personality and behavioral boundaries.

13. **Duolingo — Illustrating Duo / character redesign article**  
    https://blog.duolingo.com/reshaping-duo/  
    Discusses the importance of silhouette, consistent identity, and movement in mascot design.

## Secondary palette cross-check (not official)
A community-maintained reference lists common Duolingo color names and hex values:
https://github.com/virgiliojr94/duolingo-ux-reference

Use this only as a secondary cross-check. It is not a substitute for current official app tokens.

---

# 19. Final principle

The most useful lesson from Duolingo is not a particular shade of green or a bouncy button. It is the coordination of:

**A clear learning journey + tactile objects + expressive characters + meaningful rewards + purposeful motion + consistent components.**

For DSA Streak, adapt these principles to programming practice and retain its own identity. Discuss each visual direction first, agree on the scope, then implement one feature at a time.
