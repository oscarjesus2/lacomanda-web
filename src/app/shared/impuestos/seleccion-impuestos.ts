const IMPUESTOS_NINGUNO = new Set(['NINGUNO_PE', 'NINGUNO_ES']);

export function ajustarSeleccionImpuestos(
  seleccion: string[],
  anterior: string[],
): string[] {
  const nuevos = seleccion.filter(id => !anterior.includes(id));
  const ningunoNuevo = nuevos.find(id => IMPUESTOS_NINGUNO.has(id));
  if (ningunoNuevo) return [ningunoNuevo];
  if (nuevos.length) return seleccion.filter(id => !IMPUESTOS_NINGUNO.has(id));
  return [...seleccion];
}
