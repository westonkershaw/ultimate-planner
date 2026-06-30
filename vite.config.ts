import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Ultimate Life Planner',
        short_name: 'Life Planner',
        description: 'Your all-in-one life command center',
        theme_color: '#070d1a',
        background_color: '#070d1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB — bundle exceeds 2 MiB default
        globPatterns: ['**/*.{js,css,ico,woff2}', 'icons/*.png'], // exclude exercise/medal PNGs from precache
        navigateFallback: null, // let navigation always go to network (fixes WKWebView white screen)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-files', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          // Cache API responses for offline use (stale-while-revalidate)
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
          // Exercise & medal images — network first so new images show immediately
          {
            urlPattern: /\/(exercises|medals)\/.+\.png$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'exercise-medal-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              networkTimeoutSeconds: 5,
            },
          },
          // Other images (user photos, vision board, etc.)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Cache OpenFoodFacts barcode lookups
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'food-data-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor splitting
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd';
          if (id.includes('node_modules/zustand') || id.includes('node_modules/zod') || id.includes('node_modules/immer') || id.includes('node_modules/dompurify') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) return 'vendor-utils';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-charts';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/html2canvas')) return 'vendor-html2canvas';

          // Tab chunk splitting — each heavy tab gets its own parallel-loadable chunk
          if (id.includes('HabitBuilderTab')) return 'tab-habits';
          if (id.includes('VisionBoardTab')) return 'tab-vision';
          if (id.includes('StudyModeTab')) return 'tab-study';
          if (id.includes('MealPlannerTab')) return 'tab-meals';
          if (id.includes('TravelPlannerTab')) return 'tab-travel';
          if (id.includes('JournalTab')) return 'tab-journal';
          if (id.includes('ReadingListTab')) return 'tab-reading';
          if (id.includes('FinanceDashboard') || id.includes('FinanceCalculators') || id.includes('NetWorthTab')) return 'tab-finance';
          if (id.includes('SleepTrackerTab') || id.includes('SleepCalculator')) return 'tab-sleep';
          if (id.includes('MoodTrackerTab')) return 'tab-mood';
          if (id.includes('WellnessTab')) return 'tab-wellness';
          if (id.includes('BodyMetricsTab') || id.includes('BodyMetrics')) return 'tab-body';
          if (id.includes('ProjectsTab')) return 'tab-projects';
          if (id.includes('TimeBlockingTab')) return 'tab-time';
          if (id.includes('SocialCardsTab')) return 'tab-social';
          if (id.includes('InsightsDashboard')) return 'tab-insights';

          // Modal chunk splitting
          if (id.includes('PricingModal') || id.includes('PaywallModal') || id.includes('ProUpsellModal')) return 'modal-pricing';
          if (id.includes('MonthlyReviewModal') || id.includes('WeeklyReview') || id.includes('MorningDashboard')) return 'modal-reviews';
          if (id.includes('OnboardingWizard')) return 'modal-onboard';
          if (id.includes('BankLinkModal') || id.includes('CSVImportModal')) return 'modal-finance';
          if (id.includes('FoodCameraScanner')) return 'modal-camera';
        },
      },
    },
  },
});
