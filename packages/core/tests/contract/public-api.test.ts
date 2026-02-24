/**
 * @fileoverview Contract tests for public API stability
 *
 * These tests verify that the public API exports remain stable across versions.
 * Breaking changes to these exports should trigger a major version bump.
 *
 * Tests both main entry point and subpath exports.
 */

import { describe, expect, it } from 'vitest'
import * as BuildersAPI from '../../src/builders'
import * as FiltersAPI from '../../src/filters'
import * as DispersaAPI from '../../src/index'
import * as PreprocessorsAPI from '../../src/preprocessors'
import * as RenderersAPI from '../../src/renderers'
import * as TransformsAPI from '../../src/transforms'

describe('Public API Contract Tests', () => {
  describe('Primary API', () => {
    it('should export build function', () => {
      expect(DispersaAPI).toHaveProperty('build')
      expect(typeof DispersaAPI.build).toBe('function')
    })

    it('should export core functions', () => {
      expect(DispersaAPI).toHaveProperty('build')
      expect(DispersaAPI).toHaveProperty('buildOrThrow')
      expect(DispersaAPI).toHaveProperty('resolveTokens')
      expect(DispersaAPI).toHaveProperty('lint')
      expect(DispersaAPI).toHaveProperty('resolveAllPermutations')
      expect(DispersaAPI).toHaveProperty('generateTypes')
    })
  })

  describe('API Stability - Main Entry Point', () => {
    it('should export core APIs from main entry', () => {
      const actualExports = Object.keys(DispersaAPI)

      expect(actualExports).toContain('build')
      expect(actualExports).toContain('css')
      expect(actualExports).toContain('json')
      expect(actualExports).toContain('js')
      expect(actualExports).toContain('tailwind')
      expect(actualExports).toContain('ios')
      expect(actualExports).toContain('android')
      expect(actualExports).toContain('outputTree')
      expect(actualExports).toContain('isOutputTree')
      expect(actualExports).toContain('defineRenderer')
    })
  })

  describe('API Stability - Main Entry Point', () => {
    it('should export core APIs from main entry', () => {
      const actualExports = Object.keys(DispersaAPI)

      expect(actualExports).toContain('build')
      expect(actualExports).toContain('css')
      expect(actualExports).toContain('json')
      expect(actualExports).toContain('js')
      expect(actualExports).toContain('tailwind')
      expect(actualExports).toContain('ios')
      expect(actualExports).toContain('android')
      expect(actualExports).toContain('outputTree')
      expect(actualExports).toContain('isOutputTree')
      expect(actualExports).toContain('defineRenderer')
    })

    it('should NOT export internal implementation details', () => {
      const actualExports = Object.keys(DispersaAPI)

      // TypeGenerator and SchemaValidator are internal
      expect(actualExports).not.toContain('TypeGenerator')
      expect(actualExports).not.toContain('SchemaValidator')

      // Renderer factories and classes are internal (use builders instead)
      expect(actualExports).not.toContain('cssRenderer')
      expect(actualExports).not.toContain('jsonRenderer')
      expect(actualExports).not.toContain('jsRenderer')
      expect(actualExports).not.toContain('CssRenderer')
      expect(actualExports).not.toContain('JsonRenderer')
      expect(actualExports).not.toContain('JsModuleRenderer')
    })
  })

  describe('Subpath Exports - dispersa/transforms', () => {
    it('should export all color transforms', () => {
      expect(TransformsAPI).toHaveProperty('colorToHex')
      expect(TransformsAPI).toHaveProperty('colorToRgb')
      expect(TransformsAPI).toHaveProperty('colorToHsl')
      expect(TransformsAPI).toHaveProperty('colorToColorFunction')
      expect(TransformsAPI).toHaveProperty('colorToOklch')
    })

    it('should export all dimension transforms', () => {
      expect(TransformsAPI).toHaveProperty('dimensionToPx')
      expect(TransformsAPI).toHaveProperty('dimensionToRem')
      expect(TransformsAPI).toHaveProperty('dimensionToUnitless')
    })

    it('should export all name transforms', () => {
      expect(TransformsAPI).toHaveProperty('nameCamelCase')
      expect(TransformsAPI).toHaveProperty('nameKebabCase')
      expect(TransformsAPI).toHaveProperty('namePascalCase')
      expect(TransformsAPI).toHaveProperty('nameConstantCase')
      expect(TransformsAPI).toHaveProperty('nameSnakeCase')
    })

    it('should export other transforms', () => {
      expect(TransformsAPI).toHaveProperty('durationToMs')
      expect(TransformsAPI).toHaveProperty('durationToSeconds')
      expect(TransformsAPI).toHaveProperty('fontWeightToNumber')
    })
  })

  describe('Subpath Exports - dispersa/filters', () => {
    it('should export all filter functions', () => {
      expect(FiltersAPI).toHaveProperty('isAlias')
      expect(FiltersAPI).toHaveProperty('isBase')
      expect(FiltersAPI).toHaveProperty('byType')
      expect(FiltersAPI).toHaveProperty('byPath')
    })

    it('filter factories should return objects with correct structure', () => {
      const aliasFilter = FiltersAPI.isAlias()

      expect(aliasFilter).toHaveProperty('filter')
      expect(typeof aliasFilter.filter).toBe('function')
    })

    it('filter factories should return filter objects', () => {
      const colorFilter = FiltersAPI.byType('color')

      expect(colorFilter).toHaveProperty('filter')
      expect(typeof colorFilter.filter).toBe('function')
    })
  })

  describe('Subpath Exports - dispersa/builders', () => {
    it('should export all output builder functions', () => {
      expect(BuildersAPI).toHaveProperty('css')
      expect(BuildersAPI).toHaveProperty('json')
      expect(BuildersAPI).toHaveProperty('js')
      expect(BuildersAPI).toHaveProperty('tailwind')
      expect(BuildersAPI).toHaveProperty('ios')
      expect(BuildersAPI).toHaveProperty('android')

      expect(typeof BuildersAPI.css).toBe('function')
      expect(typeof BuildersAPI.json).toBe('function')
      expect(typeof BuildersAPI.js).toBe('function')
      expect(typeof BuildersAPI.tailwind).toBe('function')
      expect(typeof BuildersAPI.ios).toBe('function')
      expect(typeof BuildersAPI.android).toBe('function')
    })

    it('css builder should return valid output config', () => {
      const output = BuildersAPI.css({
        name: 'test',
        file: 'test.css',
        preset: 'bundle',
        selector: ':root',
      })

      expect(output).toHaveProperty('name', 'test')
      expect(output).toHaveProperty('renderer')
      expect(output).toHaveProperty('file', 'test.css')
      expect(output).toHaveProperty('options')
      expect(output.options).toMatchObject({ preset: 'bundle' })
      expect(typeof output.renderer.format).toBe('function')
    })

    it('tailwind builder should return valid output config', () => {
      const output = BuildersAPI.tailwind({
        name: 'test',
        file: 'theme.css',
        preset: 'bundle',
      })

      expect(output).toHaveProperty('name', 'test')
      expect(output).toHaveProperty('renderer')
      expect(output).toHaveProperty('file', 'theme.css')
      expect(output).toHaveProperty('options')
      expect(output.options).toMatchObject({ preset: 'bundle' })
      expect(typeof output.renderer.format).toBe('function')
    })

    it('ios builder should return valid output config', () => {
      const output = BuildersAPI.ios({
        name: 'test',
        file: 'Tokens.swift',
      })

      expect(output).toHaveProperty('name', 'test')
      expect(output).toHaveProperty('renderer')
      expect(output).toHaveProperty('file', 'Tokens.swift')
      expect(output).toHaveProperty('options')
      expect(typeof output.renderer.format).toBe('function')
    })

    it('android builder should return valid output config', () => {
      const output = BuildersAPI.android({
        name: 'test',
        file: 'Tokens.kt',
        packageName: 'com.example.tokens',
      })

      expect(output).toHaveProperty('name', 'test')
      expect(output).toHaveProperty('renderer')
      expect(output).toHaveProperty('file', 'Tokens.kt')
      expect(output).toHaveProperty('options')
      expect(output.options).toMatchObject({ packageName: 'com.example.tokens' })
      expect(typeof output.renderer.format).toBe('function')
    })
  })

  describe('Subpath Exports - dispersa/renderers', () => {
    it('should export outputTree helper', () => {
      expect(RenderersAPI).toHaveProperty('outputTree')
      expect(RenderersAPI).toHaveProperty('isOutputTree')
      expect(typeof RenderersAPI.outputTree).toBe('function')
      expect(typeof RenderersAPI.isOutputTree).toBe('function')
    })

    it('should NOT export renderer factories or classes', () => {
      const actualExports = Object.keys(RenderersAPI)

      expect(actualExports).not.toContain('cssRenderer')
      expect(actualExports).not.toContain('jsonRenderer')
      expect(actualExports).not.toContain('jsRenderer')
      expect(actualExports).not.toContain('CssRenderer')
      expect(actualExports).not.toContain('JsonRenderer')
      expect(actualExports).not.toContain('JsModuleRenderer')
    })
  })

  describe('Subpath Exports - dispersa/preprocessors', () => {
    it('should be importable (exports Preprocessor type)', () => {
      // No built-in preprocessors exist, but the module and type should be available
      // This test just verifies the subpath export works
      expect(PreprocessorsAPI).toBeDefined()
    })
  })
})
