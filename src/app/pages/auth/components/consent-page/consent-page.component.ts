import { Component, ViewChild } from '@angular/core'
import { NavController, Slides } from 'ionic-angular'
import { LanguageSetting } from "../../../../shared/models/settings";
import { AuthService } from "../../services/auth.service";
import { LocalizationService } from "../../../../core/services/misc/localization.service";
import { AlertService } from "../../../../core/services/misc/alert.service";
import { UsageService } from "../../../../core/services/usage/usage.service";
import { LogService } from "../../../../core/services/misc/log.service";
import { StorageService } from "../../../../core/services/storage/storage.service";
import { DefaultLanguage } from "../../../../../assets/data/defaultConfig";
import { LocKeys } from "../../../../shared/enums/localisations";
import { StorageKeys } from "../../../../shared/enums/storage";
import { EnrolmentEventType } from "../../../../shared/enums/events";
import { SplashPageComponent } from "../../../splash/containers/splash-page.component";
import { HomePageComponent } from "../../../home/containers/home-page.component";
import { WelcomePageComponent } from "../welcome-page/welcome-page.component";
import { EligibilityPageComponent } from "../eligibility-page/eligibility-page.component";
import { YesOrNoQuestion, ConsentPageItem } from "../../../../shared/models/auth";


@Component({
  selector: 'page-consent',
  templateUrl: 'consent-page.component.html'
})
export class ConsentPageComponent {
  @ViewChild(Slides)
  slides: Slides
  loading: boolean = false
  showOutcomeStatus: boolean = false
  outcomeStatus: string

  questions: YesOrNoQuestion[]
  evaluatedQuestions: Map<number, YesOrNoQuestion>
  totalNumberOfConsentsRequired: number = 2
  isSubmitConsentDisabled = true

  consentPageItems: ConsentPageItem[]
  language?: LanguageSetting = DefaultLanguage

