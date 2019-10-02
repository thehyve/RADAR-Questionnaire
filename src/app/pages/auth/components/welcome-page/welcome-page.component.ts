import { Component, ViewChild } from '@angular/core';
import { NavController, Slides } from 'ionic-angular';

import {
  DefaultLanguage,
  DefaultSettingsSupportedLanguages,
  LanguageMap
} from "../../../../../assets/data/defaultConfig";
import { AppComponent } from "../../../../core/containers/app.component";
import { StorageService } from "../../../../core/services/storage/storage.service";
import { LocKeys } from "../../../../shared/enums/localisations";
import { StorageKeys } from "../../../../shared/enums/storage";
import { LanguageSetting } from "../../../../shared/models/settings";
import { HomePageComponent } from "../../../home/containers/home-page.component";
import { EnrolmentPageComponent } from "../../containers/enrolment-page.component";
import { AuthService } from "../../services/auth.service";
import { LocalizationService } from "../../../../core/services/misc/localization.service";
import { AlertService } from "../../../../core/services/misc/alert.service";
import { ConfigService } from "../../../../core/services/config/config.service";
import { EnrolmentEventType, UsageEventType } from "../../../../shared/enums/events";
import { UsageService } from "../../../../core/services/usage/usage.service";
import {SplashPageComponent} from "../../../splash/containers/splash-page.component";
import {LogService} from "../../../../core/services/misc/log.service";

/**
 * Generated class for the WelcomePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome-page.component.html',
})
export class WelcomePageComponent {

  @ViewChild(Slides)
  slides: Slides;

  language?: LanguageSetting = DefaultLanguage
  loading: boolean = false
  showOutcomeStatus: boolean = false
  outcomeStatus: string
  languagesSelectable: LanguageSetting[] = DefaultSettingsSupportedLanguages;

  constructor(
    private navCtrl: NavController,
    private localization: LocalizationService,
    private storage: StorageService,
    private configService: ConfigService,
    private authService: AuthService,
    private alertService: AlertService,
    private usage: UsageService,
    private logger: LogService) {}

  ionViewDidLoad() {
    this.localization.update().then(lang => (this.language = lang))
  }

  ionViewDidEnter() {}

  showSelectLanguage() {
    const buttons = [
      {
        text: this.localization.translateKey(LocKeys.BTN_CANCEL),
        handler: () => {}
      },
      {
        text: this.localization.translateKey(LocKeys.BTN_SET),
        handler: selectedLanguageVal => {
          const lang: LanguageSetting = {
            label: LanguageMap[selectedLanguageVal],
            value: selectedLanguageVal
          }
          this.localization.setLanguage(lang).then(() => {
            this.language = lang
            return this.navCtrl.setRoot(EnrolmentPageComponent)
          })
        }
      }
    ]
    const inputs = this.languagesSelectable.map(lang => ({
      type: 'radio',
      label: this.localization.translate(lang.label),
      value: lang.value,
      checked: lang.value === this.language.value
    }))
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.SETTINGS_LANGUAGE_ALERT),
      buttons: buttons,
      inputs: inputs
    })
  }

  joinStudy() {
    this.navCtrl.setRoot(EnrolmentPageComponent);
  }

  goToLogin() {
    this.loading = true
    this.clearStatus()
    this.authService
      .authenticate(false)
      .catch(e => {
        if (e.status !== 409) throw e
      })
      .then(() => this.authService.initSubjectInformation())
      .then(() => {
        this.usage.sendGeneralEvent(EnrolmentEventType.SUCCESS)
        // this.next()
        this.navigateToSplash()
        // FIXME or navigate to splash most likely splash or home this.navigateToHome()
      })
      .catch(e => {
        this.handleError(e)
        // this.loading = false
        setTimeout(() => (this.loading = false), 500)
      })
    // this.loading = true;
    // // this.authService.keycloakLogin(true)
    // // FIXME: This should be similar to authenticate in enrolment
    // this.authService.authenticate({isRegistration: false})
    //   .then(() => this.authService.initSubjectInformation())
    //   .then(() => this.configService.fetchConfigState(true))
    //   .catch( () => {
    //     this.loading = false;
    //     this.alertService.showAlert({
    //       title: "Could not retrieve configuration",
    //       buttons: [{
    //         text: this.localization.translateKey(LocKeys.BTN_OKAY),
    //         handler: () => {}
    //       }],
    //       message: "Could not retrieve questionnaire configuration. Please try again later."
    //     })
    //   })
    //   .then(() => this.navigateToHome())
    //   .catch( () => {
    //     this.loading = false;
    //     this.alertService.showAlert({
    //       title: "Something went wrong",
    //       buttons: [{
    //         text: this.localization.translateKey(LocKeys.BTN_OKAY),
    //         handler: () => {}
    //       }],
    //       message: "Could not successfully redirect to login. Please try again later."
    //     })
    //   });
  }

  handleError(e) {
    this.logger.error('Failed to log in', e)
    this.outcomeStatus =
      e.error && e.error.message
        ? e.error.message
        : e.statusText + ' (' + e.status + ')'
    this.showStatus()
    this.usage.sendGeneralEvent(
      e.status == 409 ? EnrolmentEventType.ERROR : EnrolmentEventType.FAIL,
      {
        error: this.outcomeStatus
      }
    )
  }

  clearStatus() {
    this.showOutcomeStatus = false
    this.outcomeStatus = null
  }

  showStatus() {
    // setTimeout(() => (this.showOutcomeStatus = true), 500)
    this.showOutcomeStatus = true
  }

  navigateToHome() {
    this.navCtrl.setRoot(HomePageComponent)
  }

  navigateToSplash() {
    this.navCtrl.setRoot(SplashPageComponent)
  }
}