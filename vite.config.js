import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const buildVersion = Date.now().toString()

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      buildStart() {
        try {
          const publicDir = path.resolve(__dirname, 'public')
          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
          fs.writeFileSync(
            path.join(publicDir, 'version.json'),
            JSON.stringify({ version: buildVersion, timestamp: new Date().toISOString() }, null, 2)
          )
        } catch (e) {
          console.error('Failed to write version.json', e)
        }
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: buildVersion, timestamp: new Date().toISOString() }, null, 2),
        })
      },
    },
  ],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(buildVersion),
  },
})
