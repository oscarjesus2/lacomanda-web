import {
  CartaIaPrevisualizacion,
  CartaIaProducto,
} from 'src/app/models/importacion-carta-ia.models';

export interface ResultadoIntegracionCarta {
  Previsualizacion: CartaIaPrevisualizacion;
  ProductosAgregados: number;
  DuplicadosOmitidos: number;
}

/**
 * Integra una nueva lectura en el borrador que el usuario ya está revisando.
 * El identificador inicial se conserva para que todas las tandas formen una
 * única sesión de importación y los cambios manuales previos no se pierdan.
 */
export function integrarPrevisualizacionCarta(
  actual: CartaIaPrevisualizacion | null,
  nueva: CartaIaPrevisualizacion,
): ResultadoIntegracionCarta {
  const productosActuales = actual?.Productos ?? [];
  const nombresIncluidos = new Set(
    productosActuales
      .map(producto => claveProducto(producto.NombreCorto, producto.NombreCompleto))
      .filter(Boolean),
  );
  const productosNuevos: CartaIaProducto[] = [];
  let duplicadosOmitidos = 0;

  for (const producto of nueva.Productos) {
    const clave = claveProducto(producto.NombreCorto, producto.NombreCompleto);
    if (clave && nombresIncluidos.has(clave)) {
      duplicadosOmitidos++;
      continue;
    }

    productosNuevos.push(producto);
    if (clave) {
      nombresIncluidos.add(clave);
    }
  }

  if (!actual) {
    return {
      Previsualizacion: {
        ...nueva,
        Advertencias: [...new Set(nueva.Advertencias)],
        Productos: productosNuevos,
      },
      ProductosAgregados: productosNuevos.length,
      DuplicadosOmitidos: duplicadosOmitidos,
    };
  }

  const pesoActual = Math.max(productosActuales.length, 1);
  const pesoNuevo = Math.max(nueva.Productos.length, 1);
  const confianza =
    ((actual.Confianza * pesoActual) + (nueva.Confianza * pesoNuevo)) /
    (pesoActual + pesoNuevo);
  const productos = [...productosActuales, ...productosNuevos];

  return {
    Previsualizacion: {
      IdOperacion: actual.IdOperacion,
      IdMoneda: actual.IdMoneda || nueva.IdMoneda,
      Confianza: confianza,
      RequiereRevision:
        actual.RequiereRevision ||
        nueva.RequiereRevision ||
        productos.some(producto => producto.RequiereRevision),
      Advertencias: [
        ...new Set([...actual.Advertencias, ...nueva.Advertencias]),
      ],
      Productos: productos,
    },
    ProductosAgregados: productosNuevos.length,
    DuplicadosOmitidos: duplicadosOmitidos,
  };
}

function claveProducto(nombreCorto?: string, nombreCompleto?: string): string {
  return normalizar(nombreCorto) || normalizar(nombreCompleto);
}

function normalizar(valor?: string): string {
  return (valor ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
