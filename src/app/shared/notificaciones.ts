import Swal, { SweetAlertResult } from 'sweetalert2';

/**
 * Avisos al usuario, con una forma fija para cada intención.
 *
 * La idea es que la consistencia no venga de usar *un* estilo para todo, sino
 * de que cada intención use siempre el suyo. Si un borrado se avisara como una
 * nota discreta se borrarían cosas sin querer; y si un "Guardado" abriera un
 * modal habría que cerrarlo cada vez. Dar la misma forma a todo termina
 * volviéndolo invisible.
 *
 * Las cuatro intenciones y su forma:
 *
 * | Intención           | Forma                     | Por qué                                   |
 * |---------------------|---------------------------|-------------------------------------------|
 * | Explicar de antemano| nota fija en la plantilla | se lee antes de decidir, sin interrumpir  |
 * | Confirmar destructivo| modal bloqueante         | exige una respuesta deliberada            |
 * | Confirmar resultado | toast que se va solo      | informa sin robar el foco                 |
 * | Avisar de un error  | modal persistente         | no puede pasar desapercibido              |
 *
 * La primera no vive aquí: es un `<p>` junto a la acción, como el aviso de
 * Control horario ("Si registras la salida ahora, la pausa se cerrará…").
 * Un aviso preventivo dentro de un modal llega tarde por definición.
 */
export const Notificar = {
  /**
   * Resultado correcto de una acción. No bloquea ni pide confirmación.
   *
   * No usar cuando el flujo dependa de que el usuario lo cierre: el toast se
   * desvanece solo y la promesa no espera a que lo lea.
   */
  exito(titulo: string, detalle?: string): void {
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title: titulo,
      text: detalle || undefined,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
  },

  /**
   * Algo ha fallado. Persiste hasta que el usuario lo cierra.
   *
   * El detalle debería decir qué hacer, no solo qué pasó.
   */
  error(titulo: string, detalle?: string): Promise<SweetAlertResult> {
    return Swal.fire(titulo, detalle ?? '', 'error');
  },

  /** Aviso que no es un fallo pero requiere atención antes de seguir. */
  advertencia(titulo: string, detalle?: string): Promise<SweetAlertResult> {
    return Swal.fire(titulo, detalle ?? '', 'warning');
  },

  /**
   * Acción irreversible. Bloquea y exige una respuesta explícita.
   *
   * Devuelve `true` solo si el usuario confirmó.
   */
  async confirmar(opciones: {
    titulo: string;
    detalle?: string;
    textoConfirmar: string;
    textoCancelar: string;
  }): Promise<boolean> {
    const resultado = await Swal.fire({
      title: opciones.titulo,
      text: opciones.detalle,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: opciones.textoConfirmar,
      cancelButtonText: opciones.textoCancelar,
    });

    return resultado.isConfirmed === true;
  },
};
