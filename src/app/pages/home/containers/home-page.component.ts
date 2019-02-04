import { Component } from '@angular/core'
import { NavController, Platform } from 'ionic-angular'

import { AlertService } from '../../../core/services/misc/alert.service'
import { LocalizationService } from '../../../core/services/misc/localization.service'
import { LocKeys } from '../../../shared/enums/localisations'
import { Task, TasksProgress } from '../../../shared/models/task'
import { checkTaskIsNow } from '../../../shared/utilities/check-task-is-now'
import { ClinicalTasksPageComponent } from '../../clinical-tasks/containers/clinical-tasks-page.component'
import { QuestionsPageComponent } from '../../questions/containers/questions-page.component'
import { SettingsPageComponent } from '../../settings/containers/settings-page.component'
import { SplashPageComponent } from '../../splash/containers/splash-page.component'
import { HomeService } from '../services/home.service'
import { TasksService } from '../services/tasks.service'
import { HomePageAnimations } from './home-page.animation'

@Component({
  selector: 'page-home',
  templateUrl: 'home-page.component.html',
  animations: HomePageAnimations
})
export class HomePageComponent {
  tasks: Promise<Task[]>
  tasksDate: Date
  nextTask: Task
  showCalendar = false
  showCompleted = false
  showNoTasksToday = false
  tasksProgress: TasksProgress = { numberOfTasks: 1, completedTasks: 0 }
  startingQuestionnaire = false
  hasClinicalTasks: Promise<boolean>
  taskIsNow = false
  checkTaskInterval
  lastTaskIndex: number

  constructor(
    public navCtrl: NavController,
    public alertService: AlertService,
    private tasksService: TasksService,
    private localization: LocalizationService,
    private platform: Platform,
    private home: HomeService
  ) {
    this.platform.resume.subscribe(() => this.onResume())
  }

  ionViewWillEnter() {
    this.startingQuestionnaire = false
    this.home.emptyCache()
  }

  ionViewDidLoad() {
    this.init()
    this.home.sendNonReportedCompletionLogs()
  }

  init() {
    this.tasks = this.tasksService.getTasksOfToday()
    this.tasks.then(tasks => {
      this.checkTaskInterval = setInterval(() => {
        this.checkForNextTask(tasks)
      }, 1000)
      this.tasksProgress = this.tasksService.getTaskProgress(tasks)
      this.showNoTasksToday = this.tasksProgress.numberOfTasks == 0
      this.lastTaskIndex = tasks[tasks.length - 1].index
    })
    this.hasClinicalTasks = this.tasksService.evalHasClinicalTasks()
  }

  onResume() {
    this.home.sendOpenEvent()
    this.home.emptyCache()
    this.checkForNewDate()
  }

  checkForNewDate() {
    if (new Date().getDate() !== this.tasksDate.getDate()) {
      this.tasksDate = new Date()
      this.navCtrl.setRoot(SplashPageComponent)
    }
  }

  checkForNextTask(tasks) {
    const task = this.tasksService.getNextTask(tasks)
    if (task && task.isClinical == false) {
      this.nextTask = task
      this.taskIsNow = checkTaskIsNow(this.nextTask.timestamp)
      this.showCompleted = !this.nextTask
    } else {
      this.taskIsNow = false
      this.nextTask = null
      this.showCompleted = this.tasksService.areAllTasksComplete(tasks)
      if (this.showCompleted) {
        clearInterval(this.checkTaskInterval)
        this.showCalendar = false
      }
    }
  }

  displayTaskCalendar() {
    this.showCalendar = !this.showCalendar
  }

  startQuestionnaire(taskCalendarTask: Task) {
    // NOTE: User can start questionnaire from task calendar or start button in home.
    const task = taskCalendarTask ? taskCalendarTask : this.nextTask

    if (this.tasksService.isTaskValid(task)) {
      this.startingQuestionnaire = true
      this.home.sendStartEvent()
      return this.tasksService
        .getQuestionnairePayload(task)
        .then(payload => this.navCtrl.push(QuestionsPageComponent, payload))
    } else {
      this.showMissedInfo()
    }
  }

  showCredits() {
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.CREDITS_TITLE),
      message: this.localization.translateKey(LocKeys.CREDITS_BODY),
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_OKAY),
          handler: () => {}
        }
      ]
    })
  }

  showMissedInfo() {
    return this.alertService.showAlert({
      title: this.localization.translateKey(LocKeys.CALENDAR_ESM_MISSED_TITLE),
      message: this.localization.translateKey(LocKeys.CALENDAR_ESM_MISSED_DESC),
      buttons: [
        {
          text: this.localization.translateKey(LocKeys.BTN_OKAY),
          handler: () => {}
        }
      ]
    })
  }

  openSettingsPage() {
    this.navCtrl.push(SettingsPageComponent)
  }

  openClinicalTasksPage() {
    this.navCtrl.push(ClinicalTasksPageComponent)
  }
}
