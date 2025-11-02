# Fonts Folder

Place your custom font files (.woff, .woff2, .ttf, .otf) in this directory.

## Usage

### Option 1: Using local fonts with next/font/local

Update `src/app/layout.tsx`:

```tsx
import localFont from 'next/font/local';

const myFont = localFont({
  src: [
    {
      path: '../../public/fonts/MyFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/MyFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
});

// Then use: className={myFont.variable}
```

### Option 2: Using @font-face in globals.css

Add to `src/app/globals.css`:

```css
@font-face {
  font-family: 'MyCustomFont';
  src: url('/fonts/MyFont-Regular.woff2') format('woff2'),
       url('/fonts/MyFont-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MyCustomFont';
  src: url('/fonts/MyFont-Bold.woff2') format('woff2'),
       url('/fonts/MyFont-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

Then update `tailwind.config.ts`:

```ts
fontFamily: {
  sans: ['MyCustomFont', 'system-ui', 'sans-serif'],
},
```

## Recommended Font Formats

- **WOFF2** (preferred): Best compression, modern browser support
- **WOFF**: Fallback for older browsers
- **TTF/OTF**: Source format (convert to WOFF/WOFF2 for web use)

## Font Conversion

Use tools like:
- [Font Squirrel Webfont Generator](https://www.fontsquirrel.com/tools/webfont-generator)
- [Transfonter](https://transfonter.org/)
- [CloudConvert](https://cloudconvert.com/ttf-to-woff2)

## Current Setup

The project currently uses Inter font loaded from Google Fonts CDN in `src/app/layout.tsx`.
You can replace this with local fonts using the methods above.

