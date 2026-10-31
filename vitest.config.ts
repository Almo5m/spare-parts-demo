import { defineConfig } from 'vitest/config'

// اختبارات النسخة التجريبية (منطق بحت، من غير متصفح)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
