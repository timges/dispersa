/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  type CSSProperties,
  Fragment,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react'

type StageData = {
  id: string
  name: string
  description: string
  input: string
  output: string
}

type OutputTarget = {
  id: string
  label: string
}

const SHARED_STAGES: StageData[] = [
  {
    id: 'resolve',
    name: 'Resolve',
    description:
      'Loads the DTCG resolver document, merges sets in order, and applies modifier contexts (themes, platforms, densities) to produce the raw token tree for each permutation.',
    input: 'Resolver document + modifier inputs',
    output: 'Raw token tree per permutation',
  },
  {
    id: 'preprocess',
    name: 'Preprocess',
    description:
      'Runs optional preprocessors that transform the raw token document before parsing. Use this to strip vendor metadata, inject computed tokens, or normalize legacy formats.',
    input: 'Raw token tree',
    output: 'Preprocessed token tree',
  },
  {
    id: 'parse',
    name: 'Parse',
    description:
      'Resolves JSON Pointer references ($ref), flattens nested groups to dot-path keys (e.g. color.brand.primary), inherits group-level $type, and resolves alias references with circular dependency detection.',
    input: 'Preprocessed token tree',
    output: 'Flat map of resolved tokens',
  },
  {
    id: 'global-filter',
    name: 'Global Filter',
    description:
      'Applies global filters defined in BuildConfig to all resolved tokens before per-output filters run. Use this to exclude tokens globally, such as removing deprecated tokens from all outputs.',
    input: 'All resolved tokens',
    output: 'Globally filtered tokens',
  },
  {
    id: 'global-transform',
    name: 'Global Transform',
    description:
      'Applies global transforms defined in BuildConfig to all tokens before per-output transforms run. Use this for platform-agnostic transformations like name casing or color space conversions.',
    input: 'Globally filtered tokens',
    output: 'Globally transformed tokens',
  },
]

const OUTPUT_STAGES: StageData[] = [
  {
    id: 'filter',
    name: 'Filter',
    description:
      "Removes tokens that don't match the configured per-output filters from each OutputConfig, further narrowing the globally transformed set.",
    input: 'Globally transformed tokens',
    output: 'Filtered token subset',
  },
  {
    id: 'transform',
    name: 'Transform',
    description:
      'Applies per-output transforms to convert token values and names for the specific target platform.',
    input: 'Filtered token subset',
    output: 'Platform-ready tokens',
  },
  {
    id: 'render',
    name: 'Render',
    description:
      'Formats the transformed tokens into the target output: CSS custom properties, JSON, JS/TS modules, Tailwind @theme, Swift/SwiftUI, Kotlin/Compose, or a custom format via defineRenderer.',
    input: 'Platform-ready tokens',
    output: 'CSS, JSON, JS, Swift, Kotlin, etc.',
  },
]

const ALL_STAGES = [...SHARED_STAGES, ...OUTPUT_STAGES]

const OUTPUT_TARGETS: OutputTarget[] = [
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'js', label: 'JS' },
  { id: 'more', label: '...' },
]

/*
 * Animation segment mapping (segs 0–15):
 *  0 Resolve  1 conn  2 Preprocess  3 conn  4 Parse  5 conn
 *  6 G.Filter  7 conn  8 G.Transform  9 conn→branch
 *  10 branch(vert+horiz)  11 Filter  12 conn  13 Transform  14 conn  15 Render
 *
 * Stacked layout reuses the same segment timing with vertical
 * variants (cfv{seg}) for the connectors between shared stages.
 */

const ANIM_CYCLE = 6
const SEG_PCT = 4
const HOLD_END_PCT = 78
const RESET_PCT = 88
const ROW_GAP = 6
const COMPACT_THRESHOLD = 900

