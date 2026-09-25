Design System Builder — Build Specification
You are an expert full-stack TypeScript engineer and UI/design-system engineer.

Build a production-quality web application and CLI package called Design System Builder.

The purpose of the product is simple:

Allow a user to visually configure a small semantic colour and typography system, preview it against a real Markdown document, and then generate a single bunx command that reproduces exactly the same theme locally.

The most important principle is:

What the user sees in the web preview must be exactly what the CLI generates.

Do not create separate colour-generation logic for the web application and CLI. They must share the same core theme engine and the same ThemeOptions data structure.

1. Technology
   Use:

Svelte

TypeScript

Tailwind CSS

SVX / mdsvex for Markdown/Svelte Markdown content

Bun-compatible CLI/package

Modern CSS with OKLCH

CSS custom properties

Google Fonts support

Prefer a clean monorepo/package structure if appropriate.

The implementation should be strongly typed.

Do not introduce unnecessary frameworks or dependencies.

2. Product flow
   The complete user journey is:

Open web application
↓
Choose semantic colours
↓
Choose optional Google Fonts
↓
Assign font roles
↓
See live Markdown preview
↓
Adjust colours/fonts
↓
Preview updates immediately
↓
Generate CLI command
↓
Copy bunx command
↓
Run command locally
↓
CLI decodes theme configuration
↓
Shared theme engine generates CSS
↓
Theme directory is created in cwd

The web application is primarily a visual theme builder.

The CLI is the export/generation mechanism.

3. Core semantic colour model
   Do NOT use generic primary and secondary as the main application colour model.

The user-facing theme has exactly these semantic colour anchors:

base
alt
prose
accent

brand-primary
brand-secondary

traffic-stop
traffic-warning
traffic-ok

These are the colours the user selects in the UI.

The purpose of each is:

base
The fundamental document/page background.

Examples:

body background

main Markdown canvas

alt
An alternative surface to base.

Examples:

cards

code blocks

table rows

callouts

alternating surfaces

modal-like surfaces

prose
The main readable content colour.

Examples:

paragraphs

headings

normal Markdown text

accent
The general attention/interaction colour.

Examples:

links

highlights

selected elements

interactive details

brand-primary
The primary brand colour.

brand-secondary
The secondary brand colour.

traffic-stop
Negative/error/destructive state.

Examples:

errors

failed operations

destructive warnings

traffic-warning
Caution/pending/attention state.

Examples:

warnings

pending states

things requiring attention

traffic-ok
Positive/success/confirmed state.

Examples:

success

completed

valid/OK states

Do not rename these semantic concepts without a strong technical reason.

4. Human-facing colour selection
   The user should NOT select raw RGB, HSL or OKLCH values.

The UI should use a Tailwind-style colour palette.

For example:

blue-50
blue-100
blue-200
blue-300
blue-400
blue-500
blue-600
blue-700
blue-800
blue-900
blue-950

and equivalent Tailwind palette families such as:

red
orange
amber
yellow
lime
green
emerald
teal
cyan
sky
blue
indigo
violet
purple
fuchsia
pink
rose
slate
gray
zinc
neutral
stone

The exact supported palette should be based on the Tailwind version used by the project.

The UI should present colour choices in a clear visual dropdown/select rather than requiring the user to type colour names.

For example:

Brand Primary
[ blue-600 ▼ ]

Brand Secondary
[ violet-600 ▼ ]

Ideally show a small colour swatch alongside each option.

The user should be able to visually understand the palette without knowing the underlying colour values.

5. OKLCH colour engine
   The selected Tailwind colour is the semantic colour anchor.

Internally, resolve the selected colour to its OKLCH representation.

Then generate a complete semantic colour scale from it.

For example:

--accent-50
--accent-100
--accent-200
--accent-300
--accent-400
--accent-500
--accent-600
--accent-700
--accent-800
--accent-900
--accent-950

The same applies to every semantic colour:

base
alt
prose
accent
brand-primary
brand-secondary
traffic-stop
traffic-warning
traffic-ok

