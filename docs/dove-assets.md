# House garden and animated doves

Generated with the built-in imagegen tool on 2026-10-24. No CGTrader asset is included or required. The house illustration uses the approved floral preview, itself based on `public/garden/background-undangan.jpeg` supplied by the user.

## Files

- `public/garden/house-garden.webp`: 1024 × 1536 portrait background without baked-in birds.
- `public/garden/dove-sprites.webp`: 768 × 512 transparent sprite atlas, three columns and two rows. Each frame is 256 × 256 pixels. Frames in reading order: wing up, wing middle, wing down, wing lifting, landing, perched.

PNG originals were generated at 1024 × 1536 and 1536 × 1024 respectively; Sharp exported WebP at quality 88 with alpha quality 100. The atlas retains transparency.

## Motion

`GardenScene` uses two decorative, noninteractive dove layers on the cover and hero. A shared 24-second CSS timeline animates approach, landing, perching, and departure. The second bird starts three seconds later. Four flight poses cycle every 560ms; the landing pose transitions to the folded-wing perch. A subtle 3.8-second breathing motion runs while perched. Positions sit near the lower-left flowers and upper-right floral arch.

The birds share the background parallax transform. Existing scene visibility and document visibility handling pause every dove animation together, preserving synchronization. With reduced motion enabled, both birds remain perched and still. No timer, extra animation library, or 3D model is required. These are animated illustration sprites, not rigged 3D birds.

## Final prompts (built-in imagegen)

### Background edit

> Edit this approved wedding invitation background with the smallest possible change: remove BOTH white doves completely (the flying dove near the upper-right flowers and the perched dove near the lower-left flowers). Inpaint natural matching sky and flowers behind them. Preserve the exact ivory stone arch, all lavender white yellow flowers, house architecture, pathway, colors, lighting, framing and portrait aspect ratio. No birds anywhere. No text. This will be a website background with separately animated birds.

Input: the previously approved house-and-flowers preview. Transparent background: false.

### Dove atlas

> Create a production animation SPRITE SHEET on fully transparent background, landscape 1536x1024, EXACTLY THREE equal columns and TWO equal rows, six 512x512 cells, no drawn grid or labels. In every cell the SAME elegant realistic white dove SIDE PROFILE FACING RIGHT, small black eye and pale pink beak and feet, ivory feather details, softly painted romantic wedding illustration aesthetic, warm light. Same scale and body position across all six frames: body center at cell x256 y290, body from x165 to345, head around x345 y260, tail around x110 y320. Every dove entirely contained within its cell with generous transparent margins. Wings show readable real feathers. Frame order: TOP LEFT flight wing fully raised above body; TOP MIDDLE flight wing extended horizontally slightly toward viewer; TOP RIGHT flight wing swept fully down below body; BOTTOM LEFT flight wing lifting halfway upward behind body; BOTTOM MIDDLE landing pose with wings raised and braking, feet reaching down; BOTTOM RIGHT resting perched pose, both wings fully folded, feet down as if on a branch, but NO branch. No scenery, no flowers, no text, no shadows on ground. Exact consistent 3x2 cell alignment is essential. All six birds face RIGHT.

Transparent background: true.
