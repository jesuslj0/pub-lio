# Lío El Bonillo

Web del **Lío El Bonillo**, un disco pub nocturno en El Bonillo (Albacete,
Castilla-La Mancha). El plan del finde: copas, tapas y cañas, con sonido y luz
de última generación.

## 🎉 El local

- **Dónde:** Plaza Mayor, El Bonillo (Albacete).
- **Cuándo:** viernes y sábado por la noche. Abre al caer la tarde y cierra
  cuando toca.
- **Qué hay:** copas, tapas y cañas · futbolín · diana · música en directo ·
  sonido y luz profesionales.

## 🌐 Qué hace la web

La web es el escaparate del finde y el punto de encuentro de la comunidad:

- **Cartel del finde.** El local publica su cartel de DJ, fiesta o evento como
  anuncio destacado. Solo hay uno activo a la vez.
- **Fotos del finde.** El público sube sus fotos de la noche, la comunidad las
  vota y la más votada gana el premio del finde siguiente.
  - Sin registro: solo la foto y un nombre (opcional). Máximo 3 fotos por
    persona y semana.
  - Cada persona puede votar una vez por foto; los votos se ven en tiempo real.
  - Las fotos pasan por **moderación** antes de aparecer en la galería.
- **Premio semanal.** Cada semana se destaca la foto **más votada** y el local
  marca la **ganadora** oficial, que se anuncia el finde siguiente.

## 🛠️ Panel de administración

Disponible en `/admin`, protegido por contraseña (acceso con la clave de
administración, guardada en una cookie de sesión). Desde ahí el local puede:

- **Moderar fotos:** aprobar o rechazar las fotos pendientes.
- **Elegir la ganadora:** marcar (o desmarcar) la foto ganadora de la semana.
- **Publicar carteles:** subir la imagen del cartel, su título, fechas y
  activarlo.

## 📷 Premio foto: cómo funciona

1. Subes tu foto del finde desde la web.
2. El local la revisa y la aprueba.
3. La comunidad vota durante la semana.
4. El finde siguiente se anuncia la ganadora y recoge su premio en el local.

## 🔍 Forense de votos (anti-fraude)

Herramienta de línea de comandos para revisar si una foto ha inflado votos con
auto-voto (abrir la web en varios navegadores para votarse). **No forma parte de
la web** y se ejecuta a mano desde la raíz del proyecto: [`scripts/votos-forense.mjs`](scripts/votos-forense.mjs).

Analiza los votos con dos señales: la **huella** del navegador (`fingerprint`) y
la **hora** de cada voto. No usa IP (no se guarda en la tabla `votos`), así que es
una **estimación heurística, no una prueba**.

```bash
# Informe (solo lectura) de la foto más votada cuyo autor contiene "amador":
node --env-file=.env.local scripts/votos-forense.mjs

# Informe de una foto concreta:
node --env-file=.env.local scripts/votos-forense.mjs --foto <UUID>

# Otro autor / ajustar sensibilidad de las ráfagas:
node --env-file=.env.local scripts/votos-forense.mjs --autor "amador" --ventana 120 --min-rafaga 3
```

El informe muestra el reparto de votos por hora, las **ráfagas** (votos
encadenados en pocos segundos), cuántas son de **huella nueva** y una estimación
de votos *probablemente reales* vs. *probablemente inflados*.

**Quitar votos es una decisión manual y va bloqueado por defecto:**

```bash
# SIMULA la purga de los votos de sospecha alta (NO borra nada):
node --env-file=.env.local scripts/votos-forense.mjs --quitar

# SIMULA la purga de una lista concreta que eliges tú:
node --env-file=.env.local scripts/votos-forense.mjs --quitar --ids id1,id2,id3

# EJECUTA de verdad (borra votos y recalcula votos_count):
node --env-file=.env.local scripts/votos-forense.mjs --quitar --ejecutar
```

Sin `--ejecutar` solo simula y no toca la base de datos. Requiere
`PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (por eso el
`--env-file`).

---

_Plaza Mayor · El Bonillo · Albacete · Castilla-La Mancha_
