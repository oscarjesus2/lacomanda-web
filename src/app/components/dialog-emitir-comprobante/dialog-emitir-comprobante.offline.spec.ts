import { FormBuilder } from '@angular/forms';
import Swal from 'sweetalert2';
import { EnumTipoDocumento } from 'src/app/enums/enum';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { CuentaLocal } from 'src/app/offline/caja-offline-api.service';
import { DialogEmitirComprobanteComponent } from './dialog-emitir-comprobante.component';

describe('Cobro de la pantalla de ventas sin conexión', () => {
  const tarjeta = new Tarjeta({ IdTarjeta: 6, Descripcion: 'Visa' });
  const cuenta = { identificador: 'LOCAL-1', version: 4, contenido: {
    IdPedido: 0, NroCuenta: 1, IdCaja: 3, IdTurno: 7, Total: 20, Moneda: 'SOL',
    ListaPedidoDet: [{ Estado: 1, Subtotal: 20 }],
  } } as CuentaLocal;
  let guardar: jasmine.Spy;
  let cerrar: jasmine.Spy;
  let confirmacion: jasmine.Spy;

  async function abrir(idTipoDoc: EnumTipoDocumento): Promise<DialogEmitirComprobanteComponent> {
    const nube = new Proxy({}, { get: (_, metodo) => { throw Error('Llamada inesperada a la nube: ' + String(metodo)); } }) as any;
    const documentos = [{ IdTipoDocumento: 1, Descripcion: 'Factura' }, { IdTipoDocumento: 2, Descripcion: 'Boleta' }];
    const caja = { IdCaja: 3, PermiteVentaCredito: true };
    const sesion = { activa: true, esCajero: true, usuario: { IdUsuario: 8 }, contexto: { idCaja: 3, paisISO2: 'PE' },
      maestros: { monedas: [{ IdMoneda: 'SOL', Simbolo: 'S/', EsOficial: true }], documentos, cajas: [caja],
        identidades: [{ IdTipoIdentidad: 'RUC', Activo: true, RequiereParaFactura: true, RegexValidacion: '^\\d{11}$' }],
        tiposPago: [{ IdTipoPago: 1 }, { IdTipoPago: 3 }], tarjetas: [tarjeta] },
      documentos, caja, registrarOperacion: guardar };
    const componente = new DialogEmitirComprobanteComponent({ close: cerrar } as any,
      { cuentaLocal: cuenta, lblcambio: 1, idTipoDoc, idCaja: 3, idTurno: 7, idTipoPedido: 1, dblGranTotal: 20 },
      nube, nube, nube, nube, nube, nube, nube, nube, nube, nube, new FormBuilder(), nube, nube, nube,
      { get: (texto: string) => texto } as any, nube, nube, nube, nube, sesion as any);
    await componente.ngOnInit();
    return componente;
  }

  beforeEach(() => {
    guardar = jasmine.createSpy('registrarOperacion').and.resolveTo({ resultado: 'guardado' });
    cerrar = jasmine.createSpy('cerrar');
    confirmacion = spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true, isDenied: false, isDismissed: false });
  });

  it('exige correo en una boleta genérica incluso con el botón de efectivo exacto', async () => {
    const dialogo = await abrir(EnumTipoDocumento.BoletaVenta);
    expect(dialogo.mostrarDatosCliente).toBeFalse();
    dialogo.SolesExacto();
    expect(dialogo.form.get('cliente.correo').touched).toBeTrue();
    expect(guardar).not.toHaveBeenCalled();
    dialogo.form.get('cliente.correo').setValue('boleta@example.test');
    dialogo.toggleClienteDatos();
    dialogo.ocultarClienteDatos();
    const cerrado = new Promise(resolve => cerrar.and.callFake(resolve));
    dialogo.cmdCobrarClick();
    await cerrado;
    const [ruta, datos] = guardar.calls.mostRecent().args;
    expect(ruta).toBe('cobros');
    expect(datos).toEqual(jasmine.objectContaining({ referenciaPedido: 'LOCAL-1', versionPedido: 4, correoComprobante: 'boleta@example.test' }));
    expect(datos.documento.usarClienteGenerico).toBeTrue();
    expect(datos.documento.cliente).toBeNull();
    expect(datos.documento.venta.Serie).toBe('');
    expect(datos.documento.venta.NumDocumento).toBe(0);
    expect(cerrar).toHaveBeenCalledOnceWith({ estado: 'CobradoPendiente' });
  });

  it('conserva datos de factura y cada pago de tarjeta con su propia autorización y propina', async () => {
    const dialogo = await abrir(EnumTipoDocumento.FacturaVenta);
    dialogo.form.get('cliente').patchValue({ tipoIdentidad: 'RUC', ruc: '20123456789', razonSocial: 'Cliente',
      direccion: 'Calle Uno 1', correo: 'cliente@example.test' });
    for (const autorizacion of ['AP1', 'AP2']) {
      Object.assign(dialogo.nuevoRegistro, { Tarjeta: tarjeta, MontoPagado: 6, Autorizacion: autorizacion, Propina: 1.5 });
      dialogo.agregarRegistro();
    }
    dialogo.SolesPredefinido(10);
    const cerrado = new Promise(resolve => cerrar.and.callFake(resolve));
    dialogo.cmdCobrarClick();
    await cerrado;
    const { documento } = guardar.calls.mostRecent().args[1];
    expect(documento.cliente).toEqual({ IdTipoIdentidad: 'RUC', NumeroIdentificacion: '20123456789', RazonSocial: 'Cliente',
      Direccion: 'Calle Uno 1', Email: 'cliente@example.test' });
    expect(documento.venta.Propina).toBe(3);
    expect(documento.listaPago.map(p => [p.IdTipoPago, p.MontoPagado, p.Vuelto, p.Autorizacion, p.Propina])).toEqual([
      [1, 10, 2, '', 0], [3, 6, 0, 'AP1', 1.5], [3, 6, 0, 'AP2', 1.5],
    ]);
  });

  it('conserva el diálogo y el correo si otra estación ya cambió la cuenta', async () => {
    const dialogo = await abrir(EnumTipoDocumento.BoletaVenta);
    dialogo.SolesPredefinido(20);
    dialogo.form.get('cliente.correo').setValue('cliente@example.test');
    guardar.and.rejectWith(new Error('La versión de la cuenta ha cambiado.'));
    await dialogo.procesarCobro();
    expect(cerrar).not.toHaveBeenCalled();
    expect(confirmacion).toHaveBeenCalledWith('Cobro sin conexión', 'La versión de la cuenta ha cambiado.', 'warning');
    expect(dialogo.form.get('cliente.correo').value).toBe('cliente@example.test');
    expect(dialogo.guardandoCobroLocal).toBeFalse();
  });

  it('un segundo clic no repite el cobro mientras la caja confirma el primero', async () => {
    const dialogo = await abrir(EnumTipoDocumento.BoletaVenta);
    dialogo.SolesPredefinido(20);
    dialogo.form.get('cliente.correo').setValue('cliente@example.test');
    let confirmar: () => void;
    guardar.and.returnValue(new Promise<void>(resolve => confirmar = resolve));
    const primero = dialogo.procesarCobro();
    await dialogo.procesarCobro();
    dialogo.salir();
    expect(cerrar).not.toHaveBeenCalled();
    expect(guardar).toHaveBeenCalledTimes(1);
    confirmar();
    await primero;
    expect(cerrar).toHaveBeenCalledOnceWith({ estado: 'CobradoPendiente' });
  });
});
