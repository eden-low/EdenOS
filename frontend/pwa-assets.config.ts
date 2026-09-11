import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const darkBackground = '#090c13'
const preset = {
  ...minimal2023Preset,
  maskable: {
    ...minimal2023Preset.maskable,
    padding: 0.15,
    resizeOptions: { fit: 'contain' as const, background: darkBackground },
  },
  apple: {
    ...minimal2023Preset.apple,
    padding: 0.1,
    resizeOptions: { fit: 'contain' as const, background: darkBackground },
  },
}

export default defineConfig({
  preset,
  images: ['public/icons/edenos-icon.svg'],
})
