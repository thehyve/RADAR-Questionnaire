import { Injectable } from '@angular/core'

import { DefaultNumberOfCompletionLogsToSend } from '../../../../assets/data/defaultConfig'
import { AuthConfigService } from '../../../core/services/config/auth-config.service'
import { ConfigService } from '../../../core/services/config/config.service'
import { ScheduleService } from '../../../core/services/schedule/schedule.service'
import { TokenService } from '../../../core/services/token/token.service'
import { UsageService } from '../../../core/services/usage/usage.service'

@Injectable()
export class SplashService {
  constructor(
    private config: ConfigService,
    private token: TokenService,
    private schedule: ScheduleService,
    private usage: UsageService,
    private authConfig: AuthConfigService
  ) {}

  evalEnrolment() {
    return this.token.isValid().catch(() => false)
  }

  loadConfig() {
    this.token.refresh()
    return this.config.fetchConfigState()
  }

  isAppUpdateAvailable() {
    return this.config.checkForAppUpdates()
  }

  reset() {
    return this.config.resetAll().then(() => this.authConfig.init())
  }

  sendMissedQuestionnaireLogs() {
    return this.schedule.getIncompleteTasks().then(tasks =>
      Promise.all(
        tasks
          .filter(t => !t.reportedCompletion)
          .slice(0, DefaultNumberOfCompletionLogsToSend)
          .map(task =>
            this.usage
              .sendCompletionLog(task, 0)
              .then(() => this.schedule.updateTaskToReportedCompletion(task))
          )
      )
    )
  }
}