  constructor(
    public navCtrl: NavController,
    private auth: AuthService,
    private localization: LocalizationService,
    private alertService: AlertService,
    private usage: UsageService,
    private logger: LogService,
    private storage: StorageService,
  ) {
    this.localization.update().then(lang => (this.language = lang))
    this.questions = [
      {
        questionId: 1,
        isAnswered: false,
        question: "I consent (agree) to take part in the Health on the MovE (HOME) Study",
        answer: undefined
      },
      {
        questionId: 2,
        isAnswered: false,
        question: "I consent (agree) to the collection of data about my physical, mental and sexual health",
        answer: undefined
      }
    ];
    this.consentPageItems = [
      {
        title: "Time Commitment",
        iconMd: "md-alarm",
        detail: [
          `<div class="detail text-align">We know your time is valuable. That’s why the HOME app has two types of surveys — one short and one longer. Each time we want you to complete one of these surveys you will be sent a notification to open the HOME app.</div>` +
          `<div class="detail text-align">In the short survey, sent either once a week or every three days, you will be asked about your health in the last week. If you have been feeling well, this will take less than 15 seconds to complete. If you have not been well, it will take about 1 min to complete.</div>` +
          `<div class="detail text-align">In the longer surveys, sent once a week, you will be asked about a wider range of health and non-health related questions. These surveys are designed to take less than 5 minutes to complete.</div>` +
          `<div class="detail text-align">We kindly ask you to participate for a period of 3 months.</div>`
        ]
      },
      {
        title: "Benefits",
        iconMd: "md-chatbubbles",
        detail: [
          `<div class="detail text-align">Taking part in this study will help us gain a better understanding of the health of migrants like you in the UK. While there are no immediate benefits for you, every survey that you fill out will increase our understanding of the health and wellbeing of migrants.</div>`
        ]
      },
      {
        title: "Data Collection",
        iconMd: "md-analytics",
        detail: [
          `<div class="detail text-align">The survey questions will cover a wide range of topics that can affect your health and wellbeing, like your nutrition, housing, employment, and experience with your GP or healthcare provider. </div>` +
          `<div class="detail text-align">You may find that some questions do not apply to you or make you feel uncomfortable. You will be able to stop the survey at any time by pressing the ‘close’ button.</div>` +
          `<div class="detail text-align">Your data will be used for academic research by UCL and only de-personalised results will be shared to improve health, care and services for the migrant community.</div>`
        ]
      },
      {
        title: "Study Findings",
        iconMd: "md-school",
        detail: [
          `<div class="detail text-align">The results of this study will be written up and published in scientific journals as well as within wider media platforms. We will engage with policymakers to help them make decisions that better reflect the health needs of migrants like yourself in the UK. Additionally, we will send you summaries of our analysed data every few weeks via email. The results will also be on the study website <a href="http://homeappstudy.net/">www.homeappstudy.net</a>.</div>`
        ]
      },
      {
        title: "Follow Up",
        iconMd: "md-mail",
        detail: [
          `<div class="detail text-align">Your email address will be included in this research study's registry. We will send a newsletter every few weeks with information about this study. You can opt out of this registry at any time to stop receiving the newsletter or any other form of correspondence.</div>`
        ]
      },
      {
        title: "Privacy",
        iconMd: "md-lock",
        detail: [
          `<div class =\"detail text-align\">We take our obligation to protect your privacy very seriously. All of your information will be kept strictly confidential throughout the research project. It will not be possible to identify you from any of the publications or reports that are based on this study. Any answers you give to the survey questions will go from the app, to a secure server hosted by Amazon, and then straight to UCL.</div>`
        ]
      },
      {
        title: "Data Protection",
        iconMd: "md-paper",
        detail: [
          `<div class="detail text-align">The controller for this project will be University College London (UCL). The UCL Data Protection Officer provides oversight of UCL activities involving the processing of personal data, and can be contacted at <a href="mailto:data-protection@ucl.ac.uk">data-protection@ucl.ac.uk</a>. This ‘local’ privacy notice sets out the information that applies to this particular study. Further information on how UCL uses participant information can be found in our ‘general’ privacy notice. For participants in health and care research studies, click <a href="https://www.ucl.ac.uk/legal-services/privacy/ucl-general-privacy-notice-participants-and-researchers-health-and-care-research-studies">here</a>. </div>` +
          `<div class="detail text-align">The information that is required to be provided to participants under data protection legislation (GDPR and DPA 2018) is provided across both the ‘local’ and ‘general’ privacy notices. The lawful basis that will be used to process your personal data are: ‘Public task’ for personal data and ‘Research purposes’ for special category data. </div>` +
          `<div class="detail text-align">Your personal data will be processed so long as it is required for the research project. If we are able to anonymise or pseudonymise the personal data you provide we will undertake this, and will endeavour to minimise the processing of personal data wherever possible. If you are concerned about how your personal data is being processed, or if you would like to contact us about your rights, please contact UCL in the first instance at <a href="mailto:data-protection@ucl.ac.uk">data-protection@ucl.ac.uk</a>.</div>`
        ]
      },
      {
        title: "Disadvantages",
        iconMd: "md-warning",
        detail: [
          `<div class="detail text-align">In this study you will be asked questions relating to migration, mental and sexual health which you may find distressing. There is a possibility that completing the surveys could evoke previous negative experiences with your health or migratory experience.</div>` +
          `<div class="detail text-align">Before you undertake a survey you will be explained in short about its content and you can then decide whether to take part in that particular survey. Should you become distressed, following most surveys, we will include information to signpost you to national support related to the survey you have just undertaken. Additionally, the resource section of the HOME app will have more information about the health and migration services available in the UK.</div>` +
          `<div class="detail text-align">We advise you to contact your GP or local mental health services should you feel you need more support.</div>`
        ]
      },
      {
        title: "Withdrawing",
        iconMd: "md-log-out",
        detail: [
          `<div class="detail text-align">Your participation in this study is entirely voluntary. You may withdraw your consent and stop your participation in this study at any time. If you choose to withdraw, we will stop collecting any new data and can destroy all of the data we have previously collected. To withdraw from the study, simply send an email to the research team at <a href="mailto:r.aldridge@ucl.ac.uk>r.aldridge@ucl.ac.uk</a>.</div>`
        ]
      },
      {
        title: "Contact Us",
        iconMd: "md-paper-plane",
        detail: [
          `<div class="detail text-align">If you have any questions prior to participating in the study or during the course of the study, please feel free to contact the HOME study team at any time by sending us an email at <a href="mailto:homeappstudy@ucl.ac.uk">homeappstudy@ucl.ac.uk</a>.</div>` +
          `<div class="detail text-align">We will reply to your message as soon as we can.</div>`
        ]
      }
    ]
    this.evaluatedQuestions = new Map<number, YesOrNoQuestion>()
  }

