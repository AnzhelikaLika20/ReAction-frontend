import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa"

const manifest : Partial<ManifestOptions> = {
    "theme_color": "#8936FF",
    "background_color": "#2EC6FE",
    "icons": [
        {
            "purpose": "maskable",
            "sizes": "512x512",
            "src": "icon512_maskable.png",
            "type": "image/png"
        },
        {
            "purpose": "any",
            "sizes": "512x512",
            "src": "icon512_rounded.png",
            "type": "image/png"
        }
    ],
    "screenshots": [
        {
            "src": "/assets/screenshots/desktop.png",
            "type": "image/png",
            "sizes": "3004x1726",
            "form_factor": "wide"
        },
        {
            "src": "/assets/screenshots/mobile.png",
            "type": "image/png",
            "sizes": "788x1548",
            "form_factor": "narrow"
        }
    ],
    "orientation": "any",
    "display": "standalone",
    "dir": "ltr",
    "lang": "en",
    "name": "Re:Action",
    "short_name": "Re:Action",
    "start_url": "/"
};

export default defineConfig({
  plugins: [react(), VitePWA({ 
    registerType: "autoUpdate", 
    workbox: { 
      globPatterns: ["**/*{html,css,js,ico,png,svg}"] }, 
      manifest:  manifest})],
})
