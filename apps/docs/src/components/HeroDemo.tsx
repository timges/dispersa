/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

import { useContainerWidth } from './hooks/use-container-width'
import { Tab, TabList, TabPanel } from './TabGroup'

const WIDE_THRESHOLD = 900

type OutputFormat = {
  id: string
  label: string
  lines: CodeLine[]
}

type CodeLine = {
  tokens: CodeToken[]
}

type CodeToken = {
  text: string
  kind: 'key' | 'string' | 'number' | 'punct' | 'plain' | 'comment'
}

function t(text: string, kind: CodeToken['kind']): CodeToken {
  return { text, kind }
}

function line(...tokens: CodeToken[]): CodeLine {
  return { tokens }
}

// ---------------------------------------------------------------------------
// Input: DTCG resolver with inline tokens + modifier
// Aligned with examples/typescript-starter, preserving alias references
// ---------------------------------------------------------------------------

const RESOLVER_LINES: CodeLine[] = [
  line(t('{', 'punct')),
  line(t('  "version"', 'key'), t(': ', 'punct'), t('"2025.10"', 'string'), t(',', 'punct')),
  line(t('  "sets"', 'key'), t(': {', 'punct')),
  line(t('    "core"', 'key'), t(': {', 'punct')),
  line(t('      "sources"', 'key'), t(': [{', 'punct')),
  line(t('        "color"', 'key'), t(': {', 'punct')),
  line(t('          "palette"', 'key'), t(': {', 'punct')),
  line(t('            "$type"', 'key'), t(': ', 'punct'), t('"color"', 'string'), t(',', 'punct')),
  line(
    t('            "blue-500"', 'key'),
    t(': { ', 'punct'),
    t('"$value"', 'key'),
    t(': { ', 'punct'),
    t('"colorSpace"', 'key'),
    t(': ', 'punct'),
    t('"srgb"', 'string'),
    t(', ', 'punct'),
    t('"components"', 'key'),
    t(': [', 'punct'),
    t('0', 'number'),
    t(', ', 'punct'),
    t('0.4', 'number'),
    t(', ', 'punct'),
    t('0.8', 'number'),
    t('] } }', 'punct'),
  ),
  line(t('          },', 'punct')),
  line(t('          "action"', 'key'), t(': {', 'punct')),
  line(t('            "$type"', 'key'), t(': ', 'punct'), t('"color"', 'string'), t(',', 'punct')),
  line(
    t('            "brand"', 'key'),
    t(': { ', 'punct'),
    t('"$value"', 'key'),
    t(': ', 'punct'),
    t('"{color.palette.blue-500}"', 'string'),
    t(' }', 'punct'),
  ),
  line(t('          }', 'punct')),
  line(t('        },', 'punct')),
  line(t('        "spacing"', 'key'), t(': {', 'punct')),
  line(t('          "scale"', 'key'), t(': {', 'punct')),
  line(
    t('            "$type"', 'key'),
    t(': ', 'punct'),
    t('"dimension"', 'string'),
    t(',', 'punct'),
  ),
  line(
    t('            "md"', 'key'),
    t(': { ', 'punct'),
    t('"$value"', 'key'),
    t(': { ', 'punct'),
    t('"value"', 'key'),
    t(': ', 'punct'),
    t('16', 'number'),
    t(', ', 'punct'),
    t('"unit"', 'key'),
    t(': ', 'punct'),
    t('"px"', 'string'),
    t(' } }', 'punct'),
  ),
  line(t('          },', 'punct')),
  line(t('          "gap"', 'key'), t(': {', 'punct')),
  line(
    t('            "$type"', 'key'),
    t(': ', 'punct'),
    t('"dimension"', 'string'),
    t(',', 'punct'),
  ),
  line(
    t('            "md"', 'key'),
    t(': { ', 'punct'),
    t('"$value"', 'key'),
    t(': ', 'punct'),
    t('"{spacing.scale.md}"', 'string'),
    t(' }', 'punct'),
  ),
  line(t('          }', 'punct')),
  line(t('        }', 'punct')),
  line(t('      }]', 'punct')),
  line(t('    }', 'punct')),
  line(t('  },', 'punct')),
  line(t('  "modifiers"', 'key'), t(': {', 'punct')),
  line(t('    "theme"', 'key'), t(': {', 'punct')),
  line(t('      "default"', 'key'), t(': ', 'punct'), t('"light"', 'string'), t(',', 'punct')),
  line(t('      "contexts"', 'key'), t(': {', 'punct')),
  line(
    t('        "light"', 'key'),
    t(': [{ ', 'punct'),
    t('"$ref"', 'key'),
    t(': ', 'punct'),
    t('"./themes/light.json"', 'string'),
    t(' }],', 'punct'),
  ),
  line(
    t('        "dark"', 'key'),
    t(': [{ ', 'punct'),
    t('"$ref"', 'key'),
    t(': ', 'punct'),
    t('"./themes/dark.json"', 'string'),
    t(' }]', 'punct'),
  ),
  line(t('      }', 'punct')),
  line(t('    }', 'punct')),
  line(t('  },', 'punct')),
  line(t('  "resolutionOrder"', 'key'), t(': [', 'punct')),
  line(
    t('    { ', 'punct'),
    t('"$ref"', 'key'),
    t(': ', 'punct'),
    t('"#/sets/core"', 'string'),
    t(' },', 'punct'),
  ),
  line(
    t('    { ', 'punct'),
    t('"$ref"', 'key'),
    t(': ', 'punct'),
    t('"#/modifiers/theme"', 'string'),
    t(' }', 'punct'),
  ),
  line(t('  ]', 'punct')),
  line(t('}', 'punct')),
]

