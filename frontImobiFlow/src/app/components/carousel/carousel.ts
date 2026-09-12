import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CarouselComponent,
  CarouselConfig,
  CarouselControlComponent,
  CarouselIndicatorsComponent,
  CarouselInnerComponent,
  CarouselItemComponent
} from '@coreui/angular';
import { CarouselCustomConfig } from '../../services/carousel.config';

@Component({
  selector: 'docs-carousel-with-indicators',
  template: `
    <c-carousel>
      <c-carousel-indicators />
        <c-carousel-inner>
          @for (slide of slides; track slide.src) {
            <c-carousel-item>
              <img
                [src]="slide.src"
                alt="{{ slide.title }}"
                class="d-block w-100"
                loading="lazy" />
            </c-carousel-item>
            }
        </c-carousel-inner>
      <c-carousel-control [routerLink] caption="Previous" direction="prev" />
    <c-carousel-control [routerLink] caption="Next" direction="next" />
  </c-carousel>
  `,
  imports: [
    CarouselComponent,
    CarouselIndicatorsComponent,
    CarouselInnerComponent,
    CarouselItemComponent,
    CarouselControlComponent,
    RouterLink
  ],
  providers: [{ provide: CarouselConfig, useClass: CarouselCustomConfig }]
})
export class CarouselWithIndicatorsComponent implements OnInit {
  slides: any[] = new Array(3).fill({ id: -1, src: '', title: '', subtitle: '' });

  ngOnInit(): void {
    this.slides[0] = {
      src: '/assets/img/angular.jpg'
    };
    this.slides[1] = {
      src: '/assets/img/react.jpg'
    };
    this.slides[2] = {
      src: '/assets/img/vue.jpg'
    };
  }
}
