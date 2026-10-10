import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { HeaderService } from '../../services/header.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription-payment-pending',
  templateUrl: './subscription-payment-pending.component.html',
  styleUrls: ['./subscription-payment-pending.component.css'],
})
export class SubscriptionPaymentPendingComponent implements OnInit {
  readonly portalUrl = environment.customerPortalUrl;
  readonly businessName: string | null;

  constructor(
    private headerService: HeaderService,
    router: Router,
  ) {
    const state = router.getCurrentNavigation()?.extras.state ?? history.state;
    const businessName = state?.['businessName'];
    this.businessName = typeof businessName === 'string' && businessName.trim()
      ? businessName.trim()
      : null;
  }

  ngOnInit(): void {
    this.headerService.hideHeader();
  }
}
