import { dispersaPlugin } from 'dispersa/lint'
import { json } from 'dispersa'

export default {
  resolver: './tokens.resolver.json',
  buildPath: './dist',
  lint: {
    plugins: { dispersa: dispersaPlugin },
    rules: {
      'dispersa/require-description': 'warn',
    },
  },
  outputs: [json({ name: 'json', preset: 'standalone', structure: 'flat' })],
}
