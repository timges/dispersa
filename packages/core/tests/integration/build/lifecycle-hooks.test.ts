/**
 * @fileoverview Integration tests for build lifecycle hooks
 *
 * Verifies that onBuildStart and onBuildEnd hooks fire at the correct
 * times with the correct arguments at both global and per-output scope.
 */

import { describe, expect, it, vi } from 'vitest'

import { build, css, json } from '../../../src/index'
import type { ResolverDocument } from '../../../src/resolution/types'
import { colorToHex, nameKebabCase } from '../../../src/transforms'

/**
 * Minimal inline resolver for hook tests (no filesystem needed)
 */
function createTestResolver(): ResolverDocument {
  return {
    version: '2025.10',
    sets: {
      base: {
        sources: [
          {
            color: {
              primary: {
                $value: { colorSpace: 'srgb', components: [0, 0.5, 1] },
                $type: 'color',
              },
            },
            spacing: {
              small: {
                $value: { value: 4, unit: 'px' },
                $type: 'dimension',
              },
            },
          },
        ],
      },
    },
    resolutionOrder: [{ $ref: '#/sets/base' }],
  }
}

describe('Lifecycle Hooks', () => {
  describe('onBuildStart', () => {
    it('should fire before build processing', async () => {

      const resolver = createTestResolver()
      const onBuildStart = vi.fn()

      await build({
        resolver,
        outputs: [
          json({ name: 'json', preset: 'standalone', structure: 'flat' }),
        ],
        hooks: { onBuildStart },
      })

      expect(onBuildStart).toHaveBeenCalledOnce()
      expect(onBuildStart).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ outputs: expect.any(Array) }),
          resolver,
        }),
      )
    })

    it('should fire before onBuildEnd', async () => {

      const resolver = createTestResolver()
      const callOrder: string[] = []

      await build({
        resolver,
        outputs: [
          json({ name: 'json', preset: 'standalone', structure: 'flat' }),
        ],
        hooks: {
          onBuildStart: () => { callOrder.push('buildStart') },
          onBuildEnd: () => { callOrder.push('buildEnd') },
        },
      })

      expect(callOrder).toEqual(['buildStart', 'buildEnd'])
    })

    it('should support async hooks', async () => {

      const resolver = createTestResolver()
      let hookCompleted = false

      await build({
        resolver,
        outputs: [
          json({ name: 'json', preset: 'standalone', structure: 'flat' }),
        ],
        hooks: {
          onBuildStart: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            hookCompleted = true
          },
        },
      })

      expect(hookCompleted).toBe(true)
    })
  })

  describe('onBuildEnd', () => {
    it('should fire after all outputs complete', async () => {

      const resolver = createTestResolver()
      const onBuildEnd = vi.fn()

      await build({
        resolver,
        outputs: [
          json({ name: 'json', preset: 'standalone', structure: 'flat' }),
        ],
        hooks: { onBuildEnd },
      })

      expect(onBuildEnd).toHaveBeenCalledOnce()
      expect(onBuildEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          outputs: expect.any(Array),
        }),
      )
    })

    it('should receive errors when build fails', async () => {

      const resolver = createTestResolver()
      const onBuildEnd = vi.fn()

      const badRenderer = {
        format: () => { throw new Error('Renderer failure') },
      }

      await build({
        resolver,
        outputs: [{ name: 'bad', renderer: badRenderer }],
        hooks: { onBuildEnd },
      })

      expect(onBuildEnd).toHaveBeenCalledOnce()
      const result = onBuildEnd.mock.calls[0][0]
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should fire even when build partially fails', async () => {

      const resolver = createTestResolver()
      const onBuildEnd = vi.fn()

      const badRenderer = {
        format: () => { throw new Error('Renderer failure') },
      }

      await build({
        resolver,
        outputs: [
          json({ name: 'good-json', preset: 'standalone', structure: 'flat' }),
          { name: 'bad', renderer: badRenderer },
        ],
        hooks: { onBuildEnd },
      })

      expect(onBuildEnd).toHaveBeenCalledOnce()
      const result = onBuildEnd.mock.calls[0][0]
      expect(result.success).toBe(false)
      expect(result.outputs.length).toBeGreaterThan(0)
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  describe('Per-output onBuildStart', () => {
    it('should fire per-output onBuildStart before processing each output', async () => {

      const resolver = createTestResolver()
      const onBuildStartJson = vi.fn()
      const onBuildStartCss = vi.fn()

      await build({
        resolver,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            hooks: { onBuildStart: onBuildStartJson },
          }),
          css({
            name: 'css',
            preset: 'standalone',
            transforms: [nameKebabCase(), colorToHex()],
            hooks: { onBuildStart: onBuildStartCss },
          }),
        ],
      })

      expect(onBuildStartJson).toHaveBeenCalledOnce()
      expect(onBuildStartCss).toHaveBeenCalledOnce()
      expect(onBuildStartJson).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ outputs: expect.any(Array) }),
          resolver,
        }),
      )
    })
  })

  describe('Per-output onBuildEnd', () => {
    it('should fire right after each output finishes', async () => {

      const resolver = createTestResolver()
      const onBuildEndJson = vi.fn()
      const onBuildEndCss = vi.fn()

      await build({
        resolver,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            hooks: { onBuildEnd: onBuildEndJson },
          }),
          css({
            name: 'css',
            preset: 'standalone',
            transforms: [nameKebabCase(), colorToHex()],
            hooks: { onBuildEnd: onBuildEndCss },
          }),
        ],
      })

      expect(onBuildEndJson).toHaveBeenCalledOnce()
      expect(onBuildEndCss).toHaveBeenCalledOnce()

      const jsonResult = onBuildEndJson.mock.calls[0][0]
      expect(jsonResult.success).toBe(true)
      expect(jsonResult.outputs).toEqual(expect.any(Array))
      expect(jsonResult.outputs.length).toBeGreaterThan(0)
    })

    it('should receive failure result when the output throws', async () => {

      const resolver = createTestResolver()
      const onBuildEnd = vi.fn()

      const badRenderer = {
        format: () => { throw new Error('Renderer failure') },
      }

      await build({
        resolver,
        outputs: [
          { name: 'bad', renderer: badRenderer, hooks: { onBuildEnd } },
        ],
      })

      expect(onBuildEnd).toHaveBeenCalledOnce()
      const result = onBuildEnd.mock.calls[0][0]
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Hook execution order', () => {
    it('should fire: global start first, per-output start before its end, global end last', async () => {

      const resolver = createTestResolver()
      const callOrder: string[] = []

      await build({
        resolver,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            hooks: {
              onBuildStart: () => { callOrder.push('output:json:start') },
              onBuildEnd: () => { callOrder.push('output:json:end') },
            },
          }),
          css({
            name: 'css',
            preset: 'standalone',
            transforms: [nameKebabCase(), colorToHex()],
            hooks: {
              onBuildStart: () => { callOrder.push('output:css:start') },
              onBuildEnd: () => { callOrder.push('output:css:end') },
            },
          }),
        ],
        hooks: {
          onBuildStart: () => { callOrder.push('global:start') },
          onBuildEnd: () => { callOrder.push('global:end') },
        },
      })

      // All hooks should fire
      expect(callOrder).toHaveLength(6)

      // Global start fires first
      expect(callOrder[0]).toBe('global:start')

      // Global end fires last
      expect(callOrder[callOrder.length - 1]).toBe('global:end')

      // Each output's start fires before its own end
      // (outputs are processed in parallel, so interleaving is expected)
      const jsonStartIdx = callOrder.indexOf('output:json:start')
      const jsonEndIdx = callOrder.indexOf('output:json:end')
      expect(jsonStartIdx).toBeLessThan(jsonEndIdx)

      const cssStartIdx = callOrder.indexOf('output:css:start')
      const cssEndIdx = callOrder.indexOf('output:css:end')
      expect(cssStartIdx).toBeLessThan(cssEndIdx)
    })
  })
})
