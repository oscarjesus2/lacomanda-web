import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Cliente } from 'src/app/models/cliente.models';
import { EnumTipoDocumento, EnumTipoIdentidad } from '../../enums/enum';
import { TipoDocCliente } from 'src/app/models/tipodoccliente.models';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';
import { TipoDocumento } from 'src/app/models/tipodocumento.models';
import { TipoDocumentoService } from 'src/app/services/tipodocumento.service';

@Component({
  selector: 'app-prueba',
  templateUrl: './prueba.component.html',
  styleUrls: ['./prueba.component.css']
})
export class PruebaComponent implements OnInit {
  listTipoDocumentoCliente: TipoDocCliente[] = [];
  listTipoDocumento: TipoDocumento[] = [];
  tipoDocumento: TipoDocumento = new TipoDocumento();
  cliente: Cliente = new Cliente();
  lblmonto: string = '800';
  form: FormGroup;
  rucLength: number;

  constructor(
    private fb: FormBuilder,
    private tipoDocClienteService: TipoDocClienteService,
    private tipoDocumentoService: TipoDocumentoService,
  ) {
    this.cliente.TipoIdentidad = new TipoDocCliente({ IdTipoIdentidad: EnumTipoIdentidad.RUC, Descripcion: 'RUC' });

    this.form = this.fb.group({
      tipoDocumento: ['', Validators.required],
      cliente: this.fb.group({
        TipoIdentidad: [this.cliente.TipoIdentidad.IdTipoIdentidad, Validators.required],
        Ruc: ['', [Validators.required]],
        RazonSocial: ['', [Validators.required, this.razonSocialValidator()]],
        Direccion: ['']
      })
    });
  }

  async ngOnInit() {
    await this.initializeTipoDocCliente();
    await this.initializeTipoDocumento();

    // Suscribirse a los cambios en el TipoIdentidad y tipoDocumento
    this.form.get('cliente.TipoIdentidad').valueChanges.subscribe(() => {
      this.updateRucValidator();
      this.form.get('cliente').updateValueAndValidity(); 
    });

    this.form.get('tipoDocumento').valueChanges.subscribe(() => this.updateRucValidator());

    this.form.get('cliente.Ruc').valueChanges.subscribe((newValue) => {
      console.log('RUC ha cambiado:', newValue);
      this.form.get('cliente.RazonSocial').updateValueAndValidity();
    });
  }