  ionViewDidLoad() {
    this.slides.lockSwipes(true)
    this.usage.setPage(this.constructor.name)
  }

  next() {
    this.slides.lockSwipes(false)
    const slideIndex = this.slides.getActiveIndex() + 1
    this.slides.slideTo(slideIndex, 500)
    this.slides.lockSwipes(true)
  }

  goBack() {
    this.slides.lockSwipes(false)
    const slideIndex = this.slides.getActiveIndex() - 1
    this.slides.slideTo(slideIndex, 500)
    this.slides.lockSwipes(true)
  }

  processConsent() {
    if (this.evaluatedQuestions.size === this.totalNumberOfConsentsRequired) {
      const consentNotGiven = Array.from(this.evaluatedQuestions.values())
        .filter(
          d => {
            return (
              d.answer === false
            )
          }).length

      if (consentNotGiven === 0) {
        this.usage.sendGeneralEvent(EnrolmentEventType.CONSENT_RECEIVED)
        this.storage.set(StorageKeys.CONSENT_ACCESS_NHS_RECORDS, true);
        this.authenticate();
      } else if (consentNotGiven === 2) {
        this.usage.sendGeneralEvent(EnrolmentEventType.CONSENT_NOT_RECEIVED)
        this.next()
      } else {
        this.usage.sendGeneralEvent(EnrolmentEventType.CONSENT_PARTIALLY_RECEIVED)
        this.alertService.showAlert({
          title: "Full Consent Required",
          buttons: [{
            text: this.localization.translateKey(LocKeys.BTN_OKAY),
            handler: () => {}
          }],
          message: "Your consent to both points is required to be able to participate in the HOME study."
        })
      }
    }
  }

  slideTo(index: number) {
    this.slides.lockSwipes(false)
    this.slides.slideTo(index, 500)
    this.slides.lockSwipes(true)
  }

  authenticate() {
    // this.usage.sendGeneralEvent(EnrolmentEventType.ELIGIBILITY_MET)
    this.loading = true
    this.clearStatus()
    this.auth
      .authenticate(true)
      .catch(e => {
        this.handleError(e)
        this.loading = false
      })
      .then(() => this.auth.initSubjectInformation())
      .then(() => {
        this.usage.sendGeneralEvent(EnrolmentEventType.SUCCESS)
        this.navigateToSplash()
      })
      .catch(e => {
        this.handleError(e)
        this.loading = false
        this.alertService.showAlert({
                  title: "Something went wrong",
                  buttons: [{
                    text: this.localization.translateKey(LocKeys.BTN_OKAY),
                    handler: () => {}
                  }],
                  message: "Could not complete the registration process. Please try again later."
                });
        // this.navigateToWelcome()
      })
  }

  handleError(e) {
    this.logger.error('Failed to register', e)
    this.showStatus()
    this.outcomeStatus =
      e.error && e.error.message
        ? e.error.message
        : e.statusText + ' (' + e.status + ')'
    this.usage.sendGeneralEvent(
      e.status == 409 ? EnrolmentEventType.ERROR : EnrolmentEventType.FAIL,
      {
        error: this.outcomeStatus
      }
    )
  }

  clearStatus() {
    this.showOutcomeStatus = false
  }

  showStatus() {
    setTimeout(() => (this.showOutcomeStatus = true), 500)
  }

  navigateToSplash() {
    this.navCtrl.setRoot(SplashPageComponent)
  }

  navigateToHome() {
    this.navCtrl.setRoot(HomePageComponent)
  }

  navigateToWelcome() {
    this.navCtrl.setRoot(WelcomePageComponent)
  }

  navigateToEligibility() {
    this.navCtrl.setRoot(EligibilityPageComponent)
  }

  onValueChange(event: YesOrNoQuestion) {
    // NOTE: On init the component fires the event once
    if (event === undefined) {
      return
    }
    this.evaluatedQuestions.set(event.questionId, event)
    // if total number of res questions are answered
    if (this.evaluatedQuestions.size === this.totalNumberOfConsentsRequired) {
      this.isSubmitConsentDisabled = false
    }
  }
}
