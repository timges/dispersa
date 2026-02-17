/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { Tab, TabList, TabPanel } from './TabGroup'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Example = {
  name: string
  description: string
  tokens: string
  resolver: string
}

type InputTab = 'tokens' | 'resolver'

type BuildOutput = {
  name: string
  content: string
}

type BuildResponse =
  | { success: true; outputs: BuildOutput[] }
  | { success: false; errors: string[] }

// ---------------------------------------------------------------------------
// Examples (adapted for in-memory mode -- sources are injected by the API)
// ---------------------------------------------------------------------------

const EXAMPLES: Example[] = [
  {
    name: 'Basic Colors',
    description: 'Simple color tokens with hex output',
    tokens: `{
  "color": {
    "$type": "color",
    "brand": {
      "primary": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.2, 0.4, 0.9]
        }
      },
      "secondary": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.9, 0.3, 0.5]
        }
      }
    }
  }
}`,
    resolver: `{
  "version": "2025.10",
  "sets": {
    "core": {
      "sources": []
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/core" }
  ]
}`,
  },
  {
    name: 'Themed Tokens',
    description: 'Light/dark theme with modifier overrides',
    tokens: `{
  "color": {
    "$type": "color",
    "neutral": {
      "white": {
        "$value": {
          "colorSpace": "srgb",
          "components": [1, 1, 1]
        }
      },
      "black": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0, 0]
        }
      }
    }
  }
}`,
    resolver: `{
  "version": "2025.10",
  "sets": {
    "core": {
      "sources": []
    }
  },
  "modifiers": {
    "theme": {
      "default": "light",
      "contexts": {
        "light": [{
          "semantic": {
            "background": {
              "$type": "color",
              "$value": "{color.neutral.white}"
            },
            "text": {
              "$type": "color",
              "$value": "{color.neutral.black}"
            }
          }
        }],
        "dark": [{
          "semantic": {
            "background": {
              "$type": "color",
              "$value": "{color.neutral.black}"
            },
            "text": {
              "$type": "color",
              "$value": "{color.neutral.white}"
            }
          }
        }]
      }
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/core" },
    { "$ref": "#/modifiers/theme" }
  ]
}`,
  },
  {
    name: 'Spacing & Typography',
    description: 'Dimension and font tokens',
    tokens: `{
  "spacing": {
    "$type": "dimension",
    "xs": {
      "$value": { "value": 4, "unit": "px" }
    },
    "sm": {
      "$value": { "value": 8, "unit": "px" }
    },
    "md": {
      "$value": { "value": 16, "unit": "px" }
    },
    "lg": {
      "$value": { "value": 32, "unit": "px" }
    }
  },
  "font": {
    "family": {
      "$type": "fontFamily",
      "sans": {
        "$value": ["Inter", "system-ui", "sans-serif"]
      },
      "mono": {
        "$value": ["JetBrains Mono", "monospace"]
      }
    },
    "weight": {
      "$type": "fontWeight",
      "regular": { "$value": 400 },
      "bold": { "$value": 700 }
    }
  }
}`,
    resolver: `{
  "version": "2025.10",
  "sets": {
    "core": {
      "sources": []
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/core" }
  ]
}`,
  },
]

const OUTPUT_FORMATS = ['css', 'json', 'js', 'tailwind', 'swift', 'kotlin']
const OUTPUT_LABELS: Record<string, string> = {
  css: 'CSS',
  json: 'JSON',
  js: 'JavaScript',
  tailwind: 'Tailwind',
  swift: 'Swift',
  kotlin: 'Kotlin',
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function runBuild(tokens: string, resolver: string): Promise<BuildResponse> {
  let parsedTokens: Record<string, unknown>
  try {
    parsedTokens = JSON.parse(tokens)
  } catch {
    return { success: false, errors: ['Invalid JSON in tokens editor'] }
  }

  let parsedResolver: Record<string, unknown>
  try {
    parsedResolver = JSON.parse(resolver)
  } catch {
    return { success: false, errors: ['Invalid JSON in resolver editor'] }
  }

  const res = await fetch('/api/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokens: parsedTokens,
      resolver: parsedResolver,
      outputs: OUTPUT_FORMATS,
    }),
  })

  return res.json() as Promise<BuildResponse>
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BORDER = '1px solid var(--sl-color-gray-5, #374151)'

