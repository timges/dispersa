/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CSSProperties, ReactNode } from 'react'
import React, { useCallback, useMemo, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TokenType = {
  id: string
  name: string
  value: string
  preview: ReactNode
}

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const MONO = 'var(--sl-font-mono, var(--sl-font-system-mono, ui-monospace, monospace))'
const SANS = 'var(--sl-font, var(--sl-font-system, system-ui, sans-serif))'

const COLOR = {
  text: 'var(--sl-color-text, #e0e0e0)',
  muted: 'var(--sl-color-gray-3, #888)',
  surface: 'var(--sl-color-gray-6, #1e1e2e)',
  cardBg: 'var(--sl-color-bg-inline-code, #2a2d3a)',
  border: 'var(--sl-color-hairline-light, rgba(255,255,255,0.08))',
  accent: 'var(--sl-color-accent, hsl(272, 80%, 65%))',
  accentHigh: 'var(--sl-color-accent-high, hsl(272, 80%, 85%))',
  jsonKey: 'var(--dispersa-syntax-key)',
  jsonString: 'var(--dispersa-syntax-string)',
  jsonNumber: 'var(--dispersa-syntax-number)',
  jsonPunct: 'var(--dispersa-syntax-punct)',
} as const

/* ------------------------------------------------------------------ */
/*  Interactive preview components                                     */
/* ------------------------------------------------------------------ */

function DurationPreview() {
  const [active, setActive] = useState(false)
  const toggle = () => setActive((a) => !a)

  return (
    <div
      style={{ width: '100%', display: 'grid', placeItems: 'center left', cursor: 'pointer' }}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Replay duration animation"
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: COLOR.accent,
          transform: active ? 'translateX(80px)' : 'translateX(0)',
          transition: 'transform 200ms ease',
        }}
      />
    </div>
  )
}

function CubicBezierPreview() {
  return (
    <svg
      width="100%"
      height={64}
      viewBox="0 0 120 64"
      role="img"
      aria-label="Cubic bezier easing curve"
    >
      <defs>
        <linearGradient id="ttg-curve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLOR.accent} />
          <stop offset="100%" stopColor={COLOR.accentHigh} />
        </linearGradient>
      </defs>
      <line x1={8} y1={56} x2={112} y2={56} stroke={COLOR.border} strokeWidth={1} />
      <line x1={8} y1={8} x2={8} y2={56} stroke={COLOR.border} strokeWidth={1} />
      <path
        d="M 8 56 C 56 56, 72 8, 112 8"
        fill="none"
        stroke="url(#ttg-curve)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={8} cy={56} r={3} fill={COLOR.accent} />
      <circle cx={112} cy={8} r={3} fill={COLOR.accentHigh} />
    </svg>
  )
}

function TransitionPreview() {
  const [active, setActive] = useState(false)
  const toggle = () => setActive((a) => !a)

  return (
    <div
      style={{ width: '100%', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Toggle transition preview"
    >
      <div
        style={{
          width: active ? 48 : 32,
          height: active ? 32 : 48,
          borderRadius: active ? 24 : 8,
          background: active ? COLOR.accent : 'var(--sl-color-gray-5, #3d4152)',
          transition: 'all 200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Token data                                                         */
/* ------------------------------------------------------------------ */

const PRIMITIVE_TYPES: TokenType[] = [
  {
    id: 'color',
    name: 'color',
    value: `"$value": {
  "colorSpace": "srgb",
  "components": [0.2, 0.4, 0.9]
}`,
    preview: (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 6,
          background: 'rgb(51, 102, 230)',
        }}
      />
    ),
  },
  {
    id: 'dimension',
    name: 'dimension',
    value: `"$value": { "value": 16, "unit": "px" }`,
    preview: (
      <div style={{ width: '100%', display: 'grid', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            width: 64,
            height: 8,
            borderRadius: 4,
            background: COLOR.accent,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: COLOR.muted,
          }}
        >
          16px
        </span>
      </div>
    ),
  },
  {
    id: 'fontFamily',
    name: 'fontFamily',
    value: `"$value": ["Inter", "sans-serif"]`,
    preview: (
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1.3,
          color: COLOR.text,
        }}
      >
        Aa Bb Cc 123
      </div>
    ),
  },
  {
    id: 'fontWeight',
    name: 'fontWeight',
    value: `"$value": 700`,
    preview: (
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: COLOR.text }}>Bold</span>
        <span style={{ fontSize: 12, fontWeight: 400, color: COLOR.muted }}>weight 700</span>
      </div>
    ),
  },
  {
    id: 'duration',
    name: 'duration',
    value: `"$value": { "value": 200, "unit": "ms" }`,
    preview: <DurationPreview />,
  },
  {
    id: 'cubicBezier',
    name: 'cubicBezier',
    value: `"$value": [0.4, 0, 0.2, 1]`,
    preview: <CubicBezierPreview />,
  },
  {
    id: 'number',
    name: 'number',
    value: `"$value": 1.5`,
    preview: (
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          fontFamily: MONO,
          color: COLOR.text,
          letterSpacing: '-0.02em',
        }}
      >
        1.5
      </div>
    ),
  },
]

