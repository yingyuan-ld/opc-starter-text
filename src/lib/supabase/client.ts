/**
 * Supabase 客户端初始化
 *
 * MSW Mock 模式下使用同源代理路径 /supabase-proxy，确保请求在
 * localhost:5173 同源范围内，Service Worker 才能正确拦截。
 * 直接使用 localhost:54321 会产生跨域请求，MSW 无法拦截。
 */
import { createClient } from '@supabase/supabase-js'

const isMSWMode = import.meta.env.VITE_ENABLE_MSW === 'true'

// MSW 模式下强制使用同源代理路径，让 Service Worker 可以拦截请求
const supabaseUrl = isMSWMode
  ? 'http://localhost:5173/supabase-proxy'
  : import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (isMSWMode ? 'mock-anon-key' : '')

if (!isMSWMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    '[Supabase] 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。请将 app/.env.example 复制为 app/.env.local 并填入 Dashboard > Settings > API 中的 URL 与 anon key；' +
      '若本地无需真实后端，请在 .env.local 中设置 VITE_ENABLE_MSW=true，并使用 npm run dev:test 启动（同源 /supabase-proxy 供 MSW 拦截）。',
  )
}

if (isMSWMode) {
  console.log('[Supabase] MSW 模式：使用代理路径 /supabase-proxy，请求将由 MSW Service Worker 拦截')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: !isMSWMode,
    detectSessionInUrl: !isMSWMode,
    storage: localStorage,
  },
})
