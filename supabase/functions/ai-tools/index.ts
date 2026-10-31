/**
 * Edge Function — contrats IA (suggest_spec_questions, propose_itinerary_style,
 * propose_pois). Sans clé LLM serveur, renvoie 501 : le client utilise les
 * heuristiques locales de `src/entities/ai-tools.ts`.
 *
 * Secrets attendus (dashboard) : OPENAI_API_KEY (optionnel).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: auth } } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!Deno.env.get('OPENAI_API_KEY')) {
    return new Response(
      JSON.stringify({
        error: 'llm_not_configured',
        hint: 'Use local heuristics in the PWA when OPENAI_API_KEY is unset.',
      }),
      {
        status: 501,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }

  // Branchement LLM volontairement minimal : le client MVP s’appuie sur les
  // heuristiques. Étendre ici avec un appel OpenAI structured outputs.
  const body = await req.json().catch(() => ({}));
  return new Response(
    JSON.stringify({
      ok: true,
      tool: body?.tool ?? null,
      message: 'Configure structured generation in a follow-up.',
    }),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  );
});