const COMPOSITE_TYPES: TokenType[] = [
  {
    id: 'shadow',
    name: 'shadow',
    value: `"$value": {
  "color": {
    "colorSpace": "srgb",
    "components": [0, 0, 0],
    "alpha": 0.25
  },
  "offsetX": { "value": 0, "unit": "px" },
  "offsetY": { "value": 4, "unit": "px" },
  "blur": { "value": 8, "unit": "px" },
  "spread": { "value": 0, "unit": "px" }
}`,
    preview: (
      <div
        style={{
          width: '70%',
          height: '60%',
          borderRadius: 8,
          background: 'var(--sl-color-gray-5, #2a2d3a)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          margin: 'auto',
        }}
      />
    ),
  },
  {
    id: 'typography',
    name: 'typography',
    value: `"$value": {
  "fontFamily": ["Inter", "sans-serif"],
  "fontSize": { "value": 16, "unit": "px" },
  "fontWeight": 600,
  "letterSpacing": { "value": 0, "unit": "px" },
  "lineHeight": 1.5
}`,
    preview: (
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600 }}>
          Heading
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: COLOR.muted }}>
          Body text sample at 16px
        </span>
      </div>
    ),
  },
  {
    id: 'border',
    name: 'border',
    value: `"$value": {
  "color": {
    "colorSpace": "srgb",
    "components": [0.49, 0.23, 0.93]
  },
  "width": { "value": 2, "unit": "px" },
  "style": "solid"
}`,
    preview: (
      <div
        style={{
          width: '80%',
          height: '55%',
          borderRadius: 8,
          border: '2px solid var(--sl-color-accent, #7c3aed)',
          margin: 'auto',
        }}
      />
    ),
  },
  {
    id: 'strokeStyle',
    name: 'strokeStyle',
    value: `"$value": {
  "dashArray": [
    { "value": 4, "unit": "px" },
    { "value": 2, "unit": "px" }
  ],
  "lineCap": "round"
}`,
    preview: (
      <svg width="100%" height={40} style={{ overflow: 'visible' }}>
        <line
          x1={0}
          y1={12}
          x2="100%"
          y2={12}
          stroke={COLOR.accent}
          strokeWidth={2}
          strokeDasharray="8 4"
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={28}
          x2="100%"
          y2={28}
          stroke={COLOR.accentHigh}
          strokeWidth={2}
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'transition',
    name: 'transition',
    value: `"$value": {
  "duration": { "value": 200, "unit": "ms" },
  "delay": { "value": 0, "unit": "ms" },
  "timingFunction": [0.25, 0.1, 0.25, 1]
}`,
    preview: <TransitionPreview />,
  },
  {
    id: 'gradient',
    name: 'gradient',
    value: `"$value": [
  {
    "color": {
      "colorSpace": "srgb",
      "components": [0.49, 0.23, 0.93]
    },
    "position": 0
  },
  {
    "color": {
      "colorSpace": "srgb",
      "components": [0.02, 0.71, 0.83]
    },
    "position": 1
  }
]`,
    preview: (
      <div
        style={{
          width: '80%',
          height: '60%',
          borderRadius: 8,
          background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)',
          margin: 'auto',
        }}
      />
    ),
  },
]

/* ------------------------------------------------------------------ */
/*  JSON syntax highlighting                                           */
/* ------------------------------------------------------------------ */

