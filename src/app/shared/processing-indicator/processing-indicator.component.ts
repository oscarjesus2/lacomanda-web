import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ProcessingIndicatorService } from '../../services/processing-indicator.service';

@Component({
  selector: 'app-processing-indicator',
  templateUrl: './processing-indicator.component.html',
  styleUrls: ['./processing-indicator.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessingIndicatorComponent {
  readonly state$ = this.processingIndicator.state$;

  constructor(
    private readonly processingIndicator: ProcessingIndicatorService,
  ) {}
}
