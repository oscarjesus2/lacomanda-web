import { Component, HostListener, OnInit } from '@angular/core';
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
import { LoginRequest } from 'src/app/services/auth/loginRequest';
import { version } from 'src/environments/version';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  appVersion = version;
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

  deferredPrompt: any;
  showInstallButton = false;
  isiOS = false;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e: Event) {
    // Evitar que el navegador automáticamente muestre el prompt
    e.preventDefault();
    this.deferredPrompt = e;
    this.showInstallButton = true; // Mostrar el botón de instalación
  }

  ngOnInit(): void {
    this.checkIfIos();
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

  checkIfIos() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isiOS = /iphone|ipad|ipod/.test(userAgent);
    
    if (this.isiOS && !window.navigator['standalone']) {
      console.log("Not in standalone mode");
      this.showInstallButton = false;
      alert('Para instalar la aplicación en iOS, abre el menú de compartir y selecciona "Agregar a la pantalla de inicio".');
    }
  }

  // Método para manejar la instalación en dispositivos compatibles
  installPWA() {
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('El usuario aceptó la instalación');
      } else {
        console.log('El usuario rechazó la instalación');
      }
      this.deferredPrompt = null;
    });
  }
  
  async initForm() {
    this.loginForm = this.fb.group({
      tenant: [null, Validators.required],
      idNivel: ['', Validators.required],
      password: ['', Validators.required],
    });
  
    try {
      // Intenta obtener la IP interna
      this.CurrentIP = await internalIpV4();
      console.info('CurrentIP con internalIpV4...', this.CurrentIP);
    } catch (error) {
      console.warn('No se pudo obtener la IP interna, intentando con WebRTC...', error);
      try {
        // Si falla, intenta obtener la IP usando WebRTC
        this.CurrentIP = await this.getLocalIPAddress();
        console.info('CurrentIP...', this.CurrentIP);
      } catch (error) {
        console.warn('No se pudo obtener la IP con WebRTC...', error);
        // Establecer un valor predeterminado si no se puede obtener ninguna IP
        this.CurrentIP = '-';
      }
    }
  }

  getLocalIPAddress(): Promise<string> {
    return new Promise((resolve, reject) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: []
      });
  
      peerConnection.createDataChannel('');
  
      peerConnection.createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .catch((error) => reject('Error al crear oferta WebRTC: ' + error));
  
      peerConnection.onicecandidate = (event) => {
        if (event && event.candidate && event.candidate.candidate) {
          const candidateParts = event.candidate.candidate.split(' ');
          const ip = candidateParts[4]; // La IP se encuentra en la 5ta posición
          resolve(ip);
          peerConnection.onicecandidate = null; // Detenemos más eventos
          peerConnection.close(); // Cerramos la conexión para liberar recursos
        }
      };
  
      // En caso de que no haya candidatos ICE
      setTimeout(() => {
        reject('No se pudo obtener la IP local a través de WebRTC');
        peerConnection.close();
      }, 10000); // Limitar el tiempo de espera a 10 segundos
    });
  }
  

  private async loadTenants(): Promise<void> {
      this.spinnerService.show();
      this.tenantDefault = await this.tenantService.getTenant().toPromise();
      this.spinnerService.hide();

        // Si solo hay un tenant, seleccionarlo automáticamente
      if (this.tenantDefault.length === 1) {
        this.loginForm.controls['tenant'].setValue(this.tenantDefault[0]);
      }
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
        this.loginForm.controls['password'].setValue(this.password);
        this.login();
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
    
    const formValues = this.loginForm.value;
    const idNivel = formValues.idNivel;
    const password = formValues.password;
    const tenant = formValues.tenant; 
    
    const loginRequest: LoginRequest = {
      IdNivel: idNivel,
      Password: password,
      Ip: this.CurrentIP || '-',   
    };

    console.log('CurrentIP', this.CurrentIP);
    this.loginService.login(loginRequest, tenant.TenantId).subscribe({
      next: (userData) => {
        console.log('Login correcto');
        const session: Session = new Session(userData.Token, userData, this.CurrentIP, tenant.TenantId, tenant.Sucursal);
        this.storageService.setCurrentSession(session);
        if (userData.TipoCompu == 0 && this.storageService.getCurrentUser().IdNivel == "001") {
            this.router.navigateByUrl('/dashboard');
        } else if (userData.TipoCompu == 1) {
            this.router.navigateByUrl('/caja');
        } else if (userData.TipoCompu == 2) {
            this.router.navigateByUrl('/mozo');
        } else if (userData.TipoCompu == 3) {
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
