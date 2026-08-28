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
});
