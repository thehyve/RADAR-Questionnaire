import { NgModule } from '@angular/core'

import { GetValuesPipe } from "./get-values.pipe";
import { TranslatePipe } from './translate/translate'

@NgModule({
  declarations: [TranslatePipe, GetValuesPipe],
  exports: [TranslatePipe, GetValuesPipe]
})
export class PipesModule {}