  private async initializeTipoDocCliente(): Promise<void> {
    try {
      this.listTipoDocumentoCliente = await this.tipoDocClienteService.getTipoDocClientes().toPromise();
      if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta) {
        this.listTipoDocumentoCliente = this.listTipoDocumentoCliente.filter(doc => doc.IdTipoIdentidad !== 2);
        this.cliente.TipoIdentidad = this.listTipoDocumentoCliente.find(doc => doc.IdTipoIdentidad === EnumTipoIdentidad.DNI) || null;
        if (this.cliente.TipoIdentidad?.IdTipoIdentidad === EnumTipoIdentidad.DNI) {
          this.cliente.Ruc = "00000001";
          this.cliente.RazonSocial = "Cliente Varios";
        }
      } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
        this.listTipoDocumentoCliente = this.listTipoDocumentoCliente.filter(doc => doc.IdTipoIdentidad === 2);
        this.cliente.TipoIdentidad = this.listTipoDocumentoCliente.find(doc => doc.IdTipoIdentidad === EnumTipoIdentidad.RUC) || null;
      }
    } catch (error) {
      console.error('Error loading TipoDocCliente', error);
      throw error;
    }
  }

  private async initializeTipoDocumento(): Promise<void> {
    try {
      this.listTipoDocumento = await this.tipoDocumentoService.getTipoDocumento().toPromise();
      if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta) {
        this.listTipoDocumento = this.listTipoDocumento.filter(doc => doc.IdTipoDoc === EnumTipoDocumento.BoletaVentaManual || doc.IdTipoDoc === EnumTipoDocumento.BolentaVenta);
        this.tipoDocumento.IdTipoDoc = EnumTipoDocumento.BolentaVenta;
      } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
        this.listTipoDocumento = this.listTipoDocumento.filter(doc => doc.IdTipoDoc === EnumTipoDocumento.FacturaVentaManual || doc.IdTipoDoc === EnumTipoDocumento.FacturaVenta);
        this.tipoDocumento.IdTipoDoc = EnumTipoDocumento.FacturaVenta;
      }
    } catch (error) {
      console.error('Error loading TipoDocumento', error);
      throw error;
    }
  }

  tipoDocumentoClienteChange() {
    const tipoIdentidad = this.form.get('cliente.TipoIdentidad').value;
    const clienteFormGroup = this.form.get('cliente') as FormGroup;

    if (tipoIdentidad === EnumTipoIdentidad.DNI) {
      clienteFormGroup.patchValue({
        Ruc: '00000001',
        RazonSocial: 'Cliente Varios'
      });
    } else {
      clienteFormGroup.patchValue({
        Ruc: '',
        RazonSocial: ''
      });
    }

    clienteFormGroup.updateValueAndValidity(); // Asegúrate de que el grupo de controles se actualice
  }

  updateRucValidator() {
    const tipoIdentidadControl = this.form.get('cliente.TipoIdentidad');
    const rucControl = this.form.get('cliente.Ruc');
    const razonSocialControl = this.form.get('cliente.RazonSocial');
  
    if (tipoIdentidadControl && rucControl && razonSocialControl) {
      const tipoIdentidad = tipoIdentidadControl.value;
  
      // Establece el validador en función del TipoIdentidad
      rucControl.clearValidators(); // Limpia los validadores existentes
      rucControl.updateValueAndValidity();

      if (tipoIdentidad === EnumTipoIdentidad.DNI) {
        this.rucLength = 8;
        rucControl.setValidators([
          Validators.required,
          this.rucValidator(8, razonSocialControl.value)
        ]);
      } else if (tipoIdentidad === EnumTipoIdentidad.RUC) {
        this.rucLength = 11;
        rucControl.setValidators([
          Validators.required,
          this.rucValidator(11, razonSocialControl.value)
        ]);
      }
  
      rucControl.updateValueAndValidity(); // Actualiza la validez del control
      razonSocialControl.updateValueAndValidity(); // Actualiza la validez de RazonSocial
    }
  }
  

  rucValidator(length: number, razonSocial: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const ruc = control.value;

      if (ruc && ruc.length !== length) {
        return { length: true };
      }
      if (ruc && !/^\d+$/.test(ruc)) {
        return { pattern: true };
      }

      // Validación adicional para DNI
      if (length === 8 && ruc === '00000001' && parseFloat(this.lblmonto) >= 700) {
        return { invalidRUC: true };
      }

      if (razonSocial === 'Cliente Varios' && ruc!= '00000001'){
        return { invalidRUC: true };
      }

      return null;
    };
  }

 // Validador personalizado para RazonSocial
razonSocialValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    // Verifica si el control tiene un padre
    if (!control.parent) {
      return null; // Si no hay padre, el formulario aún no está listo
    }
    
    console.log(control.value);
    const razonSocial = control.value;
    const rucControl = control.parent.get('Ruc'); // Obtén el control 'Ruc' desde el padre

    if (rucControl) {
      const ruc = rucControl.value;
      console.log(ruc);
      console.log(razonSocial);
      if (ruc === '00000001' && razonSocial !== 'Cliente Varios') {
        console.log('entro');
        return { invalidRazonSocial: true };
      }
      if (ruc !== '00000001' && razonSocial === 'Cliente Varios') {
        console.log('entro');
        return { invalidRazonSocial: true };
      }
    }
    
    return null;
  };
}
}