import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  EstadoImpresion,
  EstadoImpresionService,
} from '../services/estado-impresion.service';

@Component({
  selector: 'app-qz-tray-required',
  templateUrl: './qz-tray-required.component.html',
  styleUrls: ['./qz-tray-required.component.css']
})
export class QzTrayRequiredComponent implements OnInit {
  readonly qzTrayDownloadUrl = 'https://qz.io/download/';
  readonly certificateUrl = 'assets/signing/certificate.pem';
  readonly manualUrl = 'assets/manuales/manual-instalacion-configuracion-qz-tray.pdf';

  estado: EstadoImpresion = { disponible: false, motivo: 'qz-no-disponible' };
  comprobando = false;
  /** true tras un reintento fallido, para no acusar de nada al abrir la guia. */
  reintentoFallido = false;

  constructor(
    private readonly estadoImpresion: EstadoImpresionService,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.estado = this.estadoImpresion.estado;
  }

  /** El problema esta en el navegador, no en la instalacion de QZ Tray. */
  get esProblemaDePermiso(): boolean {
    return this.estado.motivo === 'permiso-denegado'
      || this.estado.motivo === 'permiso-pendiente';
  }

  /** Denegado es definitivo: el navegador ya no vuelve a preguntar solo. */
  get permisoDenegado(): boolean {
    return this.estado.motivo === 'permiso-denegado';
  }

  /** QZ Tray responde pero no confia en el sitio: falta importar el certificado. */
  get certificadoPendiente(): boolean {
    return this.estado.disponible && this.estado.certificadoConfigurado === false;
  }

  /**
   * Reintenta la conexion. Al nacer de un clic, el navegador muestra su
   * dialogo de permiso de forma fiable y el usuario sabe por que se lo pide.
   */
  async comprobarConexion(): Promise<void> {
    this.comprobando = true;
    this.reintentoFallido = false;
    try {
      this.estado = await this.estadoImpresion.comprobar(true);
      // Con el certificado pendiente no se vuelve atras: el paso que falta esta
      // justo en esta pagina y salir de aqui lo esconderia.
      if (this.estado.disponible && !this.certificadoPendiente) {
        this.location.back();
        return;
      }
      this.reintentoFallido = true;
    } finally {
      this.comprobando = false;
    }
  }
}
