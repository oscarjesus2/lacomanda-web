import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/auth/login.service';
import { internalIpV4 } from 'internal-ip';
import { StorageService } from 'src/app/services/storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { NotificationService } from 'src/app/services/notification.service';
import { Session } from 'src/app/models/session.models';
import { TenantService } from 'src/app/services/tenant.service';
import { DialogMCantComponent } from 'src/app/components/dialog-mcant/dialog-mcant.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
 
  hide = true;
  public loginValid = true;
  public idNivel = '001';
  public password = '';

  nivelUsuario: UsersDefault[] = [
    { value: '001', nombreNivel: 'Administrador' },
    { value: '002', nombreNivel: 'Cajero' },
    { value: '003', nombreNivel: 'Mozo' }
  ];
  tenantDefault: TenantDefault[] = [];
  loginForm: FormGroup;
  loginError: string = "";
  CurrentIP: string;

  constructor(
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private fb: FormBuilder,
    private router: Router, 
    private loginService: LoginService,
    private storageService: StorageService,
    private tenantService: TenantService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTenants();
    this.initForm();
    const currentSession = this.storageService.getCurrentSession();
    if (currentSession) {
      const currentUser = currentSession.User;
      if (currentUser.IdNivel === '001') {
        this.router.navigateByUrl('/dashboard');
      } else if (currentUser.IdNivel === '002' || currentUser.IdNivel === '003') {
        this.router.navigateByUrl('/ventas');
      }
    }
  }

  async initForm() {
    this.loginForm = this.fb.group({
      tenant: [null, Validators.required],
      idNivel: ['', Validators.required],
      password: ['', Validators.required],
    });

    this.CurrentIP = await internalIpV4();
  }

  private async loadTenants(): Promise<void> {
      this.spinnerService.show();
      this.tenantDefault = await this.tenantService.getTenant().toPromise();
      this.spinnerService.hide();
  }
  
  openPasswordDialog() {
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: {
        title: 'Ingresar Contraseña',
        hideNumber: true, // Mostrar como contraseña (ocultar números)
        decimalActive: false // No permitir punto decimal
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.value) {
        this.password = result.value;
        // Aquí puedes también asignar la contraseña al form si deseas
        this.loginForm.controls['password'].setValue(this.password);
      }
    });
  }
  
  getMaskedPassword(): string {
    return this.password ? this.password.replace(/./g, '*') : '';
  }

  login() {
    if (this.loginForm.invalid) {
      this.notificationService.showWarning('Por favor complete todos los campos.');
      return;
    }

    this.spinnerService.show();
    
    // Obtener valores del formulario
    const formValues = this.loginForm.value;
    const idNivel = formValues.idNivel;
    const password = formValues.password;
    const tenant = formValues.tenant; 
    
    this.loginService.login({ IdNivel: idNivel, Password: password, Ip:  this.CurrentIP }, tenant.TenantId).subscribe({
      next: (userData) => {
        console.log('Login correcto');
        const session: Session = new Session(userData.Token, userData, this.CurrentIP, tenant.TenantId, tenant.Sucursal);
        this.storageService.setCurrentSession(session);
        
        this.notificationService.showSuccess('Inicio de sesión exitoso.');
        if (userData.TipoCompu == 0 && this.storageService.getCurrentUser().IdNivel=="001") //Si es de cualquier dispositivo pero es administrador
        {
            this.router.navigateByUrl('/caja');
        }else if (userData.TipoCompu == 1) //CAJA
        {
            this.router.navigateByUrl('/caja');
        }else if (userData.TipoCompu == 2) // MOZO
        {
          this.router.navigateByUrl('/mozo'); // ADMINISTRADOR
        }else if (userData.TipoCompu == 3)
        {
          this.router.navigateByUrl('/dashboard');
        }
        this.loginForm.reset();
        this.spinnerService.hide();
      },
      error: (errorData) => {
        this.loginValid = false;
        this.notificationService.showError('Contraseña incorrecta');
        this.loginError = errorData;
        this.spinnerService.hide();
      }
    });
  }
}

interface UsersDefault {
  value: string;
  nombreNivel: string;
}

interface TenantDefault {
  TenantId: string;
  Sucursal: string;
}