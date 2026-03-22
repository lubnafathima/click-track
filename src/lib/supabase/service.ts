import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 * ONLY use in server-side code (Server Actions, Route Handlers).
 * NEVER import in Client Components or any file that ships to the browser.
 */
export const createServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