The selected source colour should be treated as the anchor for the generated scale.

The generated palette should be based on OKLCH, not HSL.

The purpose of OKLCH is to produce perceptually useful lighter/darker variations while retaining the source colour's hue/chroma characteristics.

Do not simply generate arbitrary RGB shades.

Do not hardcode separate palettes for each semantic colour.

Create a reusable colour-generation function.

Conceptually:

generateScale(sourceColour): ColourScale

where:

type ColourScale = {
50: string;
100: string;
200: string;
300: string;
400: string;
500: string;
600: string;
700: string;
800: string;
900: string;
950: string;
};

The implementation should intelligently handle very light and very dark source colours.

Avoid simply adding/subtracting the same lightness value without considering the source colour.

Where appropriate, adjust chroma toward the extremes to avoid unpleasant neon/pastel artefacts.

The exact OKLCH interpolation algorithm should be implemented centrally in the shared theme engine.

6. Generated CSS variables
   The generated root CSS should expose semantic colour scales.

For example:

:root {
--base-50: ...;
--base-100: ...;
--base-200: ...;
--base-300: ...;
--base-400: ...;
--base-500: ...;
--base-600: ...;
--base-700: ...;
--base-800: ...;
--base-900: ...;
--base-950: ...;

--alt-50: ...;
--alt-100: ...;

--prose-50: ...;

--accent-50: ...;

--brand-primary-50: ...;
--brand-secondary-50: ...;

--traffic-stop-50: ...;
--traffic-warning-50: ...;
--traffic-ok-50: ...;
}

Use the same naming convention consistently.

Do not expose raw OKLCH implementation details to normal application components.

The semantic variables are the application's design-system API.

7. Typography
   The builder should support optional Google Fonts.

The user should be able to provide/select Google Fonts and assign them to semantic font roles:

font-primary
font-secondary
font-tertiary

font-tertiary is optional.

If tertiary is not populated, use an appropriate fallback.

The application should allow drag-and-drop assignment of font roles to Markdown elements.

At minimum support:

H1
H2
H3
H4
H5
H6
P
UL / OL
Blockquote
Code / Pre

The user should be able to configure which semantic font role is used for which elements.

For example:

Font Primary
H1
H2
H3
P

Font Secondary
Blockquote

Font Tertiary
Code
Pre

The UI should make this visually intuitive.

Do not force the user to configure every element.

If a role is not assigned, use sensible defaults.

8. Typography fallback
   Use the typography approach from:

https://github.com/markdowncss/splendor/blob/master/css/splendor.css

as the baseline/fallback for Markdown typography.

Do not blindly copy the entire stylesheet.

Inspect the actual stylesheet and reproduce the relevant typography/font-stack behaviour where appropriate.

If the user supplies custom fonts, those should override the relevant fallback.

The implementation should not hallucinate what Splendor contains. Inspect the source during implementation.

9. Markdown preview
   The web application must contain a real Markdown document preview.

This should not be a collection of isolated component examples.

Create a representative Markdown document containing, at minimum:

H1

H2

H3

paragraphs

bold

italic

links

unordered lists

ordered lists

nested lists

blockquotes

inline code

code blocks

tables

horizontal rules

images/placeholders where useful

ordered content

callout-like content if supported

long-form text

The preview should look like a genuine Markdown article/document.

Use SVX/mdsvex as appropriate.

The preview must update immediately when the user changes:

any colour

any font

any font assignment

The preview is the core validation mechanism for the product.

10. UI design
    Keep the UI clean and focused.

Do not build a giant enterprise design-system dashboard.

This is a relatively simple tool.

A useful layout is:

