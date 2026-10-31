// بديل لعميل Supabase بنفس الواجهة اللي بتستخدمها صفحات الموقع، فمفيش صفحة
// محتاجة تتغيّر. القراءة من بيانات وهمية في الذاكرة، والكتابة بترجّع شرح
// بدل ما تنفّذ. الدخول تلقائي بحساب تجريبي.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/database.types'
import {
  DEMO_USER_EMAIL, DEMO_USER_ID, RPC_EXPLANATIONS, SILENT_RPCS,
  USER_MANAGEMENT_BLOCKED_MESSAGE, WRITE_BLOCKED_MESSAGE,
} from '../demoConfig'
import type { DemoDatabase } from '../seed/types'
import { MockQueryBuilder, type MockDatabase } from './queryBuilder'

const demoSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  user: {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  },
}

function runRpc(name: string): { data: null; error: { message: string; code: string } | null } {
  if (SILENT_RPCS.has(name)) return { data: null, error: null }
  const message = RPC_EXPLANATIONS[name] ?? WRITE_BLOCKED_MESSAGE
  return { data: null, error: { message, code: 'DEMO_READ_ONLY' } }
}

// القناة اللحظية (Realtime) مش محتاجة في النسخة التجريبية، فبترجّع كائن فاضي بنفس الشكل
const silentChannel = {
  on() { return silentChannel },
  subscribe() { return silentChannel },
}

export function createMockSupabase(db: DemoDatabase): SupabaseClient<Database> {
  const database = db as unknown as MockDatabase

  const client = {
    from: (table: string) => new MockQueryBuilder(database, table),
    rpc: (name: string) => Promise.resolve(runRpc(name)),

    auth: {
      getSession: async () => ({ data: { session: demoSession }, error: null }),
      getUser: async () => ({ data: { user: demoSession.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: demoSession.user, session: demoSession }, error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: { message: WRITE_BLOCKED_MESSAGE } }),
    },

    functions: {
      invoke: async () => ({ data: null, error: { message: USER_MANAGEMENT_BLOCKED_MESSAGE } }),
    },

    channel: () => silentChannel,
    removeChannel: async () => 'ok',
  }

  return client as unknown as SupabaseClient<Database>
}
