import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NavController } from 'ionic-angular'

import { LearningPageComponent } from "./learning-page.component";
import { AppModule } from '../../../../app.module';

describe('LearningPageComponent', () => {
  let component
  let fixture: ComponentFixture<any>

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AppModule],
      declarations: [],
      providers: [NavController]
    }).compileComponents()

    fixture = TestBed.createComponent(LearningPageComponent)
    component = fixture.debugElement.componentInstance
    fixture.detectChanges()
  })

  afterEach(() => {
    fixture.destroy()
  })

  it('should create', () => {
    expect(component instanceof LearningPageComponent).toBe(true)
  })
})