function buildFlowCSS(): string {
  const rules: string[] = []
  const stepSegs = [0, 2, 4, 6, 8, 11, 13, 15]
  const connSegs = [1, 3, 5, 7, 9, 12, 14]

  for (const seg of stepSegs) {
    const s = seg * SEG_PCT
    const e = (seg + 1) * SEG_PCT
    rules.push(
      `@keyframes bf${seg}{` +
        `0%,${s}%{background-size:100% 100%,0% 100%,100% 100%}` +
        `${e}%,${HOLD_END_PCT}%{background-size:100% 100%,100% 100%,100% 100%}` +
        `${RESET_PCT}%,100%{background-size:100% 100%,0% 100%,100% 100%}}`,
      `@keyframes bfv${seg}{` +
        `0%,${s}%{background-size:100% 100%,100% 0%,100% 100%}` +
        `${e}%,${HOLD_END_PCT}%{background-size:100% 100%,100% 100%,100% 100%}` +
        `${RESET_PCT}%,100%{background-size:100% 100%,100% 0%,100% 100%}}`,
    )
  }

  for (const seg of connSegs) {
    const s = seg * SEG_PCT
    const e = (seg + 1) * SEG_PCT
    rules.push(
      `@keyframes cf${seg}{` +
        `0%,${s}%{transform:scaleX(0)}` +
        `${e}%,${HOLD_END_PCT}%{transform:scaleX(1)}` +
        `${RESET_PCT}%,100%{transform:scaleX(0)}}`,
      `@keyframes cfv${seg}{` +
        `0%,${s}%{transform:scaleY(0)}` +
        `${e}%,${HOLD_END_PCT}%{transform:scaleY(1)}` +
        `${RESET_PCT}%,100%{transform:scaleY(0)}}`,
    )
  }

  const bs = 10 * SEG_PCT
  const be = 11 * SEG_PCT
  rules.push(
    `@keyframes cfv10{0%,${bs}%{transform:scaleY(0)}${be}%,${HOLD_END_PCT}%{transform:scaleY(1)}${RESET_PCT}%,100%{transform:scaleY(0)}}`,
    `@keyframes cfh10{0%,${bs}%{transform:scaleX(0)}${be}%,${HOLD_END_PCT}%{transform:scaleX(1)}${RESET_PCT}%,100%{transform:scaleX(0)}}`,
    '@keyframes detailSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
  )

  return rules.join('\n')
}

const FLOW_CSS = buildFlowCSS()

const COLORS = {
  bg: 'var(--sl-color-gray-6)',
  border: 'var(--sl-color-gray-5)',
  text: 'var(--sl-color-white)',
  muted: 'var(--sl-color-gray-3)',
  accent: 'var(--sl-color-accent)',
  accentBg: 'var(--sl-color-accent-low)',
}

function useContainerWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) {
      return undefined
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

type ConnectorProps = {
  segment: number
  accent: string
  track: string
  style?: CSSProperties
}

function Connector({ segment, accent, track, style }: ConnectorProps) {
  return (
    <span
      style={{ display: 'flex', alignItems: 'center', padding: '0 2px', ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'relative' as const,
          flex: 1,
          minWidth: 8,
          height: 2,
          background: track,
          borderRadius: 1,
        }}
      >
        <span
          style={{
            position: 'absolute' as const,
            inset: 0,
            background: accent,
            borderRadius: 1,
            transformOrigin: 'left',
            transform: 'scaleX(0)',
            animation: `cf${segment} ${ANIM_CYCLE}s ease infinite`,
          }}
        />
      </span>
    </span>
  )
}

type BranchPosition = 'first' | 'middle' | 'last'

type BranchConnectorProps = {
  position: BranchPosition
  accent: string
  track: string
  style?: CSSProperties
}

function BranchConnector({ position, accent, track, style }: BranchConnectorProps) {
  const halfGap = ROW_GAP / 2
  const isFirst = position === 'first'
  const isLast = position === 'last'

  return (
    <span
      style={{ position: 'relative' as const, alignSelf: 'stretch', width: 18, ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'absolute' as const,
          left: 0,
          width: 2,
          top: isFirst ? '50%' : -halfGap,
          bottom: isLast ? '50%' : -halfGap,
          background: track,
        }}
      >
        <span
          style={{
            position: 'absolute' as const,
            inset: 0,
            background: accent,
            transformOrigin: 'top',
            transform: 'scaleY(0)',
            animation: `cfv10 ${ANIM_CYCLE}s ease infinite`,
          }}
        />
      </span>
      <span
        style={{
          position: 'absolute' as const,
          left: 0,
          right: 0,
          top: '50%',
          height: 2,
          transform: 'translateY(-50%)',
          background: track,
        }}
      >
        <span
          style={{
            position: 'absolute' as const,
            inset: 0,
            background: accent,
            transformOrigin: 'left',
            transform: 'scaleX(0)',
            animation: `cfh10 ${ANIM_CYCLE}s ease infinite`,
          }}
        />
      </span>
    </span>
  )
}

function VerticalConnector({ segment, accent, track, style }: ConnectorProps) {
  return (
    <span
      style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'relative' as const,
          width: 2,
          height: 12,
          background: track,
          borderRadius: 1,
        }}
      >
        <span
          style={{
            position: 'absolute' as const,
            inset: 0,
            background: accent,
            borderRadius: 1,
            transformOrigin: 'top',
            transform: 'scaleY(0)',
            animation: `cfv${segment} ${ANIM_CYCLE}s ease infinite`,
          }}
        />
      </span>
    </span>
  )
}

