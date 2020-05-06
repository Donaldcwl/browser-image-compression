import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ImageCompressComponent }   from './image-compress/image-compress.component';

const routes: Routes = [
  { path: '', redirectTo: '/image-compress', pathMatch: 'full' },
  { path: 'image-compress', component: ImageCompressComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
