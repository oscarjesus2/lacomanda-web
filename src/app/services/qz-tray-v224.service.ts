import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as RSVP from 'rsvp';
declare var qz: any;

export interface ContextoDocumentoImpresionPedido {
  loteId: string;
  idPedido: number;
  nroCuenta: number;
  documentoId: string;
  totalDocumentos: number;
}

export interface LoteImpresionPedidoCompletado {
  loteId: string;
  idPedido: number;
  nroCuenta: number;
}

interface DocumentoImpresionPendiente {
  documento: string;
  impresora: string;
  contexto?: ContextoDocumentoImpresionPedido;
}

interface EstadoLoteImpresionPedido {
  idPedido: number;
  nroCuenta: number;
  totalDocumentos: number;
  documentosImpresos: Set<string>;
}

@Injectable({
  providedIn: 'root'
})
export class QzTrayV224Service {

  private privateKeyPath: string = 'assets/signing/private-key.pem';
  private privateDigitalCertificatePath: string = 'assets/signing/certificate.pem';

  /** Cada cuanto se reintenta la cola mientras la impresora no responda. */
  private static readonly reintentoMs = 15_000;
  /** Tope de seguridad: una impresora caida toda la tarde no debe crecer sin fin. */
  private static readonly maxPendientes = 50;

  private readonly pendientes: DocumentoImpresionPendiente[] = [];
  private readonly pendientesSubject = new BehaviorSubject<number>(0);
  /** Documentos esperando a que la impresora vuelva. */
  readonly pendientes$ = this.pendientesSubject.asObservable();

  private readonly lotes = new Map<string, EstadoLoteImpresionPedido>();
  private readonly lotesCompletadosSubject = new Subject<LoteImpresionPedidoCompletado>();
  /** Lotes cuya última comanda pendiente ya fue aceptada por QZ. */
  readonly lotesCompletados$ = this.lotesCompletadosSubject.asObservable();

  private temporizadorReintento?: ReturnType<typeof setTimeout>;
  /** Evita que un reintento fallido vuelva a encolar el mismo documento. */
  private reintentandoCola = false;

  /**
   * Impresoras instaladas en este equipo. QZ obtiene la lista desde el sistema
   * operativo; conservarla evita consultar el spooler antes de cada comanda.
   */
  private impresorasInstaladas = new Map<string, string>();
  private cargaImpresorasInstaladas?: Promise<void>;
  private impresorasCargadas = false;

  private readonly confianzaSubject = new BehaviorSubject<boolean | null>(null);
  /**
   * Si QZ Tray acepta las peticiones firmadas de este sitio. null mientras no
   * se sepa. Lo alimenta cualquier llamada firmada, no solo la comprobacion
   * inicial: asi una impresion rechazada actualiza el aviso de la caja.
   */
  readonly confianza$ = this.confianzaSubject.asObservable();

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {
    // Configuración para asegurar que las conexiones sean seguras
    qz.api.setSha256Type(data => {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(hash =>
        Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      );
    });

    // Asegurarse de que QZ Tray use RSVP para las promesas
    qz.api.setPromiseType(function (promise) {
      return new RSVP.Promise(function (resolve, reject) {
        if (typeof promise === 'function') {
          promise(resolve, reject);
        } else if (promise.then) {
          promise.then(resolve).catch(reject);
        } else {
          reject(new Error("El valor pasado no es una promesa válida"));
        }
      });
    });
  }

  // Función para verificar si el archivo existe
  private async fileExists(path: string): Promise<boolean> {
    try {
      await this.http.get(path, { responseType: 'text' }).toPromise();
      return true;
    } catch (error) {
      console.error(`Archivo no encontrado: ${path}`, error);
      return false;
    }
  }

  // Cargar el contenido de la clave privada si el archivo existe
  private async loadPrivateKey(): Promise<string> {
    const exists = await this.fileExists(this.privateKeyPath);
    if (exists) {
      return this.http.get(this.privateKeyPath, { responseType: 'text' }).toPromise();
    } else {
      throw new Error('La clave privada no se encuentra en el directorio especificado.');
    }
  }

  private async loadDigitalCertificateKey(): Promise<string> {
    const exists = await this.fileExists(this.privateDigitalCertificatePath);
    if (exists) {
      return this.http.get(this.privateDigitalCertificatePath, { responseType: 'text' }).toPromise();
    } else {
      throw new Error('El certificado digital no se encuentra en el directorio especificado.');
    }
  }