const NUM_STYLE: CSSProperties = { fontSize: 11, fontWeight: 600, opacity: 0.7 }

export default function PipelineVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(containerRef)
  const isWide = containerWidth >= COMPACT_THRESHOLD

  const [selectedId, setSelectedId] = useState<string | null>('resolve')
  const selectedStage = ALL_STAGES.find((s) => s.id === selectedId)
  const c = COLORS

  const getStageStyle = useMemo(() => {
    const base: CSSProperties = {
      padding: '8px 10px',
      borderRadius: 8,
      color: c.text,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      whiteSpace: 'nowrap',
      margin: 0,
    }

    return (
      selected: boolean,
      segment: number,
      extra?: CSSProperties,
      vertical?: boolean,
    ): CSSProperties => ({
      ...base,
      border: '2px solid transparent',
      backgroundImage: [
        `linear-gradient(${c.bg}, ${c.bg})`,
        `linear-gradient(${c.accent}, ${c.accent})`,
        `linear-gradient(${c.border}, ${c.border})`,
      ].join(', '),
      backgroundOrigin: 'padding-box, border-box, border-box',
      backgroundClip: 'padding-box, border-box, border-box',
      backgroundSize: vertical ? '100% 100%, 100% 0%, 100% 100%' : '100% 100%, 0% 100%, 100% 100%',
      backgroundRepeat: 'no-repeat',
      animation: `${vertical ? 'bfv' : 'bf'}${segment} ${ANIM_CYCLE}s ease infinite`,
      ...(selected && {
        outline: `2px solid ${c.accent}`,
        outlineOffset: -2,
        boxShadow: `inset 0 0 0 200px ${c.accentBg}`,
      }),
      ...extra,
    })
  }, [c])

  const handleClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const labelStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: 11,
      fontWeight: 600,
      color: c.muted,
      padding: '0 8px',
      whiteSpace: 'nowrap',
    }),
    [c],
  )

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        marginTop: 16,
        marginBottom: 24,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <style>{FLOW_CSS}</style>

      {isWide ? (
        <WideLayout
          stages={SHARED_STAGES}
          outputs={OUTPUT_TARGETS}
          outputStages={OUTPUT_STAGES}
          selectedId={selectedId}
          numStyle={NUM_STYLE}
          labelStyle={labelStyle}
          colors={c}
          getStageStyle={getStageStyle}
          onStageClick={handleClick}
        />
      ) : (
        <StackedLayout
          stages={SHARED_STAGES}
          outputs={OUTPUT_TARGETS}
          outputStages={OUTPUT_STAGES}
          selectedId={selectedId}
          numStyle={NUM_STYLE}
          labelStyle={labelStyle}
          colors={c}
          getStageStyle={getStageStyle}
          onStageClick={handleClick}
        />
      )}

      {selectedStage && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.bg,
            color: c.text,
            fontSize: 14,
            lineHeight: 1.6,
            animation: 'detailSlideDown 0.25s ease-out',
          }}
          role="region"
          aria-label={`Details for ${selectedStage.name}`}
        >
          <div style={{ fontSize: 16, fontWeight: 600 as const, marginBottom: 12 }}>
            {selectedStage.name}
          </div>
          <p style={{ margin: '0 0 12px 0' }}>{selectedStage.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span
                style={{ fontWeight: 600 as const, fontSize: 12, color: c.muted, minWidth: 48 }}
              >
                Input:
              </span>
              <span>{selectedStage.input}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span
                style={{ fontWeight: 600 as const, fontSize: 12, color: c.muted, minWidth: 48 }}
              >
                Output:
              </span>
              <span>{selectedStage.output}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type LayoutProps = {
  stages: StageData[]
  outputs: OutputTarget[]
  outputStages: StageData[]
  selectedId: string | null
  numStyle: CSSProperties
  labelStyle: CSSProperties
  colors: {
    bg: string
    border: string
    text: string
    muted: string
    accent: string
    accentBg: string
  }
  getStageStyle: (
    selected: boolean,
    segment: number,
    extra?: CSSProperties,
    vertical?: boolean,
  ) => CSSProperties
  onStageClick: (id: string) => void
}

function WideLayout({
  stages,
  outputs,
  outputStages,
  selectedId,
  numStyle,
  labelStyle,
  colors: c,
  getStageStyle,
  onStageClick,
}: LayoutProps) {
  const centerRow = Math.ceil(outputs.length / 2)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr auto auto 1fr auto 1fr auto auto',
        alignItems: 'center',
        rowGap: ROW_GAP,
      }}
    >
      {stages.map((stage, i) => {
        const segment = i * 2
        const col = i * 2 + 1
        return (
          <Fragment key={stage.id}>
            <button
              type="button"
              onClick={() => onStageClick(stage.id)}
              style={getStageStyle(selectedId === stage.id, segment, {
                gridRow: centerRow,
                gridColumn: col,
              })}
              aria-pressed={selectedId === stage.id}
              aria-label={`Stage ${i + 1}: ${stage.name}. ${stage.description}`}
            >
              <span style={numStyle}>{i + 1}</span>
              {stage.name}
            </button>
            {i < stages.length - 1 && (
              <Connector
                segment={segment + 1}
                accent={c.accent}
                track={c.border}
                style={{ gridRow: centerRow, gridColumn: col + 1 }}
              />
            )}
          </Fragment>
        )
      })}

      <Connector
        segment={9}
        accent={c.accent}
        track={c.border}
        style={{ gridRow: centerRow, gridColumn: 10 }}
      />

      {outputs.map((target, rowIdx) => {
        const gridRow = rowIdx + 1
        const branchPos: BranchPosition =
          rowIdx === 0 ? 'first' : rowIdx === outputs.length - 1 ? 'last' : 'middle'
        return (
          <Fragment key={target.id}>
            <BranchConnector
              position={branchPos}
              accent={c.accent}
              track={c.border}
              style={{ gridRow, gridColumn: 11 }}
            />
            <button
              type="button"
              onClick={() => onStageClick('filter')}
              style={getStageStyle(selectedId === 'filter', 11, { gridRow, gridColumn: 12 })}
              aria-pressed={selectedId === 'filter'}
              aria-label={`Stage 6: Filter (${target.label}). ${outputStages[0].description}`}
            >
              <span style={numStyle}>6</span>
              Filter
            </button>
            <Connector
              segment={12}
              accent={c.accent}
              track={c.border}
              style={{ gridRow, gridColumn: 13 }}
            />
            <button
              type="button"
              onClick={() => onStageClick('transform')}
              style={getStageStyle(selectedId === 'transform', 13, { gridRow, gridColumn: 14 })}
              aria-pressed={selectedId === 'transform'}
              aria-label={`Stage 7: Transform (${target.label}). ${outputStages[1].description}`}
            >
              <span style={numStyle}>7</span>
              Transform
            </button>
            <Connector
              segment={14}
              accent={c.accent}
              track={c.border}
              style={{ gridRow, gridColumn: 15 }}
            />
            <button
              type="button"
              onClick={() => onStageClick('render')}
              style={getStageStyle(selectedId === 'render', 15, { gridRow, gridColumn: 16 })}
              aria-pressed={selectedId === 'render'}
              aria-label={`Stage 8: Render (${target.label}). ${outputStages[2].description}`}
            >
              <span style={numStyle}>8</span>
              Render
            </button>
            <span style={{ ...labelStyle, gridRow, gridColumn: 17 }}>{target.label}</span>
          </Fragment>
        )
      })}
    </div>
  )
}