function SyntaxBlock({ code }: { code: string }) {
  const highlighted = useMemo(
    () =>
      code.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {colorize(line)}
          {'\n'}
        </React.Fragment>
      )),
    [code],
  )

  return (
    <pre
      style={{
        margin: 0,
        padding: '10px 14px',
        fontFamily: MONO,
        fontSize: 11.5,
        lineHeight: 1.6,
        color: COLOR.muted,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: 'var(--dispersa-syntax-bg)',
        borderTop: `1px solid ${COLOR.border}`,
        borderRadius: '0 0 10px 10px',
        height: '100%',
      }}
    >
      {highlighted}
    </pre>
  )
}

function colorize(line: string): ReactNode[] {
  const parts: ReactNode[] = []
  let rest = line
  let k = 0

  const keyMatch = rest.match(/^(\s*)"([\w$]+)"(:)/)
  if (keyMatch) {
    parts.push(<span key={k++}>{keyMatch[1]}</span>)
    parts.push(
      <span key={k++} style={{ color: COLOR.jsonKey }}>
        &quot;{keyMatch[2]}&quot;
      </span>,
    )
    parts.push(
      <span key={k++} style={{ color: COLOR.jsonPunct }}>
        :
      </span>,
    )
    rest = rest.slice(keyMatch[0].length)
  }

  const tokens = rest.split(/("(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|[{}[\],:]|\.{3})/g)
  for (const token of tokens) {
    if (!token) {
      continue
    }
    if (/^"/.test(token)) {
      parts.push(
        <span key={k++} style={{ color: COLOR.jsonString }}>
          {token}
        </span>,
      )
    } else if (/^\d/.test(token)) {
      parts.push(
        <span key={k++} style={{ color: COLOR.jsonNumber }}>
          {token}
        </span>,
      )
    } else if (/^[{}[\],:]$/.test(token)) {
      parts.push(
        <span key={k++} style={{ color: COLOR.jsonPunct }}>
          {token}
        </span>,
      )
    } else if (token === '...') {
      parts.push(
        <span key={k++} style={{ color: COLOR.muted }}>
          ...
        </span>,
      )
    } else {
      parts.push(<span key={k++}>{token}</span>)
    }
  }

  return parts
}

/* ------------------------------------------------------------------ */
/*  Card component                                                     */
/* ------------------------------------------------------------------ */

const cardLinkStyle: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'grid',
  borderRadius: 10,
}

const cardStyle: CSSProperties = {
  border: `1px solid ${COLOR.border}`,
  borderRadius: 10,
  overflow: 'hidden',
  background: COLOR.cardBg,
  transition: 'outline-color 0.2s ease',
  cursor: 'pointer',
  marginTop: 0,
  display: 'grid',
  gridTemplateRows: 'auto auto 1fr',
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: -1,
}

const previewStyle: CSSProperties = {
  height: 100,
  padding: 16,
  display: 'grid',
  placeItems: 'center',
  background: COLOR.surface,
}

const nameStyle: CSSProperties = {
  padding: '10px 14px 0',
  fontFamily: MONO,
  fontWeight: 600,
  fontSize: 14,
  color: COLOR.text,
}

function TokenCard({ token }: { token: TokenType }) {
  const [hovered, setHovered] = useState(false)
  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  const style = useMemo<CSSProperties>(
    () => ({ ...cardStyle, outlineColor: hovered ? COLOR.accent : 'transparent' }),
    [hovered],
  )

  return (
    <a href={`#${token.id.toLowerCase()}`} style={cardLinkStyle}>
      <div style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div style={previewStyle}>{token.preview}</div>
        <div style={nameStyle}>{token.name}</div>
        <SyntaxBlock code={token.value} />
      </div>
    </a>
  )
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

const sectionStyle: CSSProperties = {
  marginBottom: 32,
}

const sectionHeaderStyle: CSSProperties = {
  borderTop: '2px solid transparent',
  borderImage: 'var(--dispersa-spectrum, linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4)) 1',
  paddingTop: 12,
  marginBottom: 16,
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 15,
  color: COLOR.text,
  margin: 0,
  letterSpacing: '0.01em',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 14,
}

function Section({ title, tokens }: { title: string; tokens: TokenType[] }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h3 style={sectionTitleStyle}>{title}</h3>
      </div>
      <div style={gridStyle}>
        {tokens.map((t) => (
          <TokenCard key={t.id} token={t} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export default function TokenTypeGallery() {
  return (
    <div style={{ color: COLOR.text }}>
      <Section title="Primitive Types" tokens={PRIMITIVE_TYPES} />
      <Section title="Composite Types" tokens={COMPOSITE_TYPES} />
    </div>
  )
}
