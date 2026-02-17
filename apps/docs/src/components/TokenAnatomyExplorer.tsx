/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Data model                                                        */
/* ------------------------------------------------------------------ */

type ColorValue = {
  colorSpace: string
  components: number[]
  alpha?: number
}

type TokenExample = {
  path: string[]
  groupType: string
  type: string
  value: ColorValue
  description: string
  deprecated: string | boolean
  extensions: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/*  Token example                                                     */
/* ------------------------------------------------------------------ */

const TOKEN: TokenExample = {
  path: ['color', 'brand', 'primary'],
  groupType: 'color',
  type: 'color',
  value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.9] },
  description: 'Primary brand color used for CTAs and links',
  deprecated: 'Use color.brand.blue instead',
  extensions: { 'com.figma': { styleId: 'S:abc123' } },
}

/* ------------------------------------------------------------------ */
/*  Property annotations                                              */
/* ------------------------------------------------------------------ */

const PROPERTY_INFO: Record<string, string> = {
  $type: 'Defines the token type. Can be set on a group so all children inherit it.',
  $value: 'The token value. Format depends on the type (color object, dimension, etc.).',
  $description: 'Human-readable documentation. Appears in generated code comments.',
  $deprecated: 'Marks the token as deprecated. Can be a boolean or a message string.',
  $extensions: 'Vendor-specific metadata. Reserved for tooling, not part of the core spec.',
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const s = {
  container: {
    fontFamily: 'var(--sl-font, system-ui)',
    borderRadius: 10,
    border: '1px solid var(--sl-color-gray-5, #333)',
    overflow: 'hidden',
    maxWidth: '100%',
    background: 'var(--sl-color-gray-6, #1a1a2e)',
  } satisfies CSSProperties,

  body: {
    padding: '20px 20px 24px',
    display: 'grid',
    gap: 20,
  } satisfies CSSProperties,

  breadcrumb: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 8,
    alignItems: 'center',
  } satisfies CSSProperties,

  breadcrumbPath: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  breadcrumbSegment: {
    fontFamily: 'var(--sl-font-mono, monospace)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--sl-color-accent-high, #c4b5fd)',
    padding: '2px 8px',
    borderRadius: 4,
    background: 'var(--sl-color-accent-low, rgba(124,58,237,0.1))',
  } satisfies CSSProperties,

  breadcrumbSep: {
    color: 'var(--sl-color-gray-3, #666)',
    fontSize: 11,
    userSelect: 'none',
  } satisfies CSSProperties,

  breadcrumbLabel: {
    fontSize: 11,
    color: 'var(--sl-color-gray-3, #888)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } satisfies CSSProperties,

  card: {
    borderRadius: 8,
    border: '1px solid var(--sl-color-gray-5, #333)',
    overflow: 'hidden',
  } satisfies CSSProperties,

  row: (highlighted: boolean): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: 0,
    borderBottom: '1px solid var(--sl-color-gray-5, #2a2a3e)',
    transition: 'background 0.15s ease',
    background: highlighted ? 'var(--sl-color-accent-low, rgba(124,58,237,0.08))' : 'transparent',
    cursor: 'default',
    marginTop: 0,
  }),

  rowLabel: {
    padding: '12px 14px',
    borderRight: '1px solid var(--sl-color-gray-5, #2a2a3e)',
    display: 'grid',
    alignContent: 'start',
    gap: 4,
  } satisfies CSSProperties,

  rowContent: {
    padding: '12px 14px',
    display: 'grid',
    gap: 6,
    alignContent: 'start',
    minWidth: 0,
  } satisfies CSSProperties,

  propName: {
    fontFamily: 'var(--sl-font-mono, monospace)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--sl-color-accent-high, #c4b5fd)',
  } satisfies CSSProperties,

  badge: (variant: 'required' | 'inherited' | 'optional'): CSSProperties => {
    const map: Record<string, { bg: string; fg: string }> = {
      required: { bg: 'rgba(16, 185, 129, 0.12)', fg: 'rgb(52, 211, 153)' },
      inherited: { bg: 'rgba(251, 191, 36, 0.12)', fg: 'rgb(251, 191, 36)' },
      optional: {
        bg: 'var(--sl-color-gray-5, rgba(255,255,255,0.06))',
        fg: 'var(--sl-color-gray-3, #888)',
      },
    }
    const c = map[variant] ?? map.optional
    return {
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '1px 6px',
      borderRadius: 4,
      background: c.bg,
      color: c.fg,
      justifySelf: 'start',
    }
  },

  valueText: {
    fontFamily: 'var(--sl-font-mono, monospace)',
    fontSize: 13,
    color: 'var(--sl-color-white, #e2e8f0)',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    marginTop: 0,
  } satisfies CSSProperties,

  description: {
    fontSize: 12,
    color: 'var(--sl-color-gray-3, #888)',
    lineHeight: 1.4,
  } satisfies CSSProperties,

  inlineCode: {
    fontFamily: 'var(--sl-font-mono, monospace)',
    fontSize: 12,
    color: 'var(--sl-color-gray-2, #aaa)',
    background: 'var(--sl-color-gray-5, rgba(255,255,255,0.06))',
    padding: '1px 5px',
    borderRadius: 3,
  } satisfies CSSProperties,

  previewRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 10,
    alignItems: 'center',
  } satisfies CSSProperties,
}

// Pre-computed style variants to avoid object creation per render
const ROW_STYLE = {
  default: s.row(false),
  highlighted: s.row(true),
  defaultLast: { ...s.row(false), borderBottom: 'none' },
  highlightedLast: { ...s.row(true), borderBottom: 'none' },
}