function StackedLayout({
  stages,
  outputs,
  outputStages,
  selectedId,
  numStyle,
  colors: c,
  getStageStyle,
  onStageClick,
}: LayoutProps) {
  const colGap = 16

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
      {/* Shared stages: vertical flow */}
      {stages.map((stage, i) => {
        const segment = i * 2
        return (
          <Fragment key={stage.id}>
            <button
              type="button"
              onClick={() => onStageClick(stage.id)}
              style={getStageStyle(selectedId === stage.id, segment, { minWidth: 160 }, true)}
              aria-pressed={selectedId === stage.id}
              aria-label={`Stage ${i + 1}: ${stage.name}. ${stage.description}`}
            >
              <span style={numStyle}>{i + 1}</span>
              {stage.name}
            </button>
            {i < stages.length - 1 && (
              <VerticalConnector segment={segment + 1} accent={c.accent} track={c.border} />
            )}
          </Fragment>
        )
      })}

      {/* Connector from G.Transform to branch */}
      <VerticalConnector segment={9} accent={c.accent} track={c.border} />

      {/* Output columns: branch bar + per-output vertical pipelines */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${outputs.length}, auto)`,
          columnGap: colGap,
          rowGap: 2,
          justifyItems: 'stretch',
        }}
      >
        {/* Branch bar: horizontal trunk segments + vertical drops */}
        {outputs.map((target, i) => (
          <span
            key={`branch-${target.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              position: 'relative' as const,
              alignSelf: 'stretch',
              minWidth: 2,
            }}
            aria-hidden="true"
          >
            <span
              style={{
                position: 'absolute' as const,
                top: 0,
                height: 2,
                left: i === 0 ? '50%' : -(colGap / 2),
                right: i === outputs.length - 1 ? '50%' : -(colGap / 2),
                background: c.border,
              }}
            >
              <span
                style={{
                  position: 'absolute' as const,
                  inset: 0,
                  background: c.accent,
                  transformOrigin: 'center',
                  transform: 'scaleX(0)',
                  animation: `cfh10 ${ANIM_CYCLE}s ease infinite`,
                }}
              />
            </span>
            <span
              style={{
                position: 'relative' as const,
                width: 2,
                height: 14,
                marginTop: 2,
                background: c.border,
                borderRadius: 1,
              }}
            >
              <span
                style={{
                  position: 'absolute' as const,
                  inset: 0,
                  background: c.accent,
                  borderRadius: 1,
                  transformOrigin: 'top',
                  transform: 'scaleY(0)',
                  animation: `cfv10 ${ANIM_CYCLE}s ease infinite`,
                }}
              />
            </span>
          </span>
        ))}

        {/* Per-output stage rows + connector rows */}
        {outputStages.map((stage, si) => {
          const stageNum = stages.length + si + 1
          const segment = [11, 13, 15][si]
          const connSegment = [12, 14][si]
          return (
            <Fragment key={stage.id}>
              {outputs.map((target) => (
                <button
                  key={`${stage.id}-${target.id}`}
                  type="button"
                  onClick={() => onStageClick(stage.id)}
                  style={getStageStyle(selectedId === stage.id, segment, { minWidth: 160 }, true)}
                  aria-pressed={selectedId === stage.id}
                  aria-label={`Stage ${stageNum}: ${stage.name} (${target.label}). ${stage.description}`}
                >
                  <span style={numStyle}>{stageNum}</span>
                  {stage.name}
                </button>
              ))}
              {connSegment !== undefined &&
                outputs.map((target) => (
                  <VerticalConnector
                    key={`vc${connSegment}-${target.id}`}
                    segment={connSegment}
                    accent={c.accent}
                    track={c.border}
                  />
                ))}
            </Fragment>
          )
        })}

        {/* Output labels */}
        {outputs.map((target) => (
          <span
            key={`label-${target.id}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: c.muted,
              padding: '4px 0 0',
              textAlign: 'center' as const,
              whiteSpace: 'nowrap' as const,
            }}
          >
            {target.label}
          </span>
        ))}
      </div>
    </div>
  )
}
