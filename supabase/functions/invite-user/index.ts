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
    // 1. Cria o cliente Supabase com Privilégios de Admin (Service Role)
    // Isso permite criar usuários no Auth sem enviar email de confirmação (confirmado automaticamente)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Recebe os dados do Front-end
    // ATUALIZADO: Agora recebe 'cargo' e 'telefone' também
    const { email, password, nome, empresa_id, role, cargo, telefone } = await req.json()

    // Validação básica
    if (!email || !password || !empresa_id) {
      throw new Error("Dados incompletos: email, senha e empresa são obrigatórios.")
    }

    // 3. Cria o Usuário no Supabase Auth (Identity)
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

    // 4. Cria o Vínculo na tabela pública (Database)
    // ATUALIZADO: Insere 'cargo' e 'telefone' se existirem
    const { error: dbError } = await supabaseAdmin
      .from('usuarios_empresas')
      .insert([
        {
          user_id: novoUserId,
          empresa_id: empresa_id,
          role: role || 'colaborador',
          nome_exibicao: nome,
          email_exibicao: email,
          cargo: cargo || null,
          telefone: telefone || null
        }
      ])

    // Rollback manual: Se falhar ao inserir no banco (ex: erro de chave estrangeira), 
    // deleta o usuário do Auth para não ficar "fantasma" no sistema.
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