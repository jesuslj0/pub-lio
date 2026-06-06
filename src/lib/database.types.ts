// Tipos de la base de datos Supabase para "Lío El Bonillo".
// Ajusta los campos si tu esquema real difiere.

export type EstadoFoto = "pendiente" | "aprobada" | "rechazada";

export type Foto = {
  id: string;
  cloudinary_url: string;
  nombre_autor: string | null;
  fingerprint: string;
  ip: string | null;
  semana: string; // ej: '2025-W23'
  estado: EstadoFoto;
  votos_count: number;
  ganadora: boolean;
  created_at: string;
}

export type Voto = {
  id: string;
  foto_id: string;
  fingerprint: string;
  created_at: string;
}

export type Cartel = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagen_url: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
  created_at: string;
}

export type Premio = {
  id: string;
  titulo: string;
  descripcion: string | null;
  imagen_url: string | null;
  valido_hasta: string | null;
  activo: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      fotos: {
        Row: Foto;
        Insert: {
          id?: string;
          cloudinary_url: string;
          nombre_autor?: string | null;
          fingerprint: string;
          ip?: string | null;
          semana: string;
          estado?: EstadoFoto;
          votos_count?: number;
          ganadora?: boolean;
          created_at?: string;
        };
        Update: Partial<Foto>;
        Relationships: [];
      };
      votos: {
        Row: Voto;
        Insert: {
          id?: string;
          foto_id: string;
          fingerprint: string;
          created_at?: string;
        };
        Update: Partial<Voto>;
        Relationships: [];
      };
      carteles: {
        Row: Cartel;
        Insert: {
          id?: string;
          titulo: string;
          subtitulo?: string | null;
          imagen_url?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Cartel>;
        Relationships: [];
      };
      premios: {
        Row: Premio;
        Insert: {
          id?: string;
          titulo: string;
          descripcion?: string | null;
          imagen_url?: string | null;
          valido_hasta?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Premio>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      incrementar_voto: {
        Args: { foto_id: string };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
