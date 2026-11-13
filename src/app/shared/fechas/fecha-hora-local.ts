import { FechaFiltro, fechaFiltroParaApi } from './fecha-filtro';

export function horaLocal(fecha: Date): string {
  return [fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()]
    .map(valor => String(valor).padStart(2, '0')).join(':');
}

export function instanteLocal(fecha: FechaFiltro, hora: string): Date | null {
  const fechaTexto = fechaFiltroParaApi(fecha);
  const partesFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaTexto);
  const partesHora = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(hora);
  if (!partesFecha || !partesHora) return null;

  const [, anio, mes, dia] = partesFecha.map(Number);
  const horas = Number(partesHora[1]);
  const minutos = Number(partesHora[2]);
  const segundos = Number(partesHora[3] || 0);
  const instante = new Date(anio, mes - 1, dia, horas, minutos, segundos);
  return instante.getFullYear() === anio && instante.getMonth() === mes - 1 &&
    instante.getDate() === dia && instante.getHours() === horas &&
    instante.getMinutes() === minutos && instante.getSeconds() === segundos
    ? instante
    : null;
}
