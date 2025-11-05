import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[supabase] Missing envs: SUPABASE_URL or SUPABASE_SERVICE_ROLE');
        }
        return null;
    }
    return createClient(url, serviceRole, {
        auth: { persistSession: false },
        global: { headers: { 'X-Client-Info': 'cnam_edt-server' } }
    });
}


