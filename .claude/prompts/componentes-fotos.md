Tengo un proyecto Astro + React + Tailwind para "Lío El Bonillo", 
un disco pub nocturno. El .env.local ya está configurado con:
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_UPLOAD_PRESET
- ADMIN_SECRET

La base de datos Supabase ya tiene las tablas: fotos, votos, carteles.
El diseño usa estas CSS variables definidas en Base.astro:
--bg: #080810
--bg2: #0e0e1a
--surface: #13131f
--border: rgba(255,255,255,0.07)
--accent: #c8f026
--accent2: #7b2fff
--accent3: #ff2d6e
--text: #e8e8f0
--muted: #6b6b80
--font-display: 'Bebas Neue'
--font-body: 'DM Sans'
--font-mono: 'Space Mono'

Instala las dependencias necesarias:
npm install @supabase/supabase-js @fingerprintjs/fingerprintjs

Luego crea los siguientes archivos en orden:

─── 1. src/lib/supabase.ts ───
Cliente Supabase tipado. Exporta:
- supabase (cliente)
- getCurrentWeek(): string → devuelve semana ISO actual ej: '2025-W23'
- getWeekRange(semana: string): { inicio: Date, fin: Date }

─── 2. src/lib/cloudinary.ts ───
Exporta uploadToCloudinary(file: File): Promise<string>
Sube usando fetch a:
https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload
Con FormData: file + upload_preset
Devuelve la secure_url de la respuesta

─── 3. src/pages/api/check-limit.ts ───
POST. Recibe { fingerprint, ip }
Calcula semana actual con getCurrentWeek()
Consulta fotos donde fingerprint=X AND semana=X
Devuelve { allowed: boolean, count: number, limit: 3 }

─── 4. src/pages/api/upload-photo.ts ───
POST. Recibe { cloudinaryUrl, nombreAutor, fingerprint, ip }
Verifica límite otra vez (doble check server-side)
Inserta en fotos con estado='pendiente'
Devuelve { success: boolean, fotoId: string }

─── 5. src/pages/api/vote.ts ───
POST. Recibe { fotoId, fingerprint }
Inserta en votos (unique constraint evita duplicados)
Si va bien llama a la función incrementar_voto(fotoId) de Supabase
Devuelve { success: boolean, newCount?: number, reason?: string }

─── 6. src/pages/api/admin/moderate.ts ───
POST. Recibe { fotoId, accion: 'aprobar'|'rechazar', adminSecret }
Verifica adminSecret contra process.env.ADMIN_SECRET
Actualiza estado en fotos
Devuelve { success: boolean }

─── 7. src/components/PhotoUploader.tsx ───
Componente React con client:load
Estados: idle | previewing | uploading | success | error | limit_reached
UI:
- En idle: dos botones "Usar cámara" y "Subir de galería"
  · Cámara: input hidden con accept="image/*" capture="environment"
  · Galería: input hidden con accept="image/*" sin capture
- En previewing: muestra preview de la imagen + input nombre autor 
  (placeholder "Tu nombre, opcional" maxLength 20) + botón Confirmar + botón Cancelar
- En uploading: spinner con texto "Subiendo..."
- En success: mensaje "¡Foto enviada! Aparecerá tras revisión" 
- En error: mensaje de error + botón reintentar
- En limit_reached: "Ya tienes 3 fotos esta semana"
Flujo al confirmar:
  1. Obtiene fingerprint con FingerprintJS
  2. Llama a /api/check-limit
  3. Sube imagen a Cloudinary con uploadToCloudinary()
  4. Llama a /api/upload-photo con la URL resultante
  5. Cambia estado a success
CSS: usar variables --accent, --surface, --border, --text, --muted, --font-mono
Sin librerías de UI externas, CSS inline o módulos CSS puros

─── 8. src/components/PhotoGrid.tsx ───
Componente React con client:load
Props: semana (string, default: getCurrentWeek()), mostrarGanadora (boolean)
Al montar: carga fotos aprobadas de Supabase para esa semana
  ordenadas por votos_count desc
Suscripción Realtime a cambios en tabla fotos (filtro: semana=X AND estado=aprobada)
  para actualizar contadores sin recargar
Cada FotoCard muestra:
  - Imagen (object-fit cover, aspect-ratio 3/4)
  - Nombre autor abajo
  - Contador de votos
  - Botón "♥ Votar" que llama a /api/vote con fingerprint
  - Badge "★ Más votada" en la foto con votos_count más alto
  - Badge "🏆 Ganadora" si foto.ganadora === true
  - Estado voted guardado en localStorage: voted_${fotoId}
Grid: 4 col desktop, 2 tablet, 1 móvil
Loading state: 4 placeholders skeleton con animación pulse
Empty state: "No hay fotos esta semana. ¡Sé el primero!"
CSS: consistente con el diseño dark de la web

─── 9. src/components/CartelFinde.tsx ───
Componente React con client:load
Carga cartel con activo=true desde Supabase
Muestra: imagen, titulo, subtitulo, fecha_inicio y fecha_fin formateadas en español
Placeholder estilizado si no hay cartel activo
CSS: consistente con diseño dark

─── 10. src/pages/admin/index.astro ───
Protección: lee header 'x-admin-secret' o query param ?secret=X
Si no coincide con ADMIN_SECRET → redirige a /
Layout básico dark, sin los componentes animados del sitio principal
Dos secciones:
  A) Fotos pendientes: lista con imagen thumbnail, nombre autor, fecha
     Botones Aprobar (verde) y Rechazar (rojo) que llaman a /api/admin/moderate
     Cuando se aprueba o rechaza la foto desaparece de la lista sin recargar (fetch + update state)
  B) Carteles: formulario para subir nuevo cartel
     Campos: titulo, subtitulo, imagen_url, fecha_inicio, fecha_fin, activo (checkbox)
     Submit llama a /api/admin/cartel (créala también)

─── 11. src/pages/api/admin/cartel.ts ───
POST. Recibe los campos del cartel + adminSecret
Verifica adminSecret
Si activo=true, primero pone activo=false en todos los carteles existentes
Inserta nuevo cartel
Devuelve { success: boolean }

─── NOTAS FINALES ───
- Todo TypeScript estricto
- Manejo de errores con try/catch en todas las API routes
- Console.error en errores de servidor, nunca exponer stack traces al cliente
- Los inputs de file deben ser visualmente hidden, activados por botones estilizados
- Verificar que Astro tiene output: 'server' o 'hybrid' en astro.config.mjs
  para que las API routes funcionen. Si no, actualizarlo.