┌─────────────────────────────────────────────────────────────┐
│ Design System Builder │
├───────────────────┬─────────────────────────────────────────┤
│ │ │
│ COLOURS │ │
│ │ │
│ Base [▼] │ │
│ Alt [▼] │ MARKDOWN PREVIEW │
│ Prose [▼] │ │
│ Accent [▼] │ # Heading │
│ │ │
│ Brand Primary [▼] │ Markdown content... │
│ Brand Secondary │ │
│ [▼] │ ## Heading │
│ │ │
│ Stop [▼] │ > Blockquote │
│ Warning [▼] │ │
│ OK [▼] │ | Table | Table | │
│ │ │
│ TYPOGRAPHY │ `js                          │
│                   │          code                            │
│ Primary    [▼]    │          ` │
│ Secondary [▼] │ │
│ Tertiary [▼] │ │
│ │ │
│ FONT ASSIGNMENTS │ │
│ │ │
│ drag/drop │ │
│ │ │
├───────────────────┴─────────────────────────────────────────┤
│ [ Generate bunx command ] │
└─────────────────────────────────────────────────────────────┘

Responsive behaviour should be considered.

On smaller screens, the configuration panel can stack above the preview.

11. ThemeOptions
    Create one canonical internal configuration type.

For example:

export interface ThemeOptions {
version: number;

colors: {
base: string;
alt: string;
prose: string;
accent: string;

    brandPrimary: string;
    brandSecondary: string;

    trafficStop: string;
    trafficWarning: string;
    trafficOk: string;

};

fonts: {
primary?: string;
secondary?: string;
tertiary?: string;
};

fontAssignments?: {
h1?: "primary" | "secondary" | "tertiary";
h2?: "primary" | "secondary" | "tertiary";
h3?: "primary" | "secondary" | "tertiary";
h4?: "primary" | "secondary" | "tertiary";
h5?: "primary" | "secondary" | "tertiary";
h6?: "primary" | "secondary" | "tertiary";
p?: "primary" | "secondary" | "tertiary";
list?: "primary" | "secondary" | "tertiary";
blockquote?: "primary" | "secondary" | "tertiary";
code?: "primary" | "secondary" | "tertiary";
};
}

This object is the canonical representation of a theme.

The web application preview must consume this object.

The CLI must ultimately consume this exact same object.

The colour engine must consume this object.

The CSS generator must consume this object.

Do not create multiple incompatible representations.

12. CLI command generation
    Do NOT generate a huge CLI command containing every colour as a separate flag.

Instead use a single encoded theme argument.

The pipeline is:

ThemeOptions
↓
JSON.stringify()
↓
compress
↓
base64url encode
↓
single CLI argument

The web UI should generate:

bunx your-package --theme="ENCODED_PAYLOAD"

The actual package name should be configurable/defined by the implementation.

The command should be easy to copy with one button.

Provide appropriate feedback when the command has been copied.

13. CLI decoding
    The CLI must reverse the exact process:

--theme argument
↓
base64url decode
↓
decompress
↓
JSON.parse()
↓
ThemeOptions

Then pass that object directly into the shared theme engine.

Do not duplicate theme parsing logic.

Do not have the CLI independently interpret colour names.

Do not have the CLI independently generate the colour scales.

The web application and CLI must use the same core package.

14. Payload versioning
    The encoded payload must be versioned.

For example:

{
"version": 1,
"colors": {
...
},
"fonts": {
...
},
"fontAssignments": {
...
}
}

The CLI should reject unsupported versions with a clear error.

The architecture should allow future payload versions without breaking the entire system.

15. Compression / encoding
    Use a sensible compression method that works in the browser and Bun/Node CLI environment.

The encoding must be:

URL-safe

shell-friendly

deterministic

reversible

Prefer Base64URL rather than ordinary Base64.

Avoid unnecessary special characters.

The generated command should look like:

bunx your-package --theme="eyJ2ZXJzaW9uIjox..."

Do not expose the raw JSON in the command.

16. CLI output
    When the user runs:

bunx your-package --theme="..."

the package should generate a theme directory in the current working directory.

For example:

theme/
├── root.css
├── fonts.css
├── base.css
├── typography.css
├── markdown.css
└── index.css

The exact directory name should be configurable if useful, but a sensible default is required.

