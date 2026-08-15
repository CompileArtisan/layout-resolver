# Adaptive Layout Engine for Multi Surface Ads

This project is a layout engine that takes one ad design and automatically arranges it for different screen sizes.

The main idea is simple. We write the ad once, and the engine figures out how it should look on a phone, kiosk, TV, banner, or any other screen.

There are no separate templates for each screen size. There are also no hardcoded rules such as "if this is a phone, do this."

## Setup

```bash
npm install
npm run dev
```

This starts the development server and gives you a local URL.

Other useful commands are:

```bash
npm run build
npm run preview
npm run typecheck
node scripts/verify.mjs
```

The verification script checks that every surface gets a valid layout, nothing overlaps, nothing goes outside the screen, important elements are not removed, and different surfaces actually produce different layouts.

## Using the Demo

Run:

```bash
npm run dev
```

Then open the URL shown in the terminal.

At the top, you can switch between the different surfaces. There is also a very small "Tight Banner" that shows what happens when there is not enough space.

You can also create your own surface by entering its width, height, and constraints.

The important part is that you can create a completely new surface without changing the code.

The panel on the right shows which layout was selected and which elements were removed, if any.

## How It Works

The basic flow is:

\[\begin{array}{c} \text{AdSpec + SurfaceProfile} \\[0.5em] \downarrow \\[0.5em] \texttt{resolveLayout()} \\[0.5em] \downarrow \\[0.5em] \text{choose a composition} \\[0.5em] \downarrow \\[0.5em] \text{try to fit everything} \\[0.5em] \downarrow \\[0.5em] \text{remove low priority elements if needed} \\[0.5em] \downarrow \\[0.5em] \text{calculate the final positions} \\[0.5em] \downarrow \\[0.5em] \boxed{\text{ResolvedLayout}} \\[0.5em] \downarrow \\[0.5em] \text{render the ad} \end{array} \]

There are two main parts.

The resolver decides where everything should go.

The renderer simply draws the result.

This means the resolver does not know anything about React or the browser. The renderer does not calculate positions.

If we wanted to use Canvas instead of normal HTML, we could create another renderer without changing the layout logic.

## Step 1: Find the Usable Area

Every surface can have a safe area.

For example, a screen might be 1080 by 1080, but we may want to keep 24 pixels away from the edges.

So the actual usable area becomes:

```text
1080 × 1080

safe area = 24px

usable area = 1032 × 1032
```

The resolver always works with this usable area.

## Step 2: Choose a Layout

The engine looks at the width and height of the usable area.

It calculates:

```text
width / height
```

Then it chooses a layout.

| Ratio        | Layout     |
| ------------ | ---------- |
| 0.85 or less | Vertical   |
| 1.6 or more  | Horizontal |
| Between them | Hybrid     |

A vertical layout puts the hero at the top and the other elements underneath it.

A horizontal layout puts the hero on the left and the other content on the right.

The hybrid layout uses the hero as a left column and puts the remaining elements in the right column.

The important thing is that the engine only looks at the shape of the screen.

It does not care whether the surface is called a phone, kiosk, TV, or anything else.

That is what allows it to work with surfaces it has never seen before.

## Step 3: Find the Minimum Size

Every element has a minimum size.

For example, a button should not become so small that someone cannot tap it.

Text should also have a minimum font size.

Images are more flexible, so the hero image and logo are allowed to become much smaller.

This gives the engine an idea of how small each element is allowed to become.

## Step 4: Give Elements Space

The engine then tries to fit all the elements into the available space.

Each element gets a priority.

For example:

```text
Priority 1 = most important
Priority 2 = less important
Priority 3 = least important
```

Elements also have weights.

A higher weight means that the element gets more of the extra space when there is room.

For example, the hero has a larger weight because we want it to be visually important.

The minimum size is still small, though.

So if space becomes limited, the hero can shrink instead of immediately causing another element to disappear.

## Step 5: Remove Things When Necessary

Sometimes the screen is simply too small to fit everything.

When that happens, the engine removes the least important element first.

For example:

```text
Branding → removed first
Secondary content → removed next
CTA → protected
Hero → protected
```

Priority 1 elements are never removed.

After removing an element, the engine tries to fit everything again.

It keeps doing this until the layout fits.

If even the most important elements cannot fit, the engine throws an error.

That is better than silently creating a broken layout.

Also, when an element is removed, it is actually removed from the layout. It does not remain hidden while still taking up space.

## Step 6: Check the Final Layout

Before returning the result, the engine checks everything again.

It makes sure:

```text
No elements overlap
No element goes outside the surface
Important elements are still present
```

If something is wrong, the resolver throws an error.

This gives us a final safety check before the layout is rendered.

## Example: retailKiosk

The retail kiosk is:

```text
1080 × 1080
```

It has a 24 pixel safe area, so the usable area is:

```text
1032 × 1032
```

The ratio is approximately:

```text
1032 / 1032 = 1
```

That means the engine chooses the hybrid layout.

The hero takes about 52 percent of the width.

The rest of the space is given to the other elements.

The same vertical layout function used for a phone is reused inside this smaller area.

The CTA has high priority, so it receives a good amount of space.

This is why the CTA appears as a wide button inside the right side of the kiosk.

There is no special rule saying "put the CTA here on retailKiosk."

It happens naturally because the same layout rules are being applied to the available space.

## TypeScript Design

The project also uses TypeScript to prevent invalid ad specifications.

### spec.ts

`TypedAdElementSpec` makes sure that each role has the correct type.

For example, a hero must be an image.

So this is invalid:

```ts
{
  role: "hero",
  type: "button"
}
```

TypeScript catches this before the program runs.

There are also runtime checks for data coming from places such as JSON or a CMS.

These checks make sure there are no duplicate IDs, unknown roles, invalid priorities, or multiple heroes and CTAs.

### surfaces.ts

`defineSurface()` checks rules that TypeScript cannot easily check.

For example, if a surface is touch only, it must have a minimum tap target.

The function catches this immediately instead of allowing a bad surface to reach the layout resolver.

### resolver.ts

The resolver produces a `ResolvedLayout`.

This is the main contract between the layout engine and the renderer.

The renderer only needs to know things like:

```text
id
x
y
width
height
fontSize
```

It does not need to know about priorities, safe areas, or the original ad specification.

## What I Would Add Next

There are a few things I would improve next.

First, I would measure the actual size of text instead of estimating it from the number of characters. This would make the system work better with different languages and writing systems.

Second, I would animate the transition when switching between surfaces instead of immediately changing from one layout to another.

Third, I would add a Canvas renderer to prove that the resolver really is independent from the rendering system.

I would also make the branding placement aware of contrast so that text and logos remain readable on different backgrounds.

Finally, I would support multiple heroes and multiple CTAs. The current system intentionally supports only one of each because the layout logic is designed around that assumption.
