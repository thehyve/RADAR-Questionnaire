import { Component, OnInit } from '@angular/core';
import {ConsentPageItem} from "../../../../shared/models/auth";

@Component({
  selector: 'study-info',
  templateUrl: 'study-info.component.html',
})
export class StudyInfoComponent implements OnInit {
  consentPageItems: ConsentPageItem[];

  constructor(public window: Window) {}


  ngOnInit() {
  }

}
