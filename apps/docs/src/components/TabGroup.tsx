/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CSSProperties, ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabListProps = {
  label: string
  children: ReactNode
  style?: CSSProperties
}

type TabProps = {
  id: string
  selected: boolean
  controls: string
  onClick: () => void
  children: ReactNode
  style?: CSSProperties
}

type TabPanelProps = {
  id: string
  labelledBy: string
  hidden?: boolean
  children: ReactNode
  style?: CSSProperties
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TabList({ label, children, style }: TabListProps) {
  return (
    <div role="tablist" aria-label={label} style={style}>
      {children}
    </div>
  )
}

function Tab({ id, selected, controls, onClick, children, style }: TabProps) {
  return (
    <button
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}

function TabPanel({ id, labelledBy, hidden = false, children, style }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      style={hidden ? { ...style, display: 'none' } : style}
    >
      {children}
    </div>
  )
}

export { Tab, TabList, TabPanel }
