import { Component } from '@angular/core';

import {ConsentPageItem} from "../../../../shared/models/auth";
import {UsageService} from "../../../../core/services/usage/usage.service";

@Component({
  selector: 'study-info',
  templateUrl: 'study-info.component.html',
})
export class StudyInfoComponent {
  consentPageItems: ConsentPageItem[];

  constructor(
    public window: Window,
    private usage: UsageService) {}


  ionViewDidLoad() {
    this.usage.setPage(this.constructor.name)
  }

}
