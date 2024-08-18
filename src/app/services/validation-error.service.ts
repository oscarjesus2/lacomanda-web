import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class ValidationErrorService {

  private currentForm: FormGroup | null = null;

  constructor() { }

  setCurrentForm(form: FormGroup) {
    this.currentForm = form;
  }

  getCurrentForm(): FormGroup | null {
    return this.currentForm;
  }

  mapServerErrorsToForm(errors: any, form: FormGroup) {
    if (errors && errors.errors) {
      Object.keys(errors.errors).forEach((key) => {
        const formControlName = this.getFormControlNameFromKey(key);
        if (formControlName && form.controls[formControlName]) {
          form.controls[formControlName].setErrors({
            serverError: errors.errors[key].join(' ')
          });
        }
      });
    }
  }

  private getFormControlNameFromKey(key: string): string {
    return key.replace(/\[(\d+)\]/g, '.$1');
  }
}
