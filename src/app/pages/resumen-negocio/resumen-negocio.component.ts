import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { DialogEmitirVentaComponent } from 'src/app/components/dialog-emitir-venta/dialog-emitir-venta.component';
import { StockAlmacenConsultaComponent } from 'src/app/components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { CodigoCaracteristica } from 'src/app/constants/caracteristicas-licencia';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { PedidoResumenTurnoDTO } from 'src/app/interfaces/pedidoDTO.interface';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';
import { CajaDto } from 'src/app/models/caja.models';
import { Configuracion } from 'src/app/models/configuracion.models';
import { EspacioResumenInicio } from 'src/app/models/espacios.models';
import { ConsultaStockAlmacen, StockAlmacenItem } from 'src/app/models/stock-almacen.models';
import { Turno } from 'src/app/models/turno.models';
import { CajaService } from 'src/app/services/caja.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { DashboardReportesService } from 'src/app/services/dashboard-reportes.service';
import { EspaciosService } from 'src/app/services/espacios.service';
import { HeaderService } from 'src/app/services/header.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { PedidoService } from 'src/app/services/pedido.service';
import { StorageService } from 'src/app/services/storage.service';
import { StockAlmacenService } from 'src/app/services/stock-almacen.service';
import { TenantService } from 'src/app/services/tenant.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { VentaService } from 'src/app/services/venta.service';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { ComparativoVentasDashboard } from 'src/app/models/dashboard-ejecutivo.models';
import { NivelUsuarioEnum } from 'src/app/enums/enum';

@Component({
  selector: 'app-resumen-negocio',
  templateUrl: './resumen-negocio.component.html',
})
export class ResumenNegocioComponent implements OnInit {
  cargando = true;
  errorCarga = false;
  fechaActual = new Date();
  fechaLabel = '';
  fechaApi = '';
  cultura = 'es-PE';
  nombreUsuario = '';
  nombreSucursal = '';
  simboloMoneda = '';

  mostrarVentas = false;
  mostrarPedidos = false;
  mostrarEspacios = false;
  mostrarAsistenteIa = false;
  mostrarReportes = false;
  esComercio = false;
  puedeEmitirVentaDirecta = false;
  mostrarInventarioComercio = false;
  cuotaComprobantesAgotada = false;
  ventasTotal: number | null = null;
  documentosTotal: number | null = null;
  ticketMedio: number | null = null;
  ultimasVentas: VentasInterface[] = [];
  cantidadStockBajo: number | null = null;
  productosStockBajo: StockAlmacenItem[] = [];
  ventasComercioDisponibles = true;
  inventarioComercioDisponible = true;
  pedidosActivos: PedidoResumenTurnoDTO[] = [];
  turnosAbiertos: Turno[] = [];
  espaciosOcupados = 0;
  espaciosDisponibles = 0;
  actividadDisponible = true;
  espaciosDisponiblesParaConsulta = true;
  private readonly espaciosPorId = new Map<number, string>();

  constructor(
    private readonly storage: StorageService,
    private readonly licencia: LicenciaTenantService,
    private readonly reportes: DashboardReportesService,
    private readonly cajaService: CajaService,
    private readonly pedidoService: PedidoService,
    private readonly espaciosService: EspaciosService,
    private readonly configuracionService: ConfiguracionService,
    private readonly tenantService: TenantService,
    private readonly headerService: HeaderService,
    private readonly usuarioService: UsuarioService,
    private readonly ventaService: VentaService,
    private readonly stockAlmacenService: StockAlmacenService,
    private readonly dialog: MatDialog,
  ) {}

