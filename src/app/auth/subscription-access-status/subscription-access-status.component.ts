import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { HeaderService } from '../../services/header.service';
import { environment } from '../../../environments/environment';

export type SubscriptionAccessCode =
  | 'SUBSCRIPTION_PAYMENT_REQUIRED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_NOT_ACTIVE';

interface SubscriptionAccessContent {
  badge: string;
  badgeIcon: string;
  tone: 'warning' | 'danger';
  title: string;
  summary: (business: string) => string;
  statusTitle: string;
  statusMessage: string;
  supportTitle: string;
  supportMessage: string;
  portalAction: string;
  portalHint: string;
}

const SUBSCRIPTION_ACCESS_CONTENT: Record<
  SubscriptionAccessCode,
  SubscriptionAccessContent
> = {
  SUBSCRIPTION_PAYMENT_REQUIRED: {
    badge: 'Pago pendiente',
    badgeIcon: 'credit_card',
    tone: 'warning',
    title: 'Tu acceso ya está preparado',
    summary: business =>
      `${business} ya tiene la licencia creada. Todo está listo para empezar.`,
    statusTitle: 'Solo queda confirmar el pago',
    statusMessage:
      'La licencia ya existe, pero todavía figura pendiente de pago. En cuanto se confirme, podrás ingresar a La Comanda y trabajar con normalidad.',
    supportTitle: '¿Necesitas más días de prueba?',
    supportMessage:
      'Abre un ticket desde el Portal La Comanda. Nuestro equipo revisará tu caso y te ayudará a evaluar una ampliación.',
    portalAction: 'Revisar pago en el Portal',
    portalHint: 'Allí podrás completar el pago o crear un ticket de soporte.',
  },
  SUBSCRIPTION_EXPIRED: {
    badge: 'Periodo finalizado',
    badgeIcon: 'event_busy',
    tone: 'warning',
    title: 'Tu suscripción necesita renovarse',
    summary: business =>
      `${business} llegó al final de su periodo contratado o de prueba.`,
    statusTitle: 'El acceso está temporalmente pausado',
    statusMessage:
      'No existe una renovación confirmada. Esto también puede ocurrir si el cobro automático no pudo completarse. Tu información continúa guardada y recuperarás el acceso cuando regularices la suscripción.',
    supportTitle: '¿Tuviste un problema con la renovación?',
    supportMessage:
      'Desde el portal puedes revisar el medio de pago, renovar el plan o crear un ticket para que nuestro equipo te ayude.',
    portalAction: 'Renovar en el Portal',
    portalHint: 'Revisa la renovación, actualiza el pago o solicita asistencia.',
  },
  SUBSCRIPTION_CANCELLED: {
    badge: 'Suscripción cancelada',
    badgeIcon: 'cancel',
    tone: 'danger',
    title: 'La suscripción fue cancelada',
    summary: business =>
      `${business} conserva su configuración, pero el acceso operativo ya no está habilitado.`,
    statusTitle: 'Reactiva la suscripción para continuar',
    statusMessage:
      'Tus datos y la configuración del negocio permanecen guardados. Cuando la suscripción vuelva a estar activa, podrás ingresar nuevamente con normalidad.',
    supportTitle: '¿No reconoces la cancelación?',
    supportMessage:
      'Crea un ticket desde el Portal La Comanda para que nuestro equipo revise el caso antes de realizar cualquier cambio.',
    portalAction: 'Reactivar en el Portal',
    portalHint: 'Desde allí puedes reactivar el servicio o contactar con soporte.',
  },
  SUBSCRIPTION_NOT_ACTIVE: {
    badge: 'Activación pendiente',
    badgeIcon: 'hourglass_top',
    tone: 'warning',
    title: 'Tu suscripción todavía no está activa',
    summary: business =>
      `${business} tiene el acceso creado, pero la licencia no se encuentra en un estado activo.`,
    statusTitle: 'Revisa la activación de la licencia',
    statusMessage:
      'Puede faltar completar la contratación, asociar un plan o confirmar su activación. Revisa el estado en el portal antes de volver a intentar el acceso.',
    supportTitle: '¿Necesitas ayuda para activarla?',
    supportMessage:
      'Abre un ticket en el Portal La Comanda y nuestro equipo comprobará la configuración de tu cuenta y de la licencia.',
    portalAction: 'Revisar activación en el Portal',
    portalHint: 'Comprueba el estado de la licencia o crea un ticket de soporte.',
  },
};

@Component({
  selector: 'app-subscription-access-status',
  templateUrl: './subscription-access-status.component.html',
  styleUrls: ['./subscription-access-status.component.css'],
})
export class SubscriptionAccessStatusComponent implements OnInit {
  readonly portalUrl = environment.customerPortalUrl;
  readonly businessName: string | null;
  readonly errorCode: SubscriptionAccessCode;
  readonly content: SubscriptionAccessContent;
  readonly summary: string;

  constructor(
    private headerService: HeaderService,
    router: Router,
  ) {
    const state = router.getCurrentNavigation()?.extras.state ?? history.state;
    const businessName = state?.['businessName'];
    this.businessName = typeof businessName === 'string' && businessName.trim()
      ? businessName.trim()
      : null;
    this.errorCode = this.resolveErrorCode(state?.['errorCode']);
    this.content = SUBSCRIPTION_ACCESS_CONTENT[this.errorCode];
    this.summary = this.content.summary(
      this.businessName ? `La sucursal ${this.businessName}` : 'Tu negocio',
    );
  }

  ngOnInit(): void {
    this.headerService.hideHeader();
  }

  private resolveErrorCode(value: unknown): SubscriptionAccessCode {
    return typeof value === 'string'
      && Object.prototype.hasOwnProperty.call(SUBSCRIPTION_ACCESS_CONTENT, value)
      ? value as SubscriptionAccessCode
      : 'SUBSCRIPTION_NOT_ACTIVE';
  }
}
