/**
 * Forma do banco, em TypeScript.
 *
 * ⚠️ ARQUIVO GERADO — não edite à mão.
 * Rode `node scripts/gerar-tipos-banco.mjs` depois de cada migração.
 *
 * É o que tira o `any` das telas: com ele o cliente Supabase sabe o nome e o
 * tipo de cada coluna, e um `select` com coluna inexistente para de compilar.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [chave: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          status: "ativo" | "pendente" | "recusado" | "inativo";
          observacao: string | null;
          criado_em: string;
          ultimo_acesso: string | null;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          status?: "ativo" | "pendente" | "recusado" | "inativo";
          observacao?: string | null;
          criado_em?: string;
          ultimo_acesso?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          telefone?: string | null;
          status?: "ativo" | "pendente" | "recusado" | "inativo";
          observacao?: string | null;
          criado_em?: string;
          ultimo_acesso?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      convites: {
        Row: {
          id: string;
          token: string;
          nome_sugerido: string | null;
          criado_por: string;
          expira_em: string;
          usado_em: string | null;
          cliente_id: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          token: string;
          nome_sugerido?: string | null;
          criado_por: string;
          expira_em?: string;
          usado_em?: string | null;
          cliente_id?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          token?: string;
          nome_sugerido?: string | null;
          criado_por?: string;
          expira_em?: string;
          usado_em?: string | null;
          cliente_id?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      encomendas: {
        Row: {
          id: string;
          cliente_id: string;
          marca: string;
          modelo: string;
          referencia: string | null;
          ano_desejado: string | null;
          orcamento_maximo: string | null;
          observacoes: string | null;
          status: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          marca: string;
          modelo: string;
          referencia?: string | null;
          ano_desejado?: string | null;
          orcamento_maximo?: string | null;
          observacoes?: string | null;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          marca?: string;
          modelo?: string;
          referencia?: string | null;
          ano_desejado?: string | null;
          orcamento_maximo?: string | null;
          observacoes?: string | null;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "encomendas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos: {
        Row: {
          id: string;
          cliente_id: string;
          tipo: "acesso" | "viu_peca" | "foi_whatsapp";
          peca_id: string | null;
          criado_em: string;
          cidade: string | null;
          dispositivo: string | null;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          tipo: "acesso" | "viu_peca" | "foi_whatsapp";
          peca_id?: string | null;
          criado_em?: string;
          cidade?: string | null;
          dispositivo?: string | null;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          tipo?: "acesso" | "viu_peca" | "foi_whatsapp";
          peca_id?: string | null;
          criado_em?: string;
          cidade?: string | null;
          dispositivo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_peca_id_fkey";
            columns: ["peca_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id"];
          },
        ];
      };
      fotos: {
        Row: {
          id: string;
          peca_id: string;
          url: string;
          alt: string;
          ordem: number;
          url_thumb: string | null;
          blur: string | null;
        };
        Insert: {
          id?: string;
          peca_id: string;
          url: string;
          alt: string;
          ordem?: number;
          url_thumb?: string | null;
          blur?: string | null;
        };
        Update: {
          id?: string;
          peca_id?: string;
          url?: string;
          alt?: string;
          ordem?: number;
          url_thumb?: string | null;
          blur?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fotos_peca_id_fkey";
            columns: ["peca_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id"];
          },
        ];
      };
      guardadas: {
        Row: {
          cliente_id: string;
          peca_id: string;
          criado_em: string;
        };
        Insert: {
          cliente_id: string;
          peca_id: string;
          criado_em?: string;
        };
        Update: {
          cliente_id?: string;
          peca_id?: string;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardadas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardadas_peca_id_fkey";
            columns: ["peca_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id"];
          },
        ];
      };
      interesses: {
        Row: {
          id: string;
          cliente_id: string;
          peca_id: string;
          status: "em_conversa" | "negociando" | "vendido" | "perdido";
          observacao: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          peca_id: string;
          status?: "em_conversa" | "negociando" | "vendido" | "perdido";
          observacao?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          peca_id?: string;
          status?: "em_conversa" | "negociando" | "vendido" | "perdido";
          observacao?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interesses_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interesses_peca_id_fkey";
            columns: ["peca_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id"];
          },
        ];
      };
      pecas: {
        Row: {
          id: string;
          slug: string;
          marca: string;
          modelo: string;
          condicao: "novo" | "seminovo" | "pre-owned";
          integralidade: "full-set" | "caixa-e-papeis" | "somente-relogio" | "relogio-e-caixa";
          referencia: string | null;
          calibre: string | null;
          diametro_mm: number | null;
          material_caixa: string | null;
          pulseira: string | null;
          mostrador: string | null;
          ano_cartao: number | null;
          preco_centavos: number;
          disponivel: boolean;
          consignada: boolean;
          historia: string | null;
          notas_estado: string | null;
          criado_em: string;
          atualizado_em: string;
          estado: "disponivel" | "reservada" | "vendida";
        };
        Insert: {
          id?: string;
          slug: string;
          marca: string;
          modelo: string;
          condicao: "novo" | "seminovo" | "pre-owned";
          integralidade: "full-set" | "caixa-e-papeis" | "somente-relogio" | "relogio-e-caixa";
          referencia?: string | null;
          calibre?: string | null;
          diametro_mm?: number | null;
          material_caixa?: string | null;
          pulseira?: string | null;
          mostrador?: string | null;
          ano_cartao?: number | null;
          preco_centavos: number;
          disponivel?: boolean;
          consignada?: boolean;
          historia?: string | null;
          notas_estado?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          estado?: "disponivel" | "reservada" | "vendida";
        };
        Update: {
          id?: string;
          slug?: string;
          marca?: string;
          modelo?: string;
          condicao?: "novo" | "seminovo" | "pre-owned";
          integralidade?: "full-set" | "caixa-e-papeis" | "somente-relogio" | "relogio-e-caixa";
          referencia?: string | null;
          calibre?: string | null;
          diametro_mm?: number | null;
          material_caixa?: string | null;
          pulseira?: string | null;
          mostrador?: string | null;
          ano_cartao?: number | null;
          preco_centavos?: number;
          disponivel?: boolean;
          consignada?: boolean;
          historia?: string | null;
          notas_estado?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          estado?: "disponivel" | "reservada" | "vendida";
        };
        Relationships: [
        ];
      };
      propostas: {
        Row: {
          id: string;
          cliente_id: string | null;
          nome: string;
          contato: string;
          intencao: string;
          marca: string;
          modelo: string | null;
          referencia: string | null;
          ano: string | null;
          integralidade: string | null;
          observacao: string | null;
          status: "nova" | "em_avaliacao" | "recusada" | "fechada";
          criado_em: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string | null;
          nome: string;
          contato: string;
          intencao: string;
          marca: string;
          modelo?: string | null;
          referencia?: string | null;
          ano?: string | null;
          integralidade?: string | null;
          observacao?: string | null;
          status?: "nova" | "em_avaliacao" | "recusada" | "fechada";
          criado_em?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string | null;
          nome?: string;
          contato?: string;
          intencao?: string;
          marca?: string;
          modelo?: string | null;
          referencia?: string | null;
          ano?: string | null;
          integralidade?: string | null;
          observacao?: string | null;
          status?: "nova" | "em_avaliacao" | "recusada" | "fechada";
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      solicitacoes_acesso: {
        Row: {
          id: number;
          nome: string;
          email: string;
          telefone: string;
          observacao: string | null;
          criado_em: string;
          resolvido_em: string | null;
        };
        Insert: {
          id?: number;
          nome: string;
          email: string;
          telefone: string;
          observacao?: string | null;
          criado_em?: string;
          resolvido_em?: string | null;
        };
        Update: {
          id?: number;
          nome?: string;
          email?: string;
          telefone?: string;
          observacao?: string | null;
          criado_em?: string;
          resolvido_em?: string | null;
        };
        Relationships: [
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      mover_foto: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      sincroniza_disponivel: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      toca_atualizado_em: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      condicao: "novo" | "seminovo" | "pre-owned";
      estado_peca: "disponivel" | "reservada" | "vendida";
      integralidade: "full-set" | "caixa-e-papeis" | "somente-relogio" | "relogio-e-caixa";
      status_cliente: "ativo" | "pendente" | "recusado" | "inativo";
      status_interesse: "em_conversa" | "negociando" | "vendido" | "perdido";
      status_proposta: "nova" | "em_avaliacao" | "recusada" | "fechada";
      tipo_evento: "acesso" | "viu_peca" | "foi_whatsapp";
    };
    CompositeTypes: { [_ in never]: never };
  };
}
