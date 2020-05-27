import { Injectable } from '@angular/core'

import { DefaultPlatformInstance } from '../../../../assets/data/defaultConfig'
import { QuestionnaireService } from '../../../core/services/config/questionnaire.service'
import { RemoteConfigService } from '../../../core/services/config/remote-config.service'
import { ScheduleService } from '../../../core/services/schedule/schedule.service'
import { ConfigKeys } from '../../../shared/enums/config'
import { Task, TasksProgress } from '../../../shared/models/task'
import { TaskType } from '../../../shared/utilities/task-type'
import { setDateTimeToMidnight } from '../../../shared/utilities/time'

@Injectable()
export class TasksService {
  constructor(
    private schedule: ScheduleService,
    private questionnaire: QuestionnaireService,
    private remoteConfig: RemoteConfigService
  ) {}

  evalHasClinicalTasks() {
    return this.questionnaire.getHasClinicalTasks()
  }
// from ucl
  getTasksOfNow() {
    const now = new Date().getTime()
    return this.schedule.getTasks(TaskType.ALL)
      .then((tasks: Task[]) => {
        return tasks.filter(t => t.timestamp <= now && t.timestamp + t.completionWindow > now)
      })
  }

  getTasksToComplete() {
    return this.schedule.getPendingTasksForNow()
  }
// end of from ucl
  getTasksOfToday() {
    return this.schedule
      .getTasksForDate(new Date(), TaskType.NON_CLINICAL)
      .then(tasks =>
        tasks.filter(
          t => !this.isTaskExpired(t) || this.wasTaskCompletedToday(t)
        )
      )
      .then( tasks =>
        tasks.sort( ((a, b) => a.timestamp - b.timestamp))
      )
  }

  getSortedTasksOfToday(): Promise<Map<number, Task[]>> {
    return this.getTasksOfToday().then(tasks => {
      const sortedTasks = new Map()
      tasks.forEach(t => {
        const midnight = setDateTimeToMidnight(new Date(t.timestamp)).getTime()
        if (sortedTasks.has(midnight)) sortedTasks.get(midnight).push(t)
        else sortedTasks.set(midnight, [t])
      })
      return sortedTasks
    })
  }

  getTaskProgress(): Promise<TasksProgress> {
    return this.getTasksOfToday().then(tasks => (this.calculateTaskProgress(tasks)))
  }

  calculateTaskProgress(tasks: Task[]) {
    const numberOfTasks = tasks.length
    const completedTasks = tasks.filter( d => d.completed).length
    const completedPercentage = completedTasks === 0 ? 0 : Math.round((completedTasks/numberOfTasks)*100)
    return {
      numberOfTasks,
      completedTasks,
      completedPercentage
    }
  }

  updateTaskToReportedCompletion(task) {
    this.schedule.updateTaskToReportedCompletion(task)
  }

  isToday(date) {
    return (
      new Date(date).setHours(0, 0, 0, 0) == new Date().setHours(0, 0, 0, 0)
    )
  }

  areAllTasksComplete(tasks) {
    return !tasks || tasks.every(t => t.completed || !this.isTaskStartable(t))
  }

  isLastTask(tasks) {
    return tasks.filter(t => this.isTaskStartable(t)).length <= 1
  }

  isTaskStartable(task) {
    // NOTE: This checks if the task timestamp has passed and if task is valid
    return !this.isTaskExpired(task)
  }

  isTaskExpired(task) {
    // NOTE: This checks if completion window has passed or task is complete
    return (
      task.timestamp + task.completionWindow < new Date().getTime() ||
      task.completed
    )
  }

  wasTaskCompletedToday(task) {
    return task.completed && this.isToday(task.timeCompleted)
  }

  /**
   * This function Retrieves the most current next task from a list of tasks.
   * @param tasks : list of tasks to retrieve the next task from.
   * @returns {@link Task} : The next incomplete task from the list. This essentially
   *                         translates to which questionnaire the `START` button on home page corresponds to.
   */
  getNextTask(tasks: Task[]): Task | undefined {
    let nextTask : Task = undefined
    if (tasks) {
      const nextTasksNow = tasks.filter(task => this.isTaskStartable(task))
      const isLastTask = this.isLastTask(tasks)
      if (nextTasksNow.length) {
        nextTask = nextTasksNow.sort((a, b) => a.order - b.order)[0]
      } else {
        nextTask = tasks.find(task => !this.isTaskExpired(task))
      }
      if (nextTask) {
        nextTask.isLastTask = isLastTask
      }
    }
    return nextTask
  }

  getCurrentDateMidnight() {
    return setDateTimeToMidnight(new Date())
  }

  getPlatformInstanceName() {
    return this.remoteConfig
      .read()
      .then(config =>
        config.getOrDefault(
          ConfigKeys.PLATFORM_INSTANCE,
          DefaultPlatformInstance
        )
      )
  }


  formatTime(date) {
    const hour = date.getHours()
    const min = date.getMinutes()
    const hourStr = date.getHours() < 10 ? '0' + String(hour) : String(hour)
    const minStr = date.getMinutes() < 10 ? '0' + String(min) : String(min)
    return hourStr + ':' + minStr
  }
}