17. Generated root.css
    root.css should contain the generated semantic CSS variables.

It should contain the generated colour scales and font variables.

For example:

:root {
--base-50: ...;
--base-100: ...;

--alt-50: ...;

--prose-50: ...;

--accent-50: ...;

--brand-primary-50: ...;
--brand-secondary-50: ...;

--traffic-stop-50: ...;
--traffic-warning-50: ...;
--traffic-ok-50: ...;

--font-primary: ...;
--font-secondary: ...;
--font-tertiary: ...;
}

18. Generated fonts.css
    Generate the appropriate Google Font imports and font-family declarations.

For example:

:root {
--font-primary: "Inter", sans-serif;
--font-secondary: "Playfair Display", serif;
}

If a font isn't configured, use the fallback.

Do not generate an invalid font-tertiary declaration when no tertiary font exists.

19. Generated base.css
    Handle global document elements such as:

html
body
main
section
a
img
hr

Use semantic generated variables.

Do not hardcode arbitrary colours.

20. Generated typography.css
    Handle:

h1
h2
h3
h4
h5
h6
p
strong
em

and apply the configured semantic font assignments.

Use generated colour variables.

21. Generated markdown.css
    Handle Markdown-specific structures:

blockquote
ul
ol
li
table
thead
tbody
tr
th
td
pre
code

Use the semantic colour system.

For example:

blockquote {
color: var(--prose-700);
background: var(--alt-100);
border-left-color: var(--accent-500);
}

Do not hardcode Tailwind colours into the generated CSS.

22. Tailwind integration
    Tailwind is a dependency of the generated environment.

The generated theme should expose the semantic variables in a way that Tailwind can consume.

The application should NOT generate components that depend directly on:

blue-600
red-500
etc.

Instead, Tailwind should ultimately point at the generated semantic CSS variables.

The design system should allow usage conceptually like:

<div class="bg-brand-primary">

or the equivalent Tailwind-compatible variable-based implementation.

The exact Tailwind integration should follow the current Tailwind version's recommended configuration approach.

Do not assume an old Tailwind configuration model if the current version uses a different mechanism.

The important requirement is:

Tailwind utilities must consume the generated semantic theme rather than bypassing it.

A user should also be able to manually customise the generated Tailwind mappings afterwards.

23. Shared package architecture
    Do not duplicate business logic.

Prefer an architecture similar to:

packages/
├── core/
│ ├── colors/
│ │ ├── tailwind-palette.ts
│ │ ├── resolve-color.ts
│ │ ├── oklch.ts
│ │ └── generate-scale.ts
│ │
│ ├── typography/
│ │ └── fonts.ts
│ │
│ ├── theme/
│ │ ├── types.ts
│ │ ├── defaults.ts
│ │ └── generate-theme.ts
│ │
│ └── serialization/
│ └── theme-payload.ts
│
├── web/
│ └── ...
│
└── cli/
└── ...

The exact directory structure may differ, but preserve the separation of concerns.

The important architectural boundary is:

              shared core
             /           \
            /             \
         web               cli

24. Critical consistency requirement
    The following must all use the same theme engine:

Web preview
CLI
CSS generator
OKLCH scale generation
Theme validation

There must be a single source of truth.

If the web preview displays:

accent-200

then the CLI-generated CSS must produce the exact same value.

Do not approximate the preview separately.

25. Theme defaults
    Provide a sensible default theme so the application works immediately.

For example:

base zinc-50
alt zinc-100
prose zinc-900
accent blue-600
brand-primary blue-600
brand-secondary violet-600
traffic-stop red-600
traffic-warning amber-500
traffic-ok green-600

Use sensible default fonts based on the chosen fallback typography system.

The user should land on a populated, attractive Markdown preview without needing to configure anything.

26. User experience requirements
    The application should feel fast.

Changing a colour should immediately update:

page background

text

headings

links

blockquotes

tables

code

callouts

relevant status elements

Changing a font should immediately update the preview.

