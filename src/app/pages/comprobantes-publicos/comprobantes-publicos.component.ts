import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ComprobantePublico,
  ConsultarComprobantePublicoRequest,
  SucursalComprobantePublico
} from 'src/app/models/comprobantes-publicos.models';
import { ComprobantesPublicosService } from 'src/app/services/comprobantes-publicos.service';
import { HeaderService } from 'src/app/services/header.service';

@Component({
  selector: 'app-comprobantes-publicos',
  templateUrl: './comprobantes-publicos.component.html'
})
export class ComprobantesPublicosComponent implements OnInit, OnDestroy {
  sucursales: SucursalComprobantePublico[] = [];
  tenantId = '';
  tipoDocumento = 1;
  serie = '';
  numero: number | null = null;
  numeroIdentificacion = '';
  fechaEmision = '';
  total: number | null = null;
  resultado: ComprobantePublico | null = null;
  cargando = true;
  consultando = false;
  descargando: 'pdf' | 'xml' | '' = '';
  error = '';

  constructor(
    private readonly service: ComprobantesPublicosService,
    private readonly headerService: HeaderService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.headerService.hideHeader();
    const tenantSolicitado = this.route.snapshot.queryParamMap.get('sucursal') ?? '';
    this.service.listarSucursales().subscribe({
      next: response => {
        this.sucursales = response.Data ?? [];
        const seleccionada = this.sucursales.find(x => x.TenantId === tenantSolicitado)
          ?? (this.sucursales.length === 1 ? this.sucursales[0] : null);
        if (seleccionada) this.seleccionarSucursal(seleccionada);
        this.cargando = false;
        if (!this.sucursales.length) {
          this.error = 'No hay sucursales disponibles para consultar comprobantes.';
        }
      },
      error: error => {
        this.error = error?.error?.Message || 'No se pudieron consultar las sucursales.';
        this.cargando = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.headerService.showHeader();
  }

  seleccionarSucursal(sucursal: SucursalComprobantePublico): void {
    this.tenantId = sucursal.TenantId;
    this.service.seleccionarSucursal(sucursal.TenantId);
    this.resultado = null;
    this.error = '';
    const params = new URLSearchParams(location.search);
    params.set('sucursal', sucursal.TenantId);
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  }

  consultar(): void {
    if (!this.formularioValido()) return;
    this.consultando = true;
    this.resultado = null;
    this.error = '';
    this.service.consultar(this.request()).subscribe({
      next: response => {
        this.resultado = response.Data;
        this.consultando = false;
      },
      error: error => {
        this.error = error?.error?.Message || 'No se encontró un comprobante con esos datos.';
        this.consultando = false;
      }
    });
  }

  descargar(formato: 'pdf' | 'xml'): void {
    if (!this.resultado || this.descargando) return;
    this.descargando = formato;
    this.error = '';
    this.service.descargar(formato, this.request()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${this.resultado?.NumeroDocumento ?? 'comprobante'}.${formato}`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargando = '';
      },
      error: () => {
        this.error = `No se pudo descargar el ${formato.toUpperCase()}. Inténtalo de nuevo.`;
        this.descargando = '';
      }
    });
  }

  formularioValido(): boolean {
    return !!this.tenantId
      && !!this.serie.trim()
      && (this.numero ?? 0) > 0
      && !!this.numeroIdentificacion.trim()
      && !!this.fechaEmision
      && (this.total ?? 0) > 0;
  }

  get esperandoSucursal(): boolean {
    return !this.cargando && !this.tenantId && !this.error && this.sucursales.length > 1;
  }

  nombreSucursal(): string {
    return this.sucursales.find(x => x.TenantId === this.tenantId)?.Nombre ?? 'tu restaurante';
  }

  private request(): ConsultarComprobantePublicoRequest {
    return {
      TipoDocumento: this.tipoDocumento,
      Serie: this.serie.trim().toUpperCase(),
      Numero: this.numero ?? 0,
      NumeroIdentificacion: this.numeroIdentificacion.trim(),
      FechaEmision: this.fechaEmision,
      Total: this.total ?? 0
    };
  }
}
