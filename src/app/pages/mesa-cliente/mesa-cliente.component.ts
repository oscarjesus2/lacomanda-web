import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EstadoAccesoMesa, SolicitudAccesoMesa } from 'src/app/models/mesa-cliente.models';
import { HeaderService } from 'src/app/services/header.service';
import { MesaClienteService } from 'src/app/services/mesa-cliente.service';

@Component({
  selector: 'app-mesa-cliente',
  templateUrl: './mesa-cliente.component.html',
  styleUrls: ['./mesa-cliente.component.css']
})
export class MesaClienteComponent implements OnInit, OnDestroy {
  codigoQr = '';
  solicitud?: SolicitudAccesoMesa;
  estado?: EstadoAccesoMesa;
  cargando = true;
  error = '';
  private polling?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly mesaClienteService: MesaClienteService,
    private readonly headerService: HeaderService
  ) {}

  ngOnInit(): void {
    this.headerService.hideHeader();
    this.codigoQr = this.route.snapshot.paramMap.get('codigoQr') || '';
    if (!this.codigoQr) {
      this.cargando = false;
      this.error = 'Este código QR no es válido.';
      return;
    }

    const token = sessionStorage.getItem(this.storageKey);
    token ? this.iniciarConsulta(token) : this.solicitarAcceso();
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    this.headerService.showHeader();
  }

  reintentar(): void {
    sessionStorage.removeItem(this.storageKey);
    this.estado = undefined;
    this.solicitud = undefined;
    this.error = '';
    this.cargando = true;
    this.solicitarAcceso();
  }

  get pendiente(): boolean {
    return (this.estado?.Estado || this.solicitud?.Estado) === 'Pendiente';
  }

  get activa(): boolean { return this.estado?.Estado === 'Activa'; }

  get finalizada(): boolean {
    return ['Rechazada', 'Expirada', 'Cerrada'].includes(this.estado?.Estado || '');
  }

  get nombreEspacio(): string {
    const origen = this.estado || this.solicitud;
    return origen ? `${origen.Espacio} ${origen.Numero}` : '';
  }

  private solicitarAcceso(): void {
    this.mesaClienteService.solicitar(this.codigoQr).subscribe({
      next: response => {
        this.cargando = false;
        this.solicitud = response.Data;
        sessionStorage.setItem(this.storageKey, response.Data.Token);
        this.iniciarConsulta(response.Data.Token);
      },
      error: error => {
        this.cargando = false;
        this.error = error?.error?.Message || 'No pudimos abrir este espacio. Solicita ayuda al personal.';
      }
    });
  }

  private iniciarConsulta(token: string): void {
    this.polling?.unsubscribe();
    this.polling = timer(0, 2500).pipe(
      switchMap(() => this.mesaClienteService.consultar(token))
    ).subscribe({
      next: response => {
        this.cargando = false;
        this.estado = response.Data;
        if (this.estado.Estado !== 'Pendiente') this.polling?.unsubscribe();
      },
      error: error => {
        this.polling?.unsubscribe();
        this.cargando = false;
        sessionStorage.removeItem(this.storageKey);
        this.error = error?.error?.Message || 'La solicitud dejó de estar disponible.';
      }
    });
  }

  private get storageKey(): string { return `lacomanda-mesa-${this.codigoQr}`; }
}
