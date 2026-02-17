import { css } from 'dispersa'
import { colorToHex, dimensionToRem, fontWeightToNumber, nameKebabCase } from 'dispersa/transforms'
import { defineConfig } from 'dispersa/config'

export default defineConfig({
  resolver: './tokens.resolver.json',
  buildPath: './dist',
  outputs: [
    css({
      name: 'css-bundle',
      file: 'tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex(), dimensionToRem(), fontWeightToNumber()],
    }),
    css({
      name: 'css-themes',
      file: '{theme}/tokens.css',
      preset: 'modifier',
      selector: ':root',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex(), dimensionToRem(), fontWeightToNumber()],
    }),
  ],
})
