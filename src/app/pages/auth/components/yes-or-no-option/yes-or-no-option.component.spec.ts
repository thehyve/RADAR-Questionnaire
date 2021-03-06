import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NavController } from 'ionic-angular'

import { YesOrNoOptionComponent } from "./yes-or-no-option.component";
import { AppModule } from '../../../../app.module';

describe('YesOrNoOptionComponent', () => {
  let component
  let fixture: ComponentFixture<any>

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AppModule],
      declarations: [],
      providers: [NavController]
    }).compileComponents()

    fixture = TestBed.createComponent(YesOrNoOptionComponent)
    component = fixture.debugElement.componentInstance
    fixture.detectChanges()
  })

  afterEach(() => {
    fixture.destroy()
  })

  it('should create', () => {
    expect(component instanceof YesOrNoOptionComponent).toBe(true)
  })
})
