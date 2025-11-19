import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Cria o cliente Supabase com Privilégios de Admin (Service Role)
    // Isso permite criar usuários no Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Recebe os dados do Front-end
    const { email, password, nome, empresa_id, role } = await req.json()

    if (!email || !password || !empresa_id) {
      throw new Error("Dados incompletos (email, senha e empresa são obrigatórios)")
    }

    // 3. Cria o Usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirma automaticamente para ele já poder logar
      user_metadata: { nome_completo: nome }
    })

    if (authError) throw authError

    const novoUserId = authData.user.id

    // 4. Cria o Vínculo na tabela pública usuarios_empresas
    const { error: dbError } = await supabaseAdmin
      .from('usuarios_empresas')
      .insert([
        {
          user_id: novoUserId,
          empresa_id: empresa_id,
          role: role || 'colaborador',
          nome_exibicao: nome,
          email_exibicao: email
        }
      ])

    if (dbError) {
      // Se falhar no banco, deletamos o usuário do Auth para não ficar "órfão"
      await supabaseAdmin.auth.admin.deleteUser(novoUserId)
      throw dbError
    }

    return new Response(
      JSON.stringify({ message: "Usuário criado e vinculado com sucesso!", user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

**Não esqueça de fazer o deploy:**
```bash
npx supabase functions deploy invite-user --no-verify-jwt