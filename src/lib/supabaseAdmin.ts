import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ⚠️ SOLO SERVIDOR. Usa la service_role key, que se salta RLS.
// Nunca importes este módulo desde un componente que se ejecute en el cliente.
const rawUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
}

const supabaseUrl = rawUrl.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

/** Cliente Supabase con privilegios de servicio. Solo para rutas API del servidor. */
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
