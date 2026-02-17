// @ts-check
import node from '@astrojs/node'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  site: "https://dispersa.dev", 
  integrations: [
    starlight({
      title: 'Dispersa',
      logo: {
        src: './public/favicon.png',
      },
      favicon: '/favicon.png',
      head: [
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Dispersa' } },
        { tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: 'hsl(272, 80%, 65%)' } },
      ],
      customCss: [
        '@fontsource-variable/inter',
        '@fontsource/jetbrains-mono/400.css',
        '@fontsource/jetbrains-mono/500.css',
        '@fontsource/jetbrains-mono/600.css',
        './src/styles/custom.css',
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/timges/dispersa',
        },
      ],
      sidebar: [
        { label: 'Introduction', link: '/' },
        { label: 'Understanding Tokens', autogenerate: { directory: 'tokens' } },
        { label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
        { label: 'Core Concepts', autogenerate: { directory: 'concepts' } },
        { label: 'Output Formats', autogenerate: { directory: 'outputs' } },
        { label: 'Extending Dispersa', autogenerate: { directory: 'extending' } },
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        { label: 'API Reference', autogenerate: { directory: 'reference' } },
      ],
      editLink: {
        baseUrl: 'https://github.com/timges/dispersa/edit/main/apps/docs/',
      },
    }),
    react(),
  ],
})