const styles = {
  container: {
    border: BORDER,
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'var(--sl-font-system, system-ui)',
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: BORDER,
    background: 'var(--sl-color-gray-7, #111827)',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  } satisfies CSSProperties,
  exampleBtn: (active: boolean) =>
    ({
      padding: '6px 14px',
      border: '1px solid',
      borderColor: active ? 'var(--sl-color-accent, #6366f1)' : 'var(--sl-color-gray-5, #374151)',
      borderRadius: '6px',
      background: active ? 'var(--sl-color-accent-low, rgba(99,102,241,0.15))' : 'transparent',
      color: active ? 'var(--sl-color-accent-high, #a5b4fc)' : 'var(--sl-color-gray-2, #9ca3af)',
      cursor: 'pointer',
      fontSize: '13px',
      lineHeight: '1.2',
      fontWeight: active ? 600 : 400,
      transition: 'all 0.15s',
      margin: 0,
    }) satisfies CSSProperties,
  buildBtn: (loading: boolean) =>
    ({
      marginLeft: 'auto',
      marginTop: 0,
      padding: '6px 18px',
      border: 'none',
      borderRadius: '6px',
      background: loading ? 'var(--sl-color-gray-5, #374151)' : 'var(--sl-color-accent, #6366f1)',
      color: '#fff',
      cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: '13px',
      lineHeight: '1.2',
      fontWeight: 600,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap' as const,
    }) satisfies CSSProperties,
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto 1fr',
    minHeight: '420px',
  } satisfies CSSProperties,
  bodyMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr auto 1fr',
    minHeight: '420px',
  } satisfies CSSProperties,
  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: BORDER,
    background: 'var(--sl-color-gray-6, #1f2937)',
    marginTop: 0,
  } satisfies CSSProperties,
  inputTabs: {
    borderRight: BORDER,
  } satisfies CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: '8px 16px',
      marginTop: 0,
      fontSize: '12px',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      border: 'none',
      borderBottom: active ? '2px solid var(--sl-color-accent, #6366f1)' : '2px solid transparent',
      background: 'transparent',
      color: active ? 'var(--sl-color-accent-high, #a5b4fc)' : 'var(--sl-color-gray-2, #9ca3af)',
      transition: 'all 0.15s',
    }) satisfies CSSProperties,
  editorCell: {
    position: 'relative' as const,
    borderRight: BORDER,
    minHeight: 0,
  } satisfies CSSProperties,
  editor: {
    position: 'absolute' as const,
    inset: 0,
    padding: '16px',
    margin: 0,
    fontFamily: 'var(--sl-font-system-mono, monospace)',
    fontSize: '13px',
    lineHeight: 1.6,
    background: 'var(--sl-color-gray-7, #111827)',
    color: 'var(--sl-color-gray-1, #d1d5db)',
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    overflow: 'auto',
    whiteSpace: 'pre' as const,
    boxSizing: 'border-box' as const,
    width: '100%',
    height: '100%',
  } satisfies CSSProperties,
  output: {
    padding: '16px',
    margin: 0,
    fontFamily: 'var(--sl-font-system-mono, monospace)',
    fontSize: '13px',
    lineHeight: 1.6,
    overflow: 'auto',
    background: 'var(--sl-color-gray-7, #111827)',
    color: 'var(--sl-color-gray-1, #d1d5db)',
    whiteSpace: 'pre' as const,
  } satisfies CSSProperties,
  placeholder: {
    display: 'grid',
    placeItems: 'center',
    color: 'var(--sl-color-gray-3, #6b7280)',
    fontSize: '14px',
    background: 'var(--sl-color-gray-7, #111827)',
    padding: '16px',
    textAlign: 'center' as const,
  } satisfies CSSProperties,
  error: {
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '13px',
    fontFamily: 'var(--sl-font-system-mono, monospace)',
    whiteSpace: 'pre-wrap' as const,
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '12px',
    alignItems: 'start',
  } satisfies CSSProperties,
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px',
    lineHeight: 1,
  } satisfies CSSProperties,
  desc: {
    padding: '8px 16px',
    fontSize: '13px',
    color: 'var(--sl-color-gray-3, #6b7280)',
    borderBottom: BORDER,
    background: 'var(--sl-color-gray-6, #1f2937)',
  } satisfies CSSProperties,
}

