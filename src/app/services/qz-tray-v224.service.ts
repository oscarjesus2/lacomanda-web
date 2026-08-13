import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as RSVP from 'rsvp';
declare var qz: any;

@Injectable({
  providedIn: 'root'
})
export class QzTrayV224Service {

  private privateKeyPath: string = 'assets/signing/private-key.pem';
  private privateDigitalCertificatePath: string = 'assets/signing/certificate.pem';

  constructor(private http: HttpClient) {
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
  ): Promise<boolean> {
    try {
      if (!this.isBase64(ByteTicket)) {
        throw new Error('El documento recibido no está codificado correctamente en base64.');
      }

      await this.connect();
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
        return true;
      }

      try {
        await qz.print(qz.configs.create(impresora), data);
        console.log(`Imprimiendo en la impresora ${impresora}`);
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
        return true;
      }
    } catch (error) {
      console.error('Error al imprimir:', error);

      // Sin QZ Tray el ticket sale igual por el dialogo del navegador. Es peor
      // experiencia (hay que confirmar y no corta el papel) pero no depende de
      // ningun permiso, asi que el negocio nunca se queda sin comprobante.
      if (permitirDialogoNativoComoRespaldo && this.isBase64(ByteTicket)) {
        return this.imprimirConDialogoNativo(ByteTicket);
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
    console.log(`Imprimiendo en la impresora predeterminada ${defaultPrinter}`);
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

  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
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
}