  async ngOnInit(): Promise<void> {
    this.headerService.showHeader();
    this.cultura = this.storage.getCurrentSession()?.Cultura
      || this.storage.getCurrentSession()?.CulturaTenant
      || 'es-PE';
    this.nombreUsuario = this.storage.getCurrentUser()?.NombreEmpleado
      || this.storage.getCurrentUser()?.NombreUsuario
      || '';
    this.nombreSucursal = this.storage.getCurrentNombreSucursal() || 'LaComanda';

    try {
      const [estadoLicencia, respuestaUsuario] = await Promise.all([
        firstValueFrom(this.licencia.obtenerEstado()),
        firstValueFrom(this.usuarioService.getUsuarioActual()).catch(() => null),
      ]);
      if (estadoLicencia.error) {
        this.errorCarga = true;
        return;
      }
      const tiene = (caracteristica: CodigoCaracteristica) =>
        this.licencia.evaluar(estadoLicencia, caracteristica);

      const tieneReportes = tiene(CARACTERISTICAS_LICENCIA.ReportesAnaliticos);
      const tieneCaja = tiene(CARACTERISTICAS_LICENCIA.OperacionCaja);
      this.esComercio = estadoLicencia.licencia?.PlanCodigo?.toUpperCase() === 'COMERCIO';
      this.puedeEmitirVentaDirecta = this.esComercio
        && tiene(CARACTERISTICAS_LICENCIA.VentasDirecta);
      this.mostrarInventarioComercio = this.esComercio
        && tiene(CARACTERISTICAS_LICENCIA.AlmacenKardex);

      const usuario = respuestaUsuario?.Data;
      const puedeVerDashboardReportes = usuario?.EsUsuarioSoporteLaComanda === true
        || usuario?.IdNivel === NivelUsuarioEnum.Gerente
        || (usuario?.IdNivel === NivelUsuarioEnum.Administrador &&
          usuario.PuedeVerDashboardReportes === true);
      this.mostrarReportes = tieneReportes && puedeVerDashboardReportes;
      this.mostrarVentas = this.esComercio || this.mostrarReportes;
      this.mostrarPedidos = !this.esComercio && tieneCaja;
      this.mostrarEspacios = !this.esComercio
        && tiene(CARACTERISTICAS_LICENCIA.VentasMesa);
      this.mostrarAsistenteIa = tiene(
        CARACTERISTICAS_LICENCIA.ProductosImportacionCartaIa,
      );

      const fechaTenant = await this.obtenerFechaTenant();
      this.fechaApi = fechaTenant.fechaApi;
      this.fechaLabel = fechaTenant.fechaLabel;

      const solicitudes = await Promise.all([
        this.obtenerConfiguracion(),
        this.mostrarVentas && !this.esComercio
          ? firstValueFrom(this.reportes.obtenerComparativoVentas(
              this.fechaApi,
              this.fechaApi,
              'FechaVenta',
            )).catch(() => null)
          : Promise.resolve(null),
        this.mostrarPedidos
          ? firstValueFrom(this.cajaService.getAllCaja(true)).catch(() => null)
          : Promise.resolve(null),
        this.mostrarEspacios
          ? firstValueFrom(this.espaciosService.GetResumenInicio()).catch(() => null)
          : Promise.resolve(null),
      ]);

      this.simboloMoneda = (solicitudes[0] as Configuracion | null)?.SimboloMoneda || '';
      const comparativo = solicitudes[1] as ComparativoVentasDashboard | null;
      const respuestaCajas = solicitudes[2] as ApiResponse<CajaDto[]> | null;
      const respuestaEspacios = solicitudes[3] as ApiResponse<EspacioResumenInicio[]> | null;

      if (comparativo?.Actual) {
        this.ventasTotal = comparativo.Actual.VentaTotal;
        this.documentosTotal = comparativo.Actual.Documentos;
        this.ticketMedio = comparativo.Actual.TicketMedio;
      }

      this.actividadDisponible = !this.mostrarPedidos || respuestaCajas?.Success === true;
      this.turnosAbiertos = (respuestaCajas?.Success ? respuestaCajas.Data ?? [] : [])
        .map(caja => caja.TurnoAbierto)
        .filter((turno): turno is Turno => !!turno?.IdTurno);

      if (respuestaEspacios?.Success) {
        const todosLosEspacios = respuestaEspacios.Data ?? [];
        this.espaciosPorId.clear();
        todosLosEspacios.forEach(espacio =>
          this.espaciosPorId.set(espacio.IdEspacio, espacio.Descripcion),
        );
        const espaciosActivos = todosLosEspacios
          .filter(espacio => espacio.Activo && espacio.Visible);
        this.espaciosDisponibles = espaciosActivos.length;
        this.espaciosOcupados = espaciosActivos
          .filter(espacio => espacio.Ocupado > 0)
          .length;
      } else if (this.mostrarEspacios) {
        this.espaciosDisponiblesParaConsulta = false;
      }

      if (this.esComercio) {
        await this.cargarResumenComercio();
        if (tiene(CARACTERISTICAS_LICENCIA.OperacionComprobantes)) {
          await this.cargarCuotaComprobantes();
        }
      }

      await this.cargarPedidos();
    } catch {
      this.errorCarga = true;
    } finally {
      this.cargando = false;
    }
  }

