import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e14',
        panel: '#11151f',
        fg: '#d7dce5',
        accent: '#4ade80',
        danger: '#f87171',
        dir: '#60a5fa',
        muted: '#7a8394',
        line: '#1e2433',
      },
      fontFamily: {
        mono: ['ui-monospace', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
