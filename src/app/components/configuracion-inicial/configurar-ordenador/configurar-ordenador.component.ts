import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StorageService } from 'src/app/services/storage.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-configurar-ordenador',
  templateUrl: './configurar-ordenador.component.html',
  styleUrls: ['./configurar-ordenador.component.css']
})
export class ConfigurarOrdenadorComponent implements OnInit {

  readonly COOKIE_NAME = 'clientUUID';

  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(64), Validators.pattern(/^[a-zA-Z0-9\-\_\.]+$/)]]
  });

  get currentCookie(): string {
    return this.cookie.get(this.COOKIE_NAME) || '';
  }

  get hostHint(): string {
    // No es el hostname del SO; es el del sitio web. Sirve como hint nada más.
    return window.location?.hostname || '';
  }

  constructor(
    private fb: FormBuilder,
    private cookie: CookieService,
    private snack: MatSnackBar,
    private storage: StorageService,
    private dialogRef: MatDialogRef<ConfigurarOrdenadorComponent>
  ) {}

  ngOnInit(): void {
    // precargar valor actual de la cookie si existe
    const existing = this.currentCookie;
    if (existing) {
      this.form.patchValue({ identifier: existing });
    }
  }

  generate(): void {
    let id = '';
    // Intentar crypto.randomUUID(); fallback a patrón corto
    try {
      // @ts-ignore (no todos los TS targets incluyen la tipificación)
      id = crypto?.randomUUID?.() ?? '';
    } catch (_) { /* ignore */ }
    if (!id) {
      const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
      id = `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    }
    this.form.patchValue({ identifier: id });
    this.snack.open('Identificador generado', 'OK', { duration: 2000 });
  }
 salir() {
    this.dialogRef.close();
   }

  clearField(): void {
    this.form.patchValue({ identifier: '' });
  }

 save(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.snack.open('Revisa el identificador', 'OK', { duration: 2500 });
    return;
  }

  const value = this.form.value.identifier!.trim();
  if (!value) {
    this.snack.open('El identificador no puede estar vacío', 'OK', { duration: 2500 });
    return;
  }

  const expiration = new Date();
  expiration.setFullYear(expiration.getFullYear() + 10);
  this.cookie.set('clientUUID', value, expiration);

  try {
    const session = this.storage.getCurrentSession();
    if (session) {
      session.Ip = value;
      this.storage.setCurrentSession(session);
    }
  } catch { /* no-op */ }

  this.snack.open('Identificador guardado en este ordenador', 'OK', { duration: 2500 });
}


  deleteCookie(): void {
    const prev = this.currentCookie;
    if (!prev) {
      this.snack.open('No hay identificador para eliminar', 'OK', { duration: 2000 });
      return;
    }
    this.cookie.delete(this.COOKIE_NAME, '/');
    this.cookie.delete(this.COOKIE_NAME);

    try {
      const sess = this.storage.getCurrentSession?.();
      if (sess) {
        if ('Identificador' in sess) (sess as any).Identificador = '';
        if ('CurrentIP' in sess) (sess as any).CurrentIP = '';
        this.storage.setCurrentSession(sess);
      }
    } catch {}

    this.snack.open('Identificador eliminado', 'OK', { duration: 2000 });
    this.form.patchValue({ identifier: '' });
  }
}