// ---------------------------------------------------------------------------
// Output tabs — resolved values from the example template
// blue-500 [0,0.4,0.8] = #0066cc, gray-900 [0.1,0.11,0.12] = #1a1c1f
// gray-100 [0.96,0.96,0.97] = #f5f5f7, white [1,1,1] = #ffffff
// ---------------------------------------------------------------------------

const OUTPUT_FORMATS: OutputFormat[] = [
  {
    id: 'css',
    label: 'CSS',
    lines: [
      line(t(':root', 'key'), t(' {', 'punct')),
      line(
        t('  --color-palette-blue-500', 'key'),
        t(': ', 'punct'),
        t('#0066cc', 'string'),
        t(';', 'punct'),
      ),
      line(
        t('  --color-action-brand', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--color-palette-blue-500', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(
        t('  --spacing-scale-md', 'key'),
        t(': ', 'punct'),
        t('16px', 'number'),
        t(';', 'punct'),
      ),
      line(
        t('  --spacing-gap-md', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--spacing-scale-md', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(t('}', 'punct')),
      line(),
      line(t('[data-theme="light"]', 'key'), t(' {', 'punct')),
      line(
        t('  --color-text-default', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--color-palette-gray-900', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(
        t('  --color-background-default', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--color-palette-white', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(t('}', 'punct')),
      line(),
      line(t('[data-theme="dark"]', 'key'), t(' {', 'punct')),
      line(
        t('  --color-text-default', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--color-palette-gray-100', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(
        t('  --color-background-default', 'key'),
        t(': ', 'punct'),
        t('var(', 'punct'),
        t('--color-palette-gray-900', 'key'),
        t(')', 'punct'),
        t(';', 'punct'),
      ),
      line(t('}', 'punct')),
    ],
  },
  {
    id: 'json',
    label: 'JSON',
    lines: [
      line(t('// tokens-light.json', 'comment')),
      line(t('{', 'punct')),
      line(
        t('  "color-palette-blue-500"', 'key'),
        t(': ', 'punct'),
        t('"#0066cc"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "color-action-brand"', 'key'),
        t(': ', 'punct'),
        t('"#0066cc"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "spacing-scale-md"', 'key'),
        t(': ', 'punct'),
        t('"16px"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "spacing-gap-md"', 'key'),
        t(': ', 'punct'),
        t('"16px"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "color-text-default"', 'key'),
        t(': ', 'punct'),
        t('"#1a1c1f"', 'string'),
        t(',', 'punct'),
      ),
      line(t('  "color-background-default"', 'key'), t(': ', 'punct'), t('"#ffffff"', 'string')),
      line(t('}', 'punct')),
      line(),
      line(t('// tokens-dark.json', 'comment')),
      line(t('{', 'punct')),
      line(
        t('  "color-palette-blue-500"', 'key'),
        t(': ', 'punct'),
        t('"#0066cc"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "color-action-brand"', 'key'),
        t(': ', 'punct'),
        t('"#0066cc"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "spacing-scale-md"', 'key'),
        t(': ', 'punct'),
        t('"16px"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "spacing-gap-md"', 'key'),
        t(': ', 'punct'),
        t('"16px"', 'string'),
        t(',', 'punct'),
      ),
      line(
        t('  "color-text-default"', 'key'),
        t(': ', 'punct'),
        t('"#f5f5f7"', 'string'),
        t(',', 'punct'),
      ),
      line(t('  "color-background-default"', 'key'), t(': ', 'punct'), t('"#1a1c1f"', 'string')),
      line(t('}', 'punct')),
    ],
  },
]

const COLORS = {
  border: 'var(--sl-color-gray-5)',
  text: 'var(--sl-color-white)',
  muted: 'var(--sl-color-gray-3)',
  accent: 'var(--sl-color-accent)',
}

const TOKEN_COLORS: Record<CodeToken['kind'], string> = {
  key: 'var(--dispersa-syntax-key)',
  string: 'var(--dispersa-syntax-string)',
  number: 'var(--dispersa-syntax-number)',
  punct: 'var(--dispersa-syntax-punct)',
  plain: 'var(--sl-color-white)',
  comment: 'var(--sl-color-gray-3)',
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function CodeBlock({
  lines,
  label,
  style,
}: {
  lines: CodeLine[]
  label: string
  style?: CSSProperties
}) {
  return (
    <pre
      aria-label={label}
      style={{
        margin: 0,
        padding: '14px 16px',
        background: 'var(--dispersa-syntax-bg)',
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        overflow: 'auto',
        fontSize: 12,
        lineHeight: 1.6,
        fontFamily: 'var(--sl-font-mono)',
        color: COLORS.text,
        marginTop: 0,
        ...style,
      }}
    >
      <code>
        {lines.map((ln, i) => (
          <span key={i}>
            {ln.tokens.map((tok, j) => (
              <span key={j} style={{ color: TOKEN_COLORS[tok.kind] }}>
                {tok.text}
              </span>
            ))}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        ))}
      </code>
    </pre>
  )
}

function SpectralArrow({ vertical }: { vertical?: boolean }) {
  const buildLabel = (
    <span
      style={{
        fontFamily: 'var(--sl-font-mono)',
        fontSize: 11,
        fontWeight: 500,
        color: COLORS.muted,
        whiteSpace: 'nowrap' as const,
        marginBottom: 16,
      }}
    >
      build({'{...}'})
    </span>
  )

  if (vertical) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: 2,
          padding: '8px 0',
        }}
        aria-hidden="true"
      >
        {buildLabel}
        <svg
          width={56}
          height={24}
          viewBox="0 0 85 15"
          fill="none"
          style={{ display: 'block', transform: 'rotate(90deg)' }}
        >
          <path
            className="dispersa-hero-arrow-path"
            d="M0.158447 9.25C33.7106 -1.9604 52.1387 -2.50431 84.1584 9.25L78.9623 0.25M84.1584 9.25L75.1584 14.4462"
            stroke="#a855f7"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 6px',
        alignSelf: 'center',
      }}
      aria-hidden="true"
    >
      {buildLabel}
      <svg width={85} height={15} viewBox="0 0 85 15" fill="none" style={{ display: 'block' }}>
        <path
          className="dispersa-hero-arrow-path"
          d="M0.158447 9.25C33.7106 -1.9604 52.1387 -2.50431 84.1584 9.25L78.9623 0.25M84.1584 9.25L75.1584 14.4462"
          stroke="#a855f7"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  )
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: COLORS.muted,
        marginBottom: 8,
        marginTop: 0,
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HeroDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(containerRef)
  const isWide = width >= WIDE_THRESHOLD
  const [activeTab, setActiveTab] = useState('css')

  const handleTabClick = useCallback((id: string) => {
    setActiveTab(id)
  }, [])

  const tabStyle = useCallback(
    (selected: boolean): CSSProperties => ({
      padding: '5px 10px',
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'var(--sl-font-mono)',
      border: 'none',
      borderBottom: selected ? `2px solid ${COLORS.accent}` : '2px solid transparent',
      background: 'none',
      color: selected ? COLORS.text : COLORS.muted,
      cursor: 'pointer',
      transition: 'color 0.15s ease, border-color 0.15s ease',
      marginTop: 0,
    }),
    [],
  )

  const outputContent = (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        background: 'var(--dispersa-syntax-bg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: 0,
        marginTop: 0,
      }}
    >
      <TabList
        label="Output format"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '0 8px',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {OUTPUT_FORMATS.map((fmt) => (
          <Tab
            key={fmt.id}
            id={`hero-tab-${fmt.id}`}
            selected={activeTab === fmt.id}
            controls={`hero-panel-${fmt.id}`}
            onClick={() => handleTabClick(fmt.id)}
            style={tabStyle(activeTab === fmt.id)}
            className="dispersa-focus-ring"
          >
            {fmt.label}
          </Tab>
        ))}
      </TabList>
      <div style={{ flex: 1 }}>
        {OUTPUT_FORMATS.map((fmt) => (
          <TabPanel
            key={fmt.id}
            id={`hero-panel-${fmt.id}`}
            labelledBy={`hero-tab-${fmt.id}`}
            hidden={activeTab !== fmt.id}
            style={{ padding: 0, height: '100%' }}
          >
            <CodeBlock
              lines={fmt.lines}
              label={`${fmt.label} output`}
              style={{ border: 'none', borderRadius: 0, height: '100%' }}
            />
          </TabPanel>
        ))}
      </div>
    </div>
  )

  const inputContent = (
    <CodeBlock
      lines={RESOLVER_LINES}
      label="DTCG resolver document with inline tokens"
      style={{ minHeight: 0 }}
    />
  )

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        marginTop: 8,
        marginBottom: 32,
        fontFamily: 'var(--sl-font)',
      }}
    >
      {isWide ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: '4px 8px',
          }}
        >
          <PanelLabel>Resolver + Tokens</PanelLabel>
          <div />
          <PanelLabel>Output</PanelLabel>
          {inputContent}
          <SpectralArrow />
          {outputContent}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'stretch',
            gap: 0,
          }}
        >
          <PanelLabel>Resolver + Tokens</PanelLabel>
          {inputContent}
          <SpectralArrow vertical />
          <PanelLabel>Output</PanelLabel>
          {outputContent}
        </div>
      )}
    </div>
  )
}
