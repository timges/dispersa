/**
 * @fileoverview Type definitions for Figma Variables JSON format
 */

export type FigmaResolvedType = 'COLOR' | 'FLOAT' | 'STRING'

export type FigmaValue =
  | { r: number; g: number; b: number; a: number } // COLOR
  | number // FLOAT
  | string // STRING
  | { type: 'VARIABLE_ALIAS'; id: string }

export type FigmaMode = {
  modeId: string
  name: string
}

export type FigmaCollection = {
  id: string
  name: string
  modes: FigmaMode[]
}

export type FigmaVariable = {
  id: string
  name: string
  variableCollectionId: string
  resolvedType: FigmaResolvedType
  valuesByMode: Record<string, FigmaValue>
  description?: string
  scopes: string[]
}

export type FigmaOutput = {
  version: string
  collections: FigmaCollection[]
  variables: FigmaVariable[]
}
