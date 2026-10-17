import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  InformacionLegalPagoPublica,
  RegistrarLibroReclamacionPublico,
} from 'src/app/models/pago-cuenta-online-legal.models';
import { HeaderService } from 'src/app/services/header.service';
import { PagoCuentaOnlineLegalService } from 'src/app/services/pago-cuenta-online-legal.service';

type PaginaLegal = 'terminos' | 'cambios-devoluciones' | 'libro-reclamaciones';

@Component({
  selector: 'app-pago-cuenta-legal',
  templateUrl: './pago-cuenta-legal.component.html',
})
export class PagoCuentaLegalComponent implements OnInit, OnDestroy {
  pagina: PaginaLegal = 'terminos';
  informacion?: InformacionLegalPagoPublica;
  cargando = true;
  enviando = false;
  error = '';
  resultadoCodigo = '';
  reclamacion: RegistrarLibroReclamacionPublico = this.nuevaReclamacion();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: PagoCuentaOnlineLegalService,
    private readonly headerService: HeaderService,
  ) {}

  ngOnInit(): void {
    this.headerService.hideHeader();
    const pagina = this.route.snapshot.paramMap.get('pagina');
    if (pagina === 'terminos' || pagina === 'cambios-devoluciones' || pagina === 'libro-reclamaciones') {
      this.pagina = pagina;
    }

    this.service.obtenerInformacion()
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: response => (this.informacion = response.Data),
        error: error => {
          this.error = error?.error?.Message
            || 'No pudimos cargar la información pública de este negocio.';
        },
      });
  }

  ngOnDestroy(): void {
    this.headerService.showHeader();
  }

  get titulo(): string {
    switch (this.pagina) {
      case 'cambios-devoluciones': return 'Cambios, cancelaciones y devoluciones';
      case 'libro-reclamaciones': return 'Libro de Reclamaciones';
      default: return 'Términos y condiciones';
    }
  }

  registrar(): void {
    if (this.enviando || !this.formularioValido) return;
    this.enviando = true;
    this.error = '';
    this.service.registrarLibroReclamaciones({
      ...this.reclamacion,
      NombreConsumidor: this.reclamacion.NombreConsumidor.trim(),
      TipoDocumento: this.reclamacion.TipoDocumento.trim(),
      NumeroDocumento: this.reclamacion.NumeroDocumento.trim(),
      Correo: this.reclamacion.Correo.trim(),
      Telefono: this.reclamacion.Telefono?.trim() || undefined,
      Direccion: this.reclamacion.Direccion.trim(),
      BienContratado: this.reclamacion.BienContratado.trim(),
      Detalle: this.reclamacion.Detalle.trim(),
      PedidoConsumidor: this.reclamacion.PedidoConsumidor.trim(),
    }).pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: response => {
          this.resultadoCodigo = response.Data.Codigo;
          this.reclamacion = this.nuevaReclamacion();
        },
        error: error => {
          this.error = error?.error?.Message
            || 'No se pudo registrar tu solicitud. Inténtalo nuevamente.';
        },
      });
  }

  get formularioValido(): boolean {
    const form = this.reclamacion;
    return !!form.NombreConsumidor.trim()
      && !!form.TipoDocumento.trim()
      && !!form.NumeroDocumento.trim()
      && !!form.Correo.trim()
      && !!form.Direccion.trim()
      && !!form.BienContratado.trim()
      && !!form.Detalle.trim()
      && !!form.PedidoConsumidor.trim()
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Correo.trim());
  }

  private nuevaReclamacion(): RegistrarLibroReclamacionPublico {
    return {
      Tipo: 'reclamo',
      NombreConsumidor: '',
      TipoDocumento: 'DNI',
      NumeroDocumento: '',
      Correo: '',
      Telefono: '',
      Direccion: '',
      BienContratado: '',
      MontoReclamado: undefined,
      Detalle: '',
      PedidoConsumidor: '',
    };
  }
}
