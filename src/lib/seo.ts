// Datos del negocio y helpers de SEO (canonical, JSON-LD) compartidos por todas
// las páginas. "Lío" es una palabra corriente: el nombre siempre va junto a
// "El Bonillo" para que Google no lo confunda con otra cosa.

/** Dominio canónico (www). Debe coincidir con `site` de astro.config.mjs. */
export const SITE_URL = "https://www.liopub.com";

export const NEGOCIO = {
  /** Nombre tal cual aparece en la ficha de Google. */
  nombre: "Lío Music Pub",
  nombreCompleto: "Lío Music Pub · El Bonillo",
  instagram: "https://www.instagram.com/lioelbonillo/",
  instagramHandle: "@lioelbonillo",
  /** Enlace de Google Maps ya usado en la sección "Info" de la portada. */
  mapsUrl: "https://maps.app.goo.gl/9XWcoUGiDwr2wAKz7",
  direccion: {
    calle: "Plaza Mayor, 6",
    localidad: "El Bonillo",
    provincia: "Albacete",
    cp: "02610",
    pais: "ES",
  },
  geo: { lat: 38.95044287201614, lng: -2.5398941420405077 },
} as const;

export const CASINO_URL = "https://www.casinoelbonillo.com/";

/**
 * Imagen OG por defecto (1200×630, JPEG ligero, logo centrado; plantilla en
 * tools/og-lio.html). Si se cambia, usar un nombre de archivo nuevo: WhatsApp y
 * las redes guardan en caché la vista previa por URL de imagen.
 */
export const OG_DEFAULT = "/img/og-lio.jpg";

/**
 * URL absoluta y canónica de una ruta interna. Todas las páginas (salvo la
 * raíz) acaban en "/", igual que las genera @astrojs/sitemap, para que
 * canonical y sitemap coincidan siempre.
 */
export function urlCanonica(ruta: string): string {
  const [path] = ruta.split(/[?#]/);
  const conBarra = path === "/" || path.endsWith("/") ? path : `${path}/`;
  return new URL(conBarra, SITE_URL).href;
}

/** URL absoluta (sin normalizar la barra final): imágenes, ficheros… */
export function urlAbsoluta(ruta: string): string {
  return new URL(ruta, SITE_URL).href;
}

export function direccionJsonLd() {
  const d = NEGOCIO.direccion;
  return {
    "@type": "PostalAddress",
    streetAddress: d.calle,
    addressLocality: d.localidad,
    addressRegion: d.provincia,
    postalCode: d.cp,
    addressCountry: d.pais,
  };
}

/** El local como `Place` (para `location` de los eventos). */
export function lugarJsonLd() {
  return {
    "@type": "Place",
    name: `${NEGOCIO.nombre}, El Bonillo`,
    address: direccionJsonLd(),
    geo: {
      "@type": "GeoCoordinates",
      latitude: NEGOCIO.geo.lat,
      longitude: NEGOCIO.geo.lng,
    },
  };
}

/** Referencia corta al negocio (organizer/publisher/author). */
export function organizacionJsonLd() {
  return {
    "@type": "BarOrPub",
    "@id": `${SITE_URL}/#negocio`,
    name: NEGOCIO.nombre,
    url: `${SITE_URL}/`,
  };
}

/**
 * Ficha completa del negocio para la portada. Sin horario a propósito:
 * está pendiente de que lo confirme el cliente.
 */
export function negocioJsonLd(descripcion: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    "@id": `${SITE_URL}/#negocio`,
    name: NEGOCIO.nombre,
    alternateName: "Lío El Bonillo",
    description: descripcion,
    url: `${SITE_URL}/`,
    image: urlAbsoluta(OG_DEFAULT),
    address: direccionJsonLd(),
    geo: {
      "@type": "GeoCoordinates",
      latitude: NEGOCIO.geo.lat,
      longitude: NEGOCIO.geo.lng,
    },
    hasMap: NEGOCIO.mapsUrl,
    sameAs: [NEGOCIO.instagram],
  };
}

export interface Miga {
  nombre: string;
  ruta: string;
}

export function breadcrumbJsonLd(migas: Miga[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: urlCanonica(m.ruta),
    })),
  };
}
