import { Component } from '@angular/core'
import { NavController } from 'ionic-angular'

import {DefaultLanguage} from "../../../../../assets/data/defaultConfig";
import {AlertService} from "../../../../core/services/misc/alert.service";
import {LocalizationService} from "../../../../core/services/misc/localization.service";
import {LogService} from "../../../../core/services/misc/log.service";
import {StorageService} from "../../../../core/services/storage/storage.service";
import {UsageService} from "../../../../core/services/usage/usage.service";
import {ConsentPageItem} from "../../../../shared/models/auth";
import {LanguageSetting} from "../../../../shared/models/settings";
import {SettingsPageComponent} from "../../../settings/containers/settings-page.component";
import {HomePageComponent} from "../../containers/home-page.component";

@Component({
  selector: 'page-learning',
  templateUrl: 'learning-page.component.html'
})
export class LearningPageComponent {

  loading: boolean = false
  showOutcomeStatus: boolean = false
  outcomeStatus: string

  learningPageItems: ConsentPageItem[]
  language?: LanguageSetting = DefaultLanguage

  constructor(
    public navCtrl: NavController,
    private localization: LocalizationService,
    private alertService: AlertService,
    private usage: UsageService,
    private logger: LogService,
    private storage: StorageService,
    public window: Window
  ) {
    this.logger.log("Creating learning page")
    this.localization.update().then(lang => (this.language = lang))
  }

  ionViewDidLoad() {
    this.usage.setPage(this.constructor.name)
  }

  clearStatus() {
    this.showOutcomeStatus = false
  }

  showStatus() {
    setTimeout(() => (this.showOutcomeStatus = true), 500)
  }

  navigateToHome() {
    this.navCtrl.setRoot(HomePageComponent)
  }

  navigateToSettings() {
    this.navCtrl.setRoot(SettingsPageComponent)
  }

}
