import { QzTrayV224Service } from './qz-tray-v224.service';

describe('QzTrayV224Service - cola persistente del backend', () => {
  it('usa la impresora predeterminada como respaldo y no duplica el reintento en el navegador', async () => {
    const service = Object.create(QzTrayV224Service.prototype) as QzTrayV224Service;
    const printPdf = spyOn(service, 'printPDF').and.resolveTo(true);

    const resultado = await service.printPDFDesdeColaServidor(
      'JVBERi0xLjQ=',
      'COCINA',
    );

    expect(resultado).toBeTrue();
    expect(printPdf).toHaveBeenCalledOnceWith(
      'JVBERi0xLjQ=',
      'COCINA',
      true,
      false,
      false,
      undefined,
      false,
    );
  });

  it('no usa la impresora predeterminada en una prueba remota', async () => {
    const service = Object.create(QzTrayV224Service.prototype) as QzTrayV224Service;
    const printPdf = spyOn(service, 'printPDF').and.resolveTo(true);

    const resultado = await service.printPDFDesdeColaServidor(
      'JVBERi0xLjQ=',
      'COCINA',
      false,
    );

    expect(resultado).toBeTrue();
    expect(printPdf).toHaveBeenCalledOnceWith(
      'JVBERi0xLjQ=',
      'COCINA',
      false,
      false,
      false,
      undefined,
      false,
    );
  });
});

describe('QzTrayV224Service - comanda offline', () => {
  let anterior: any;
  let servicio: QzTrayV224Service;
  let qzLocal: any;

  beforeEach(() => {
    anterior = (globalThis as any).qz;
    qzLocal = {
      websocket: { isActive: () => false },
      printers: { getDefault: jasmine.createSpy('getDefault').and.resolveTo('DEFAULT') },
      configs: { create: (nombre: string) => ({ nombre }) },
      print: jasmine.createSpy('print').and.resolveTo(undefined),
    };
    (globalThis as any).qz = qzLocal;
    servicio = Object.create(QzTrayV224Service.prototype) as QzTrayV224Service;
    spyOn(servicio, 'connect').and.resolveTo();
    spyOn(servicio, 'disconnect').and.resolveTo();
    spyOn<any>(servicio, 'buscarImpresoraInstalada').and.resolveTo('COCINA');
    spyOn<any>(servicio, 'registrarConfianza');
    spyOn<any>(servicio, 'esPeticionBloqueada').and.returnValue(false);
  });

  afterEach(() => { (globalThis as any).qz = anterior; });

  it('envía el HTML únicamente a la impresora del área y confirma al aceptarlo QZ', async () => {
    expect(await servicio.imprimirComandaOffline('<html>Pedido</html>', 'COCINA')).toBeTrue();
    expect(qzLocal.print).toHaveBeenCalledOnceWith({ nombre: 'COCINA' }, [{
      type: 'pixel', format: 'html', flavor: 'plain', data: '<html>Pedido</html>',
    }]);
    expect(servicio.disconnect).toHaveBeenCalled();
  });

  it('no usa otra impresora si la del área no está instalada', async () => {
    (servicio as any).buscarImpresoraInstalada.and.resolveTo(null);
    expect(await servicio.imprimirComandaOffline('<html>Pedido</html>', 'COCINA')).toBeFalse();
    expect(qzLocal.printers.getDefault).not.toHaveBeenCalled();
    expect(qzLocal.print).not.toHaveBeenCalled();
  });

  it('no informa un fallo de impresión si solo falla la desconexión posterior', async () => {
    (servicio.disconnect as jasmine.Spy).and.rejectWith(new Error('No se pudo desconectar'));
    expect(await servicio.imprimirComandaOffline('<html>Pedido</html>', 'COCINA')).toBeTrue();
  });

  it('informa el fallo si QZ no acepta la comanda', async () => {
    qzLocal.print.and.rejectWith(new Error('Impresora no disponible'));
    spyOn(console, 'error');
    expect(await servicio.imprimirComandaOffline('<html>Pedido</html>', 'COCINA')).toBeFalse();
  });
});
