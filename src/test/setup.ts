/// <reference types="node" />
import { vi } from 'vitest'

// 单元测试未加载 .env.local 时，让 Supabase 客户端走 MSW 同源代理路径，避免 createClient 因空 URL 报错
vi.stubEnv('VITE_ENABLE_MSW', 'true')

import '@testing-library/jest-dom'

// Polyfill Blob.arrayBuffer for jsdom
// jsdom 的 Blob/File 对象缺少 arrayBuffer 方法
if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}