// Pre-computed style variants to avoid object creation per render
const EXAMPLE_BTN = { active: styles.exampleBtn(true), inactive: styles.exampleBtn(false) }
const BUILD_BTN = { ready: styles.buildBtn(false), loading: styles.buildBtn(true) }
const TAB = { active: styles.tab(true), inactive: styles.tab(false) }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExampleSelector({
  activeIdx,
  onSelect,
  onBuild,
  loading,
  description,
}: {
  activeIdx: number | null
  onSelect: (idx: number) => void
  onBuild: () => void
  loading: boolean
  description: string
}) {
  return (
    <>
      <div style={styles.header}>
        <span style={{ fontSize: '13px', color: 'var(--sl-color-gray-2)', marginRight: '4px' }}>
          Example:
        </span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex.name}
            aria-pressed={i === activeIdx}
            style={i === activeIdx ? EXAMPLE_BTN.active : EXAMPLE_BTN.inactive}
            onClick={() => onSelect(i)}
          >
            {ex.name}
          </button>
        ))}
        <button
          style={loading ? BUILD_BTN.loading : BUILD_BTN.ready}
          disabled={loading}
          onClick={onBuild}
        >
          {loading ? 'Building...' : 'Build'}
        </button>
      </div>
      <div style={styles.desc}>{description}</div>
    </>
  )
}

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div style={styles.error} role="alert">
      <span>{error}</span>
      <button style={styles.dismissBtn} onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  )
}

function EditorPanel({
  inputTab,
  onTabChange,
  tokensJson,
  resolverJson,
  onTokensChange,
  onResolverChange,
  isMobile,
}: {
  inputTab: InputTab
  onTabChange: (tab: InputTab) => void
  tokensJson: string
  resolverJson: string
  onTokensChange: (value: string) => void
  onResolverChange: (value: string) => void
  isMobile: boolean
}) {
  return (
    <div style={{ display: 'contents' }}>
      <TabList
        label="Input editors"
        style={{ ...styles.tabs, ...(isMobile ? {} : styles.inputTabs) }}
      >
        <Tab
          id="input-tab-tokens"
          selected={inputTab === 'tokens'}
          controls="input-panel-tokens"
          style={inputTab === 'tokens' ? TAB.active : TAB.inactive}
          onClick={() => onTabChange('tokens')}
        >
          tokens.json
        </Tab>
        <Tab
          id="input-tab-resolver"
          selected={inputTab === 'resolver'}
          controls="input-panel-resolver"
          style={inputTab === 'resolver' ? TAB.active : TAB.inactive}
          onClick={() => onTabChange('resolver')}
        >
          resolver.json
        </Tab>
      </TabList>

      <div style={isMobile ? styles.editorCell : { ...styles.editorCell, borderRight: BORDER }}>
        <TabPanel
          id="input-panel-tokens"
          labelledBy="input-tab-tokens"
          hidden={inputTab !== 'tokens'}
          style={{ position: 'absolute', inset: 0 }}
        >
          <textarea
            style={styles.editor}
            value={tokensJson}
            onChange={(e) => onTokensChange(e.target.value)}
            spellCheck={false}
            aria-label="Tokens JSON editor"
          />
        </TabPanel>
        <TabPanel
          id="input-panel-resolver"
          labelledBy="input-tab-resolver"
          hidden={inputTab !== 'resolver'}
          style={{ position: 'absolute', inset: 0 }}
        >
          <textarea
            style={styles.editor}
            value={resolverJson}
            onChange={(e) => onResolverChange(e.target.value)}
            spellCheck={false}
            aria-label="Resolver JSON editor"
          />
        </TabPanel>
      </div>
    </div>
  )
}

