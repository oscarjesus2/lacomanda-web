import { formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfiguracionReservas, ReservaCreada } from 'src/app/models/reservas.models';
import { HeaderService } from 'src/app/services/header.service';
import { ReservasService } from 'src/app/services/reservas.service';

@Component({
  selector: 'app-reservas-online',
  templateUrl: './reservas-online.component.html'
})
export class ReservasOnlineComponent implements OnInit, OnDestroy {
  configuracion: ConfiguracionReservas | null = null;
  fecha = formatDate(new Date(Date.now() + 86400000), 'yyyy-MM-dd', 'en-US');
  personas = 2;
  horas: string[] = [];
  hora = '';
  nombre = '';
  telefono = '';
  email = '';
  notas = '';
  resultado: ReservaCreada | null = null;
  cargando = true;
  consultando = false;
  enviando = false;
  error = '';
  codigoGestion = '';
  tokenGestion = '';
  cancelando = false;
  cancelada = false;

  constructor(
    private readonly service: ReservasService,
    private readonly headerService: HeaderService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.headerService.hideHeader();
    this.codigoGestion = this.route.snapshot.queryParamMap.get('codigo') ?? '';
    this.tokenGestion = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.service.obtenerConfiguracionPublica().subscribe({
      next: response => {
        this.configuracion = response.Data;
        this.cargando = false;
        if (!this.codigoGestion) this.buscarHoras();
      },
      error: error => {
        this.error = error?.error?.Message || 'Las reservas online no están disponibles en este momento.';
        this.cargando = false;
      }
    });
  }

  ngOnDestroy(): void { this.headerService.showHeader(); }

  buscarHoras(): void {
    if (!this.fecha || this.personas < 1) return;
    this.consultando = true;
    this.error = '';
    this.hora = '';
    this.service.disponibilidad(this.fecha, this.personas).subscribe({
      next: response => {
        this.horas = response.Data?.Horas ?? [];
        this.consultando = false;
      },
      error: error => {
        this.horas = [];
        this.error = error?.error?.Message || 'No se pudo consultar la disponibilidad.';
        this.consultando = false;
      }
    });
  }

  crear(): void {
    if (!this.hora || !this.nombre.trim() || !this.email.trim()) return;
    this.enviando = true;
    this.error = '';
    this.service.crearPublica({
      Fecha: this.fecha, Hora: this.hora, Personas: this.personas,
      Nombre: this.nombre, Telefono: this.telefono || null, Email: this.email, Notas: this.notas || null
    }).subscribe({
      next: response => {
        this.resultado = response.Data;
        this.enviando = false;
        history.replaceState(null, '', `${location.pathname}?codigo=${encodeURIComponent(response.Data.Codigo)}&token=${encodeURIComponent(response.Data.TokenGestion)}`);
      },
      error: error => {
        this.error = error?.error?.Message || 'No se pudo registrar la reserva.';
        this.enviando = false;
        this.buscarHoras();
      }
    });
  }

  cancelar(): void {
    if (!this.codigoGestion || !this.tokenGestion) return;
    this.cancelando = true;
    this.service.cancelarPublica(this.codigoGestion, this.tokenGestion).subscribe({
      next: () => { this.cancelada = true; this.cancelando = false; },
      error: error => { this.error = error?.error?.Message || 'No se pudo cancelar la reserva.'; this.cancelando = false; }
    });
  }

  fechaVisible(): string {
    if (!this.resultado) return '';
    return new Date(this.resultado.InicioUtc).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  minFecha(): string { return formatDate(new Date(), 'yyyy-MM-dd', 'en-US'); }
  maxFecha(): string { return formatDate(new Date(Date.now() + (this.configuracion?.DiasAntelacion ?? 60) * 86400000), 'yyyy-MM-dd', 'en-US'); }
}
