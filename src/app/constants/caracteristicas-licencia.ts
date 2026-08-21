/**
 * Catálogo central de características de licencia.
 *
 * Es el espejo exacto de `Core/Constants/CaracteristicasLicencia.cs` en el
 * backend. Ningún componente debe volver a escribir un código a mano: si un
 * código cambia, cambia aquí y el compilador señala el resto.
 */
export const CARACTERISTICAS_LICENCIA = {
  VentasMesa: 'ventas.mesa',
  VentasParaLlevar: 'ventas.para_llevar',
  VentasDelivery: 'ventas.delivery',
  VentasEntradas: 'ventas.entradas',
  OperacionCaja: 'operacion.caja',
  OperacionComprobantes: 'operacion.comprobantes',
  OperacionReportes: 'operacion.reportes',
  PersonalControlHorario: 'personal.control_horario',
  VentasReservasOnline: 'ventas.reservas_online',
  AlmacenGestion: 'almacen.gestion',
  AlmacenCompras: 'almacen.compras',
  AlmacenCapturaDocumentosIa: 'almacen.captura_documentos_ia',
  AlmacenInventarios: 'almacen.inventarios',
  AlmacenKardex: 'almacen.kardex',
  AlmacenRecetas: 'almacen.recetas',
  VentasDescuentos: 'ventas.descuentos',
  VentasPrecuenta: 'ventas.precuenta',
  VentasCorreccionDocumentos: 'ventas.correccion_documentos',
  VentasPromociones: 'ventas.promociones',
  DeliverySeguimiento: 'delivery.seguimiento',
  ProductosMenus: 'productos.menus',
  ReportesSeguimientoComandas: 'reportes.seguimiento_comandas',
  ReportesComisionAnfitrionas: 'reportes.comision_anfitrionas',
  LimiteUsuarios: 'limites.usuarios',
  LimiteEstaciones: 'limites.estaciones',
  LimiteComprobantesMensuales: 'limites.comprobantes_mensuales',
  LimiteDocumentosCompraIaMensuales: 'limites.documentos_compra_ia_mensuales',
  LimiteCanalesElegibles: 'limites.canales_elegibles',
} as const;

/** Código válido del catálogo. */
export type CodigoCaracteristica =
  (typeof CARACTERISTICAS_LICENCIA)[keyof typeof CARACTERISTICAS_LICENCIA];

/**
 * Una exigencia de licencia: uno o varios códigos que deben cumplirse a la vez.
 *
 * Refleja cómo compone `RequireLicenseFeatureAttribute` en el backend, que es
 * `AllowMultiple` y por tanto evalúa en AND. Un endpoint protegido con dos
 * atributos se declara aquí como array.
 */
export type ExigenciaLicencia = CodigoCaracteristica | readonly CodigoCaracteristica[];

/**
 * Dependencias entre características, espejo de la tabla
 * `caracteristica_licencia_dependencias` sembrada en la migración
 * `20260806170000_AddPortalLicenseCharacteristics`.
 *
 * El backend las resuelve de forma recursiva en `LicenciaTenantValidator`; aquí
 * se replican para que la UI oculte exactamente lo mismo que la API rechazaría
 * y no se muestre una opción que acabaría en 403.
 */
export const DEPENDENCIAS_CARACTERISTICA: Readonly<
  Partial<Record<CodigoCaracteristica, readonly CodigoCaracteristica[]>>
> = {
  [CARACTERISTICAS_LICENCIA.VentasEntradas]: [CARACTERISTICAS_LICENCIA.VentasMesa],
  [CARACTERISTICAS_LICENCIA.VentasPromociones]: [CARACTERISTICAS_LICENCIA.OperacionComprobantes],
  [CARACTERISTICAS_LICENCIA.VentasReservasOnline]: [CARACTERISTICAS_LICENCIA.VentasMesa],
  [CARACTERISTICAS_LICENCIA.AlmacenCompras]: [CARACTERISTICAS_LICENCIA.AlmacenGestion],
  [CARACTERISTICAS_LICENCIA.AlmacenCapturaDocumentosIa]: [CARACTERISTICAS_LICENCIA.AlmacenCompras],
  [CARACTERISTICAS_LICENCIA.AlmacenInventarios]: [CARACTERISTICAS_LICENCIA.AlmacenGestion],
  [CARACTERISTICAS_LICENCIA.AlmacenKardex]: [CARACTERISTICAS_LICENCIA.AlmacenGestion],
  [CARACTERISTICAS_LICENCIA.AlmacenRecetas]: [CARACTERISTICAS_LICENCIA.AlmacenGestion],
  [CARACTERISTICAS_LICENCIA.DeliverySeguimiento]: [CARACTERISTICAS_LICENCIA.VentasDelivery],
  [CARACTERISTICAS_LICENCIA.ReportesComisionAnfitrionas]: [CARACTERISTICAS_LICENCIA.VentasEntradas],
};

/**
 * Expande una exigencia a la lista completa de códigos que deben estar
 * habilitados, incluidas las dependencias transitivas.
 */
export function expandirExigencia(
  exigencia: ExigenciaLicencia,
): CodigoCaracteristica[] {
  const pendientes = Array.isArray(exigencia)
    ? [...(exigencia as readonly CodigoCaracteristica[])]
    : [exigencia as CodigoCaracteristica];
  const resueltas = new Set<CodigoCaracteristica>();

  while (pendientes.length > 0) {
    const codigo = pendientes.pop()!;
    if (resueltas.has(codigo)) {
      continue;
    }
    resueltas.add(codigo);
    pendientes.push(...(DEPENDENCIAS_CARACTERISTICA[codigo] ?? []));
  }

  return [...resueltas];
}