  // Función para convertir la clave PEM a ArrayBuffer
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64Lines = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '').trim();
    const b64 = b64Lines.replace(/\n/g, '');
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async connect(): Promise<void> {
    if (!qz.websocket.isActive()) {
      try {
        const digitalCertificate = await this.loadDigitalCertificateKey(); // Esperar a que se cargue el certificado
        const privateKeyPem = await this.loadPrivateKey(); // Cargar la clave privada

        // Usar el certificado digital desde la cadena de texto
        qz.security.setCertificatePromise((resolve, reject) => {
          resolve(digitalCertificate); // Pasar el certificado cargado
        });

        qz.security.setSignatureAlgorithm("SHA512"); // Since 2.1
        qz.security.setSignaturePromise(async (toSign) => {
          try {
            const privateKeyPem = await this.loadPrivateKey();
            const keyBuffer = this.pemToArrayBuffer(privateKeyPem);
            const privateKey = await crypto.subtle.importKey(
              "pkcs8",
              keyBuffer,
              {
                name: "RSASSA-PKCS1-v1_5",
                hash: { name: "SHA-512" }  // Cambiado a SHA-512
              },
              true,
              ["sign"]
            );

            const signature = await crypto.subtle.sign(
              "RSASSA-PKCS1-v1_5",
              privateKey,
              new TextEncoder().encode(toSign)
            );

            return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
          } catch (error) {
            console.error('Error al firmar los datos:', error);
            throw new Error('Error en la firma de datos');
          }
        });

        await qz.websocket.connect(); // Conectar con QZ Tray

        // La lista pertenece a la conexión/equipo actual. Si QZ vuelve a
        // conectarse se reconstruye para no conservar nombres obsoletos.
        this.impresorasCargadas = false;
        this.impresorasInstaladas.clear();

      } catch (error) {
        console.error('Error al conectar con QZ Tray:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (qz.websocket.isActive()) {
      try {
        await qz.websocket.disconnect();
      } catch (error) {
        console.error('Error al desconectar de QZ Tray:', error);
      }
    }
  }

  async printPDF(
    ByteTicket: any,
    printerName: string,
    permitirImpresoraPredeterminadaComoRespaldo: boolean = true,
    desconectarAlFinalizar: boolean = true,
    permitirDialogoNativoComoRespaldo: boolean = true,
    contexto?: ContextoDocumentoImpresionPedido,
    encolarFalloTransitorio: boolean = true,
  ): Promise<boolean> {
    // Distingue un problema de configuracion (QZ ausente o que nos rechaza) de
    // uno de la impresora. El primero no se arregla solo; el segundo si.
    let puenteOperativo = false;

    try {
      if (!this.isBase64(ByteTicket)) {
        throw new Error('El documento recibido no está codificado correctamente en base64.');
      }

      await this.connect();
      puenteOperativo = true;
      const data = [{
        type: 'pdf',
        format: 'base64',
        data: ByteTicket,
      }];
      const impresora = printerName?.trim();
      const usarPredeterminada = !impresora
        || impresora.toUpperCase() === 'PREDETERMINADA';

      if (usarPredeterminada) {
        await this.printOnDefault(data);
        this.registrarDocumentoImpreso(contexto);
        return true;
      }

      const impresoraInstalada = await this.buscarImpresoraInstalada(impresora);
      if (!impresoraInstalada && permitirImpresoraPredeterminadaComoRespaldo) {
        console.warn(
          `La impresora ${impresora} no está instalada en este equipo; se usará la predeterminada.`,
        );
        await this.printOnDefault(data);
        this.registrarDocumentoImpreso(contexto);
        return true;
      }

      try {
        await qz.print(qz.configs.create(impresoraInstalada ?? impresora), data);
        this.registrarConfianza(true);
        console.log(`Imprimiendo en la impresora ${impresora}`);
        this.registrarDocumentoImpreso(contexto);
        return true;
      } catch (error) {
        if (!permitirImpresoraPredeterminadaComoRespaldo
            || !this.isPrinterNotFoundError(error)) {
          throw error;
        }

        console.warn(
          `La impresora ${impresora} no existe en este equipo; se usará la predeterminada.`,
        );
        await this.printOnDefault(data);
        this.registrarDocumentoImpreso(contexto);
        return true;
      }
    } catch (error) {
      console.error('Error al imprimir:', error);

      // Que QZ Tray rechace la peticion no es un fallo de impresion: es que no
      // confia en el sitio. Eso es configuracion, no se arregla esperando.
      if (this.esPeticionBloqueada(error)) {
        this.registrarConfianza(false);
        puenteOperativo = false;
      }

      // Con QZ operativo el fallo es de la impresora: apagada, sin papel o
      // atascada. Es transitorio, asi que el documento espera en cola y se
      // reintenta solo. Abrir aqui el dialogo del navegador seria secuestrar
      // la pantalla del cajero a mitad de servicio para nada.
      if (puenteOperativo) {
        if (encolarFalloTransitorio && !this.reintentandoCola) {
          this.encolar(ByteTicket, printerName, contexto);
        }
        return false;
      }

      // Sin QZ no hay nada que esperar: el ticket sale por el dialogo del
      // navegador, que es peor pero no depende de ninguna configuracion.
      if (permitirDialogoNativoComoRespaldo && this.isBase64(ByteTicket)) {
        const impreso = this.imprimirConDialogoNativo(ByteTicket);
        if (impreso) this.registrarDocumentoImpreso(contexto);
        return impreso;
      }
      return false;
    } finally {
      if (desconectarAlFinalizar) {
        await this.disconnect();
      }
    }
  }

  /**
   * Respaldo sin permisos: carga el PDF en un iframe oculto y abre el dialogo
   * de impresion del navegador.
   */
  private imprimirConDialogoNativo(ByteTicket: string): boolean {
    try {
      const url = URL.createObjectURL(this.base64ToPdfBlob(ByteTicket));
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // El dialogo nativo es sincrono pero no avisa al cerrarse; se libera
        // con holgura para no cortar una impresion en curso.
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60_000);
      };

      iframe.src = url;
      document.body.appendChild(iframe);
      return true;
    } catch (error) {
      console.error('No se pudo abrir el diálogo de impresión del navegador:', error);
      return false;
    }
  }

  private base64ToPdfBlob(base64: string): Blob {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'application/pdf' });
  }

  private async printOnDefault(data: any[]): Promise<void> {
    const defaultPrinter = await qz.printers.getDefault();
    if (!defaultPrinter) {
      throw new Error('Este equipo no tiene una impresora predeterminada configurada.');
    }

    await qz.print(qz.configs.create(defaultPrinter), data);
    this.registrarConfianza(true);
    console.log(`Imprimiendo en la impresora predeterminada ${defaultPrinter}`);
  }

  private normalizarNombreImpresora(nombre: string): string {
    return nombre.trim().toLocaleLowerCase();
  }

  /**
   * Resuelve el nombre exacto informado por el sistema operativo. La primera
   * comanda carga todas las impresoras y las siguientes consultan solo memoria.
   * No se consulta el estado: una impresora instalada puede estar temporalmente
   * apagada y el sistema operativo conservará sus trabajos en cola.
   */
  private async buscarImpresoraInstalada(nombre: string): Promise<string | null> {
    await this.cargarImpresorasInstaladas();
    const clave = this.normalizarNombreImpresora(nombre);
    return this.impresorasInstaladas.get(clave) ?? null;
  }

  private async cargarImpresorasInstaladas(): Promise<void> {
    if (this.impresorasCargadas) return;
    if (this.cargaImpresorasInstaladas) {
      await this.cargaImpresorasInstaladas;
      return;
    }

    this.cargaImpresorasInstaladas = (async () => {
      const resultado = await qz.printers.find();
      const nombres = Array.isArray(resultado) ? resultado : [resultado];
      const nuevas = new Map<string, string>();

      nombres
        .map(nombre => String(nombre ?? '').trim())
        .filter(Boolean)
        .forEach(nombre => nuevas.set(this.normalizarNombreImpresora(nombre), nombre));

      this.impresorasInstaladas = nuevas;
      this.impresorasCargadas = true;
    })();

    try {
      await this.cargaImpresorasInstaladas;
    } finally {
      this.cargaImpresorasInstaladas = undefined;
    }
  }

  /**
   * Imprime un trabajo cuya persistencia y reintentos pertenecen a la cola
   * del backend. Evita duplicarlo también en la cola temporal del navegador.
   *
   * Si la impresora configurada no existe en este equipo se usa la
   * predeterminada; si existe, QZ entrega el documento al spooler aunque la
   * impresora esté temporalmente apagada.
   */
  async printPDFDesdeColaServidor(
    documento: string,
    impresora: string,
  ): Promise<boolean> {
    return this.printPDF(
      documento,
      impresora,
      true,
      false,
      false,
      undefined,
      false,
    );
  }

  private isPrinterNotFoundError(error: unknown): boolean {
    const message = error instanceof Error
      ? error.message
      : String(error ?? '');
    const normalized = message.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return [
      'printer not found',
      'printer does not exist',
      'invalid printer',
      'unable to find printer',
      'cannot find printer',
      'no such printer',
      'impresora no encontrada',
      'impresora no existe',
      'nombre de impresora no valido',
    ].some(fragment => normalized.includes(fragment));
  }

  /**
   * Encola un documento que no pudo salir por un fallo de la impresora y
   * programa el reintento. La cola vive en memoria a proposito: un ticket
   * rescatado al dia siguiente no le sirve a nadie.
   */
  private encolar(
    documento: string,
    impresora: string,
    contexto?: ContextoDocumentoImpresionPedido,
  ): void {
    if (this.pendientes.length >= QzTrayV224Service.maxPendientes) {
      console.warn('Cola de impresión llena; se descarta el documento más antiguo.');
      this.pendientes.shift();
    }

    this.pendientes.push({ documento, impresora, contexto });
    this.publicarPendientes();
    this.programarReintento();
  }

  private programarReintento(): void {
    if (this.temporizadorReintento || !this.pendientes.length) return;

    this.temporizadorReintento = setTimeout(() => {
      this.temporizadorReintento = undefined;
      void this.vaciarCola();
    }, QzTrayV224Service.reintentoMs);
  }

  /**
   * Reintenta en orden y se detiene al primer fallo: si la impresora sigue
   * caida, insistir con el resto solo desordenaria los tickets.
   */
  private async vaciarCola(): Promise<void> {
    this.reintentandoCola = true;
    try {
      while (this.pendientes.length) {
        const siguiente = this.pendientes[0];
        const impreso = await this.printPDF(
          siguiente.documento,
          siguiente.impresora,
          true,
          false,
          false,
          siguiente.contexto,
        );
        if (!impreso) break;

        this.pendientes.shift();
        this.publicarPendientes();
      }
    } finally {
      this.reintentandoCola = false;
      await this.disconnect();
      this.programarReintento();
    }
  }

  private publicarPendientes(): void {
    this.zone.run(() => this.pendientesSubject.next(this.pendientes.length));
  }

  private registrarDocumentoImpreso(contexto?: ContextoDocumentoImpresionPedido): void {
    if (!contexto || contexto.totalDocumentos <= 0) return;

    let lote = this.lotes.get(contexto.loteId);
    if (!lote) {
      lote = {
        idPedido: contexto.idPedido,
        nroCuenta: contexto.nroCuenta,
        totalDocumentos: contexto.totalDocumentos,
        documentosImpresos: new Set<string>()
      };
      this.lotes.set(contexto.loteId, lote);
    }

    lote.documentosImpresos.add(contexto.documentoId);
    if (lote.documentosImpresos.size < lote.totalDocumentos) return;

    this.lotes.delete(contexto.loteId);
    this.zone.run(() => this.lotesCompletadosSubject.next({
      loteId: contexto.loteId,
      idPedido: lote!.idPedido,
      nroCuenta: lote!.nroCuenta
    }));
  }

  private registrarConfianza(confia: boolean): void {
    if (this.confianzaSubject.value === confia) return;

    // qz resuelve con RSVP, fuera de la zona de Angular: sin esto el estado
    // cambia pero la vista no se entera.
    this.zone.run(() => this.confianzaSubject.next(confia));
  }

  /**
   * QZ Tray responde "Request blocked" cuando el sitio no esta autorizado: o
   * falta importar el certificado en el Site Manager, o esta en su lista de
   * bloqueados. En ambos casos ninguna peticion firmada va a funcionar.
   */
  private esPeticionBloqueada(error: any): boolean {
    const mensaje = String(error?.message ?? error ?? '').toLowerCase();
    return mensaje.includes('blocked') || mensaje.includes('bloquead');
  }

  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  /**
   * Comprueba si QZ Tray confia en este sitio, es decir, si el certificado de
   * LaComanda esta en su Site Manager.
   *
   * No hay una API que lo pregunte, pero una llamada firmada lo delata: con el
   * certificado importado responde al instante y sin el QZ Tray abre un dialogo
   * en el escritorio, asi que la promesa se queda esperando al usuario. De ahi
   * que se resuelva por tiempo: es una heuristica, no una certeza.
   */
  async tieneCertificadoConfigurado(esperaMs: number = 3000): Promise<boolean> {
    try {
      await this.connect();

      const llamadaFirmada = Promise.resolve(qz.printers.find()).then(() => true);
      const espera = new Promise<boolean>(resolve => {
        setTimeout(() => resolve(false), esperaMs);
      });

      const confia = await Promise.race([llamadaFirmada, espera]);
      // Agotar la espera no prueba nada: solo dice que hay un dialogo abierto
      // en el escritorio, asi que no se publica como respuesta firme.
      if (confia) {
        this.registrarConfianza(true);
      }
      return confia;
    } catch (error) {
      if (this.esPeticionBloqueada(error)) {
        console.warn('QZ Tray rechaza este sitio: falta autorizar el certificado.');
        this.registrarConfianza(false);
        return false;
      }
      console.error('No se pudo comprobar la confianza de QZ Tray:', error);
      return false;
    }
  }

  async isQzTrayRunning(): Promise<boolean> {
    try {
      await this.connect();
      return qz.websocket.isActive();
    } catch (error) {
      console.error('QZ Tray no está corriendo:', error);
      return false;
    }
  }

  async listarImpresoras(): Promise<{
    Impresoras: string[];
    Predeterminada: string | null;
  }> {
    const yaEstabaConectado = qz.websocket.isActive();
    try {
      await this.connect();
      const encontradas = await qz.printers.find();
      const impresoras = (Array.isArray(encontradas) ? encontradas : [encontradas])
        .map(nombre => String(nombre ?? '').trim())
        .filter(nombre => !!nombre)
        .sort((a, b) => a.localeCompare(b));
      const predeterminada = String(await qz.printers.getDefault() ?? '').trim() || null;
      this.registrarConfianza(true);
      return { Impresoras: impresoras, Predeterminada: predeterminada };
    } finally {
      if (!yaEstabaConectado) {
        await this.disconnect();
      }
    }
  }

  async probarImpresora(
    nombreImpresora: string,
    contexto?: {
      Estacion: string;
      TipoDispositivo: string;
      Area: string;
    },
  ): Promise<void> {
    const yaEstabaConectado = qz.websocket.isActive();
    try {
      await this.connect();
      const solicitada = nombreImpresora?.trim();
      const impresora = !solicitada || solicitada.toUpperCase() === 'PREDETERMINADA'
        ? await qz.printers.getDefault()
        : solicitada;
      if (!impresora) {
        throw new Error('Este equipo no tiene una impresora predeterminada configurada.');
      }

      const fecha = new Date().toLocaleString();
      const estacion = this.escapeHtml(contexto?.Estacion || 'Sin identificar');
      const tipoDispositivo = this.escapeHtml(
        contexto?.TipoDispositivo || 'Desconocido',
      );
      const area = this.escapeHtml(contexto?.Area || 'Sin especificar');
      const impresoraSegura = this.escapeHtml(String(impresora));
      await qz.print(qz.configs.create(impresora), [{
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: `<html><body style="font-family:Arial;padding:10px">
          <h2 style="text-align:center">LaComanda</h2>
          <h3 style="text-align:center">PRUEBA DE IMPRESIÓN</h3><hr>
          <p><strong>Estación solicitante:</strong><br>${estacion}</p>
          <p><strong>Tipo de dispositivo:</strong><br>${tipoDispositivo}</p>
          <p><strong>Área:</strong><br>${area}</p>
          <p><strong>Impresora destino:</strong><br>${impresoraSegura}</p>
          <p><strong>Fecha local:</strong><br>${this.escapeHtml(fecha)}</p>
          <p><strong>Canal:</strong><br>QZ Tray directo</p><hr>
          <p style="text-align:center;color:#1e7a3d;font-weight:bold">
            COMUNICACIÓN E IMPRESIÓN CORRECTAS
          </p>
        </body></html>`,
      }]);
      this.registrarConfianza(true);
    } finally {
      if (!yaEstabaConectado) {
        await this.disconnect();
      }
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    })[character] ?? character);
  }

}
