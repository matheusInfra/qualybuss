// supabase/functions/invite-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS (Pre-flight request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Configura Cliente Admin (Service Role) - Tem poder para criar usuários
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Recebe os dados do corpo da requisição
    // Note que esperamos 'password' aqui, que o UsuarioManager agora envia corretamente
    const { email, password, nome, empresa_id, role } = await req.json()

    // Validação simples
    if (!email || !password || !empresa_id) {
      throw new Error("Dados incompletos: email, password e empresa_id são obrigatórios.")
    }

    // 3. Cria o Usuário no Auth (Identity)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirma o email automaticamente para permitir login imediato
      user_metadata: { nome_completo: nome }
    })

    if (authError) {
      // Repassa o erro do Auth (ex: Email já existe, Senha fraca)
      throw authError
    }

    const novoUserId = authData.user.id

    // 4. Cria o vínculo na tabela pública (Database)
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

    // Rollback manual: Se falhar ao inserir no banco, deleta o usuário do Auth para não ficar "fantasma"
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(novoUserId)
      throw new Error("Erro ao vincular usuário à empresa: " + dbError.message)
    }

    // 5. Sucesso
    return new Response(
      JSON.stringify({ message: "Usuário criado e vinculado com sucesso!", user_id: novoUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})