function OutputPanel({
  outputTab,
  onTabChange,
  outputs,
  hasBuilt,
}: {
  outputTab: number
  onTabChange: (idx: number) => void
  outputs: BuildOutput[]
  hasBuilt: boolean
}) {
  const activeKey = OUTPUT_FORMATS[outputTab] ?? OUTPUT_FORMATS[0]
  const activeLabel = OUTPUT_LABELS[activeKey]
  const activeContent = outputs.find((o) => o.name === activeLabel)?.content

  return (
    <div style={{ display: 'contents' }}>
      <TabList label="Output formats" style={styles.tabs}>
        {OUTPUT_FORMATS.map((fmt, i) => (
          <Tab
            key={fmt}
            id={`output-tab-${fmt}`}
            selected={i === outputTab}
            controls="output-panel"
            style={i === outputTab ? TAB.active : TAB.inactive}
            onClick={() => onTabChange(i)}
          >
            {OUTPUT_LABELS[fmt]}
          </Tab>
        ))}
      </TabList>

      <TabPanel
        id="output-panel"
        labelledBy={`output-tab-${activeKey}`}
        style={{ display: 'grid', minHeight: 0 }}
      >
        {hasBuilt ? (
          <pre style={styles.output} aria-label={`${activeLabel} output`}>
            {activeContent ?? ''}
          </pre>
        ) : (
          <div style={styles.placeholder}>
            Click <strong>Build</strong> to run Dispersa and see the output
          </div>
        )}
      </TabPanel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TokenPlayground() {
  const [tokensJson, setTokensJson] = useState(EXAMPLES[0].tokens)
  const [resolverJson, setResolverJson] = useState(EXAMPLES[0].resolver)
  const [inputTab, setInputTab] = useState<InputTab>('tokens')
  const [outputTab, setOutputTab] = useState(0)
  const [outputs, setOutputs] = useState<BuildOutput[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [description, setDescription] = useState(EXAMPLES[0].description)
  const [hasBuilt, setHasBuilt] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const loadExample = useCallback((idx: number) => {
    const ex = EXAMPLES[idx]
    setTokensJson(ex.tokens)
    setResolverJson(ex.resolver)
    setDescription(ex.description)
    setOutputs([])
    setError(null)
    setOutputTab(0)
    setHasBuilt(false)
  }, [])

  const handleBuild = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const result = await runBuild(tokensJson, resolverJson)
      if (controller.signal.aborted) {
        return
      }

      if (result.success) {
        setOutputs(result.outputs)
        setHasBuilt(true)
      } else {
        setError(result.errors.join('\n'))
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [tokensJson, resolverJson])

  const activeExampleIdx = useMemo(() => {
    const idx = EXAMPLES.findIndex((ex) => ex.tokens === tokensJson && ex.resolver === resolverJson)
    return idx >= 0 ? idx : null
  }, [tokensJson, resolverJson])

  return (
    <div style={styles.container}>
      <ExampleSelector
        activeIdx={activeExampleIdx}
        onSelect={loadExample}
        onBuild={() => void handleBuild()}
        loading={loading}
        description={description}
      />

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <div style={isMobile ? styles.bodyMobile : styles.body}>
        <EditorPanel
          inputTab={inputTab}
          onTabChange={setInputTab}
          tokensJson={tokensJson}
          resolverJson={resolverJson}
          onTokensChange={setTokensJson}
          onResolverChange={setResolverJson}
          isMobile={isMobile}
        />
        <OutputPanel
          outputTab={outputTab}
          onTabChange={setOutputTab}
          outputs={outputs}
          hasBuilt={hasBuilt}
        />
      </div>
    </div>
  )
}
