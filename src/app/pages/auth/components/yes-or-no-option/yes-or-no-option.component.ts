import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'

import { YesOrNoQuestion } from "../../../../shared/models/auth";
import { Item } from "../../../../shared/models/question";
import {LocalizationService} from "../../../../core/services/misc/localization.service";

let uniqueID = 0

@Component({
  selector: 'yes-or-no-option',
  templateUrl: 'yes-or-no-option.component.html'
})
export class YesOrNoOptionComponent implements OnInit {
  @Output()
  valueChange: EventEmitter<YesOrNoQuestion> = new EventEmitter<YesOrNoQuestion>()

  @Input()
  question: YesOrNoQuestion


  responses: any = [
    {label: this.localization.translate("QUESTION_YES"), code: true},
    {label: this.localization.translate("QUESTION_NO"), code: false}
  ]
  value: number = null
  uniqueID: number = uniqueID++
  name = `yes-or-no-${this.uniqueID}`
  items: Item[] = Array()

  constructor(private localization: LocalizationService){}

  ngOnInit() {
    this.responses.map((item, i) => {
      this.items.push({
        id: `yes-or-no-${this.uniqueID}-${i}`,
        response: item.label,
        value: item.code
      })
    })
  }

  onInputChange(event) {
    this.question.answer = event
    this.question.isAnswered = true
    this.valueChange.emit(this.question)
  }
}
