import { css } from 'dispersa'
import { colorToHex, nameKebabCase } from 'dispersa/transforms'
import { defineConfig } from 'dispersa/config'

export default defineConfig({
  resolver: './tokens.resolver.json',
  buildPath: './dist',
  outputs: [
    css({
      name: 'css',
      file: 'tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex()],
    }),
    css({
      name: 'css',
      file: 'tokens-mod.css',
      preset: 'standalone',
      selector: () => '[data-theme="bla"]',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex()],
    }),
  ],
})
