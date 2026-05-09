# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual\three-pane-layout.spec.ts >> Three-pane layout >> app three-pane matches mockup-three-pane baseline
- Location: tests\visual\three-pane-layout.spec.ts:21:7

# Error details

```
Error: Baseline not found at C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager\tests\visual\__screenshots__\baseline\chromium\mockup-three-pane.png. Run "npm run test:visual:baseline" first.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e7]: 🌸
        - generic [ref=e8]:
          - generic [ref=e9]: Sakura Studio
          - generic [ref=e10]: Prompt Manager
      - generic [ref=e12]:
        - img [ref=e13]
        - textbox "Search…" [ref=e15]
      - navigation "Category filters" [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Home
            - img [ref=e20]
          - list [ref=e22]:
            - listitem [ref=e23]:
              - button "◈ All Prompts 0" [ref=e24]:
                - generic [ref=e25]:
                  - generic [ref=e26]: ◈
                  - generic [ref=e27]: All Prompts
                - generic [ref=e28]: "0"
            - listitem [ref=e29]:
              - button "♡ Favorites 0" [ref=e30]:
                - generic [ref=e31]:
                  - generic [ref=e32]: ♡
                  - generic [ref=e33]: Favorites
                - generic [ref=e34]: "0"
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Categories
            - img [ref=e38]
          - list [ref=e40]:
            - listitem [ref=e41]:
              - button "▦ Templates 0" [ref=e42]:
                - generic [ref=e43]:
                  - generic [ref=e44]: ▦
                  - generic [ref=e45]: Templates
                - generic [ref=e46]: "0"
            - listitem [ref=e47]:
              - button "◎ Planes 0" [ref=e48]:
                - generic [ref=e49]:
                  - generic [ref=e50]: ◎
                  - generic [ref=e51]: Planes
                - generic [ref=e52]: "0"
            - listitem [ref=e53]:
              - button "⬡ Salida de data 0" [ref=e54]:
                - generic [ref=e55]:
                  - generic [ref=e56]: ⬡
                  - generic [ref=e57]: Salida de data
                - generic [ref=e58]: "0"
            - listitem [ref=e59]:
              - button "⌥ Agentes 0" [ref=e60]:
                - generic [ref=e61]:
                  - generic [ref=e62]: ⌥
                  - generic [ref=e63]: Agentes
                - generic [ref=e64]: "0"
            - listitem [ref=e65]:
              - button "✦ Skills 0" [ref=e66]:
                - generic [ref=e67]:
                  - generic [ref=e68]: ✦
                  - generic [ref=e69]: Skills
                - generic [ref=e70]: "0"
      - generic [ref=e71]:
        - img [ref=e72]
        - generic [ref=e204]: In flow
    - main [ref=e205]:
      - generic [ref=e206]:
        - generic [ref=e207]:
          - generic [ref=e208]: All Prompts
          - generic [ref=e209]:
            - generic [ref=e210]: 0 prompts
            - generic [ref=e211]:
              - generic [ref=e212]: 🌸
              - generic [ref=e213]: with variables
        - link "+" [ref=e214] [cursor=pointer]:
          - /url: /items/new
      - generic [ref=e216]:
        - generic [ref=e217]: 🌸
        - generic [ref=e218]: No items yet.
    - generic [ref=e220]: Select an item to view
  - button "Open Next.js Dev Tools" [ref=e226] [cursor=pointer]:
    - img [ref=e227]
  - alert [ref=e230]
```

# Test source

```ts
  1  | /**
  2  |  * Comparison helper for visual regression against mockup baselines.
  3  |  *
  4  |  * Reads a baseline PNG from tests/visual/__screenshots__/baseline/<project>/
  5  |  * and compares it against a screenshot buffer using pixelmatch.
  6  |  */
  7  | 
  8  | import { expect } from "@playwright/test";
  9  | import { PNG } from "pngjs";
  10 | import pixelmatch from "pixelmatch";
  11 | import * as fs from "fs";
  12 | import * as path from "path";
  13 | 
  14 | const BASELINE_DIR = path.resolve(__dirname, "..", "__screenshots__/baseline");
  15 | 
  16 | export interface BaselineComparisonOptions {
  17 |   maxDiffPixelRatio?: number;
  18 |   threshold?: number;
  19 | }
  20 | 
  21 | /**
  22 |  * Asserts that a screenshot buffer matches the corresponding baseline PNG
  23 |  * within the given tolerance.
  24 |  *
  25 |  * @param screenshot - Buffer of the app screenshot (from locator.screenshot())
  26 |  * @param baselineName - Baseline filename without extension (e.g., "mockup-sidebar")
  27 |  * @param project - Playwright project name (e.g., "chromium-1440")
  28 |  * @param options - Comparison options
  29 |  */
  30 | export async function toMatchBaseline(
  31 |   screenshot: Buffer,
  32 |   baselineName: string,
  33 |   project: string,
  34 |   options: BaselineComparisonOptions = {}
  35 | ): Promise<void> {
  36 |   const { maxDiffPixelRatio = 0.02, threshold = 0.2 } = options;
  37 |   const baselinePath = path.join(BASELINE_DIR, project, `${baselineName}.png`);
  38 | 
  39 |   if (!fs.existsSync(baselinePath)) {
> 40 |     throw new Error(
     |           ^ Error: Baseline not found at C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager\tests\visual\__screenshots__\baseline\chromium\mockup-three-pane.png. Run "npm run test:visual:baseline" first.
  41 |       `Baseline not found at ${baselinePath}. Run "npm run test:visual:baseline" first.`
  42 |     );
  43 |   }
  44 | 
  45 |   const baselineData = fs.readFileSync(baselinePath);
  46 |   const baselineImg = PNG.sync.read(baselineData);
  47 |   const screenshotImg = PNG.sync.read(screenshot);
  48 | 
  49 |   if (baselineImg.width !== screenshotImg.width || baselineImg.height !== screenshotImg.height) {
  50 |     throw new Error(
  51 |       `Dimension mismatch: baseline ${baselineImg.width}x${baselineImg.height} vs screenshot ${screenshotImg.width}x${screenshotImg.height}`
  52 |     );
  53 |   }
  54 | 
  55 |   const diff = new PNG({ width: baselineImg.width, height: baselineImg.height });
  56 |   const numDiffPixels = pixelmatch(
  57 |     baselineImg.data,
  58 |     screenshotImg.data,
  59 |     diff.data,
  60 |     baselineImg.width,
  61 |     baselineImg.height,
  62 |     { threshold }
  63 |   );
  64 | 
  65 |   const totalPixels = baselineImg.width * baselineImg.height;
  66 |   const ratio = numDiffPixels / totalPixels;
  67 | 
  68 |   expect(
  69 |     ratio,
  70 |     `Image differs from baseline "${baselineName}" by ${(ratio * 100).toFixed(2)}%, max allowed is ${(maxDiffPixelRatio * 100).toFixed(2)}% (${numDiffPixels}/${totalPixels} pixels differ)`
  71 |   ).toBeLessThanOrEqual(maxDiffPixelRatio);
  72 | }
```