  private async obtenerConfiguracion(): Promise<Configuracion | null> {
    if (this.configuracionService.snapshot) {
      return this.configuracionService.snapshot;
    }
    return firstValueFrom(this.configuracionService.get()).catch(() => null);
  }

  private async obtenerFechaTenant(): Promise<{ fechaApi: string; fechaLabel: string }> {
    const zonaHoraria = await firstValueFrom(this.tenantService.getTenant())
      .then(respuesta => respuesta?.Data?.[0]?.ZonaHorariaId)
      .catch(() => undefined);
    let opciones: Intl.DateTimeFormatOptions = {};
    if (zonaHoraria) {
      try {
        new Intl.DateTimeFormat(this.cultura, { timeZone: zonaHoraria })
          .format(this.fechaActual);
        opciones = { timeZone: zonaHoraria };
      } catch {
        opciones = {};
      }
    }
    const partes = new Intl.DateTimeFormat('en-CA', {
      ...opciones,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(this.fechaActual);
    const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
    const fechaApi = `${valores['year']}-${valores['month']}-${valores['day']}`;

    let fechaLabel: string;
    try {
      fechaLabel = new Intl.DateTimeFormat(this.cultura, {
        ...opciones,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(this.fechaActual);
    } catch {
      fechaLabel = new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(this.fechaActual);
    }

    return { fechaApi, fechaLabel };
  }

  private async cargarPedidos(): Promise<void> {
    if (this.mostrarPedidos && this.turnosAbiertos.length > 0) {
      const respuestas = await Promise.all(
        this.turnosAbiertos.map(turno =>
          firstValueFrom(this.pedidoService.ObtenerResumenPedidosByIdTurno(turno.IdTurno))
            .catch(() => null),
        ),
      );
      this.actividadDisponible = this.actividadDisponible
        && respuestas.every(respuesta => respuesta?.Success === true);
      const pedidos = respuestas.flatMap(respuesta =>
        respuesta?.Success ? respuesta.Data ?? [] : [],
      )
        .filter(pedido => pedido.Estado === 1 || pedido.Estado === 6);
      const cuentasUnicas = new Map<string, PedidoResumenTurnoDTO>();
      for (const pedido of pedidos) {
        cuentasUnicas.set(`${pedido.IdPedido}:${pedido.NroCuenta}`, pedido);
      }
      this.pedidosActivos = [...cuentasUnicas.values()]
        .sort((a, b) => {
          const diferenciaFecha = Date.parse(String(b.FechaPedido))
            - Date.parse(String(a.FechaPedido));
          return (Number.isNaN(diferenciaFecha) ? 0 : diferenciaFecha)
            || (b.IdPedido - a.IdPedido)
            || (b.NroCuenta - a.NroCuenta);
        })
        .slice(0, 5);
    } else if (this.mostrarPedidos) {
      this.pedidosActivos = [];
    }
  }

  private async cargarResumenComercio(): Promise<void> {
    const [ventas, stock] = await Promise.all([
      firstValueFrom(this.ventaService.getListadoVentas(
        this.fechaApi,
        this.fechaApi,
        false,
      )).catch(() => null),
      this.mostrarInventarioComercio
        ? firstValueFrom(this.stockAlmacenService.consultar()).catch(() => null)
        : Promise.resolve(null),
    ]);

    this.aplicarVentasComercio(ventas);
    this.aplicarStockComercio(stock);
  }

  private aplicarVentasComercio(ventas: VentasInterface[] | null): void {
    this.ventasComercioDisponibles = ventas !== null;
    if (!ventas) {
      this.ventasTotal = null;
      this.documentosTotal = null;
      this.ticketMedio = null;
      this.ultimasVentas = [];
      return;
    }

    const vigentes = ventas.filter(venta => venta.Estado === 1);
    this.ventasTotal = vigentes.reduce(
      (total, venta) => total + (Number(venta.Total) || 0),
      0,
    );
    this.documentosTotal = vigentes.length;
    this.ticketMedio = vigentes.length > 0
      ? this.ventasTotal / vigentes.length
      : 0;
    this.ultimasVentas = [...ventas]
      .sort((a, b) => {
        const diferenciaFecha = Date.parse(String(b.FechaVenta))
          - Date.parse(String(a.FechaVenta));
        return (Number.isNaN(diferenciaFecha) ? 0 : diferenciaFecha)
          || b.IdVenta - a.IdVenta;
      })
      .slice(0, 5);
  }

  private aplicarStockComercio(
    respuesta: ApiResponse<ConsultaStockAlmacen> | null,
  ): void {
    if (!this.mostrarInventarioComercio) {
      this.cantidadStockBajo = null;
      this.productosStockBajo = [];
      return;
    }

    this.inventarioComercioDisponible = respuesta?.Success === true;
    if (!respuesta?.Success) {
      this.cantidadStockBajo = null;
      this.productosStockBajo = [];
      return;
    }

    const consulta = respuesta.Data;
    const productosBajoMinimo = (consulta?.Items ?? [])
      .filter(producto => producto.BajoMinimo)
      .sort((a, b) => a.StockActual - b.StockActual);
    this.cantidadStockBajo = consulta?.CantidadBajoMinimo
      ?? productosBajoMinimo.length;
    this.productosStockBajo = productosBajoMinimo.slice(0, 4);
  }

  private async cargarCuotaComprobantes(): Promise<void> {
    this.cuotaComprobantesAgotada = await firstValueFrom(
      this.licencia.obtenerCuotaComprobantes(),
    )
      .then(cuota => cuota.Agotada)
      .catch(() => false);
  }

  abrirNuevaVenta(): void {
    if (!this.puedeEmitirVentaDirecta || this.cuotaComprobantesAgotada) {
      return;
    }

    const dialogRef = this.dialog.open(DialogEmitirVentaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '1100px',
      maxWidth: '96vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      void this.cargarResumenComercio();
      void this.cargarCuotaComprobantes();
    });
  }

  abrirInventario(): void {
    if (!this.mostrarInventarioComercio) {
      return;
    }

    const elementoActivo = document.activeElement;
    if (elementoActivo instanceof HTMLElement) {
      elementoActivo.blur();
    }
    this.dialog.open(StockAlmacenConsultaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 32px)',
      height: 'calc(100vh - 32px)',
      maxWidth: '1240px',
      maxHeight: '880px',
      panelClass: 'dialog-window--workspace',
    });
  }

  ventaEstaVigente(venta: VentasInterface): boolean {
    return venta.Estado === 1;
  }

  estadoPedido(pedido: PedidoResumenTurnoDTO): 'inProgress' | 'awaitingPayment' {
    return pedido.Estado === 6 ? 'awaitingPayment' : 'inProgress';
  }

  ubicacionPedido(pedido: PedidoResumenTurnoDTO): string {
    return pedido.IdEspacio
      ? this.espaciosPorId.get(pedido.IdEspacio) || `#${pedido.IdEspacio}`
      : '';
  }
}