Changing a font assignment should immediately update the affected elements.

Do not require a "Save" button for preview changes.

27. Validation
    The CLI must validate decoded payloads.

Handle:

missing payload

invalid Base64URL

decompression failure

invalid JSON

unsupported version

missing required colour values

invalid Tailwind colour names

invalid font assignments

Errors should be concise and useful.

For example:

Invalid theme payload.
The supplied theme was encoded with an unsupported version.

Do not dump stack traces to normal users.

28. Testing
    Create tests for the shared core engine.

At minimum test:

Colour resolution
blue-600 → correct source colour
red-500 → correct source colour

OKLCH generation
Ensure:

generated values are valid CSS colours

scales are ordered appropriately

source anchor is preserved

very light colours don't produce invalid values

very dark colours don't produce invalid values

Serialization
Test:

ThemeOptions
→ JSON
→ compress
→ base64url
→ decode
→ decompress
→ JSON
→ ThemeOptions

The final object must match the original.

CLI
Test that a generated payload creates the expected files.

Web preview
Ensure the preview uses the same generated values as the core engine.

29. Accessibility
    The generated system should consider readable contrast.

At minimum, provide warnings in the builder if obvious combinations have poor contrast.

Do not silently change the user's chosen colours.

For example:

⚠ Prose on Base may have low contrast.

The user should remain in control.

The system may suggest alternatives but should not unexpectedly modify the selected theme.

30. Don't over-engineer the product
    This is intentionally a focused tool.

Do NOT build:

a full Figma replacement

a complex component library

dozens of semantic colour categories

a CMS

user accounts unless required

databases unless required

collaboration features

complex theme management

unnecessary state-management frameworks

The central product is:

Choose colours
Choose fonts
Preview Markdown
Generate theme

Keep the UI and architecture focused on that.

31. Definition of done
    The implementation is complete when a user can:

Open the Svelte web application.

See a fully populated Markdown document.

Select Tailwind-style colours for:

base

alt

prose

accent

brand-primary

brand-secondary

traffic-stop

traffic-warning

traffic-ok

See the Markdown preview update immediately.

Select Google Fonts.

Assign fonts to Markdown elements using the font-primary/font-secondary/font-tertiary roles.

See typography update immediately.

Generate a single bunx command.

Copy that command.

Run it in another directory/project.

Have the CLI decode the payload.

Reconstruct the exact same ThemeOptions.

Run the shared OKLCH theme engine.

Generate the theme CSS directory.

Have the generated CSS contain the same semantic colour system displayed in the web application.

Have Tailwind consume the generated semantic variables.

Be able to manually customise the generated CSS/Tailwind configuration afterwards.

32. Most important implementation principles
    Keep these principles in mind throughout the implementation:

One configuration
ThemeOptions

is the canonical theme representation.

One colour engine
The OKLCH engine exists once and is shared.

One preview
The web preview uses the same generated values that the CLI will generate.

Human-friendly inputs
The user thinks:

blue-600

not:

oklch(0.623 0.214 259.815)

Semantic output
The generated application thinks:

--brand-primary-500
--traffic-warning-100
--prose-700

not:

--blue-600
--amber-100

Simple theme API
The theme author only needs to understand:

base
alt
prose
accent
brand-primary
brand-secondary
traffic-stop
traffic-warning
traffic-ok

Portable configuration
The web application serialises the complete configuration into a versioned compressed Base64URL payload.

Exact reproduction
The CLI must reproduce the same theme the user saw in the browser.

Final implementation instruction
Build the application in a way that is actually runnable, not as a conceptual mockup.

Start by establishing the shared ThemeOptions type and core colour/OKLCH engine.

Then build the web preview around that engine.

Then build the CLI around the same engine.

Do not build the web application first with fake colour logic and retrofit the CLI afterwards.

The architecture should make it impossible for the web preview and CLI to silently diverge.

Where implementation details are unspecified, choose the simplest modern solution that preserves the architecture and product principles above.