const BADGE = {
  required: s.badge('required'),
  inherited: s.badge('inherited'),
  optional: s.badge('optional'),
}

/* ------------------------------------------------------------------ */
/*  Color preview                                                     */
/* ------------------------------------------------------------------ */

function srgbToHex(components: number[], alpha?: number): string {
  const hex = components
    .map((c) => {
      const v = Math.round(Math.max(0, Math.min(1, c)) * 255)
      return v.toString(16).padStart(2, '0')
    })
    .join('')
  const a =
    alpha != null && alpha < 1
      ? Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
      : ''
  return `#${hex}${a}`
}

function ColorPreview({ value }: { value: ColorValue }) {
  const hex = srgbToHex(value.components, value.alpha)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <pre
        style={{
          ...s.valueText,
          fontSize: 12,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
      <div style={s.previewRow}>
        <div
          role="img"
          aria-label={`Color swatch: ${hex}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: hex,
            border: '1px solid var(--sl-color-gray-5, rgba(255,255,255,0.12))',
            boxShadow: `0 0 12px ${hex}44`,
          }}
        />
        <span style={{ ...s.description, fontFamily: 'var(--sl-font-mono, monospace)' }}>
          {hex}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function PathBreadcrumb({ path }: { path: string[] }) {
  return (
    <nav aria-label="Token path" style={s.breadcrumb}>
      <span style={s.breadcrumbLabel}>Example Path</span>
      <div style={s.breadcrumbPath}>
        {path.map((segment, i) => (
          <span key={segment} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={s.breadcrumbSep}>{'>'}</span>}
            <span style={s.breadcrumbSegment}>{segment}</span>
          </span>
        ))}
        <span style={{ ...s.breadcrumbSep, marginLeft: 4 }}>
          = <span style={{ ...s.inlineCode, marginLeft: 2 }}>{path.join('.')}</span>
        </span>
      </div>
    </nav>
  )
}

function PropertyRow({
  name,
  badges,
  children,
  description,
  isLast,
  highlighted,
  onHover,
}: {
  name: string
  badges?: ReactNode
  children: ReactNode
  description: string
  isLast?: boolean
  highlighted: boolean
  onHover: (name: string | null) => void
}) {
  return (
    <div
      role="row"
      tabIndex={0}
      style={
        isLast
          ? highlighted
            ? ROW_STYLE.highlightedLast
            : ROW_STYLE.defaultLast
          : highlighted
            ? ROW_STYLE.highlighted
            : ROW_STYLE.default
      }
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(name)}
      onBlur={() => onHover(null)}
    >
      <div role="cell" style={s.rowLabel}>
        <span style={s.propName}>{name}</span>
        {badges}
      </div>
      <div role="cell" style={s.rowContent}>
        {children}
        <span style={s.description}>{description}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function TokenAnatomyExplorer() {
  const [hoveredProp, setHoveredProp] = useState<string | null>(null)
  const handleHover = useCallback((name: string | null) => setHoveredProp(name), [])

  return (
    <div style={s.container}>
      <div style={s.body}>
        <PathBreadcrumb path={TOKEN.path} />
        <div role="table" aria-label="Token properties" style={s.card}>
          {PROPERTIES.map((prop, i) => (
            <PropertyRow
              key={prop.name}
              name={prop.name}
              badges={prop.badges}
              description={prop.description}
              isLast={i === PROPERTIES.length - 1}
              highlighted={hoveredProp === prop.name}
              onHover={handleHover}
            >
              {prop.content}
            </PropertyRow>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Build the list of property rows for a token                       */
/* ------------------------------------------------------------------ */

type PropertyDef = {
  name: string
  badges?: ReactNode
  content: ReactNode
  description: string
}

function buildPropertyList(token: TokenExample): PropertyDef[] {
  return [
    {
      name: '$type',
      badges: (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={BADGE.required}>required</span>
          {token.groupType && <span style={BADGE.inherited}>inherited</span>}
        </div>
      ),
      content: <span style={{ ...s.inlineCode, fontSize: 13 }}>{token.type}</span>,
      description: PROPERTY_INFO.$type,
    },
    {
      name: '$value',
      badges: <span style={BADGE.required}>required</span>,
      content: <ColorPreview value={token.value} />,
      description: PROPERTY_INFO.$value,
    },
    {
      name: '$description',
      badges: <span style={BADGE.optional}>optional</span>,
      content: (
        <span
          style={{
            ...s.valueText,
            fontStyle: 'italic',
            color: 'var(--sl-color-gray-2, #aaa)',
          }}
        >
          "{token.description}"
        </span>
      ),
      description: PROPERTY_INFO.$description,
    },
    {
      name: '$deprecated',
      badges: <span style={BADGE.optional}>optional</span>,
      content: (
        <span style={s.valueText}>
          {typeof token.deprecated === 'string'
            ? `"${token.deprecated}"`
            : String(token.deprecated)}
        </span>
      ),
      description: PROPERTY_INFO.$deprecated,
    },
    {
      name: '$extensions',
      badges: <span style={BADGE.optional}>optional</span>,
      content: (
        <pre
          style={{
            ...s.valueText,
            fontSize: 12,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {JSON.stringify(token.extensions, null, 2)}
        </pre>
      ),
      description: PROPERTY_INFO.$extensions,
    },
  ]
}

const PROPERTIES = buildPropertyList(TOKEN)
