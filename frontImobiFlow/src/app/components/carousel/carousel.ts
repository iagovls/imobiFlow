import { Component, ElementRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';

export interface CarouselImage {
  url: string;
  alt?: string;
}

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [],
  templateUrl: './carousel.html',
  styleUrl: './carousel.scss',
})
export class Carousel {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() images: CarouselImage[] = [];
  @Input() set activeIndex(value: number) {
    if (value !== this.currentIndex()) {
      this.currentIndex.set(value);
    }
  }
  get activeIndex(): number {
    return this.currentIndex();
  }
  @Input() wrap = true;
  @Input() touch = true;
  @Input() showIndicators = true;
  @Input() showControls = true;
  @Input() prevCaption = 'Anterior';
  @Input() nextCaption = 'Próxima';

  @Output() activeIndexChange = new EventEmitter<number>();

  currentIndex = signal(0);

  private touchStartX = 0;
  private touchCurrentX = 0;

  next() {
    const total = this.images.length;
    if (!total) return;
    const isLast = this.currentIndex() === total - 1;
    if (isLast && !this.wrap) return;
    this.goTo((this.currentIndex() + 1) % total);
  }

  prev() {
    const total = this.images.length;
    if (!total) return;
    const isFirst = this.currentIndex() === 0;
    if (isFirst && !this.wrap) return;
    this.goTo((this.currentIndex() - 1 + total) % total);
  }

  goTo(index: number) {
    this.currentIndex.set(index);
    this.activeIndexChange.emit(index);
  }

  onTouchStart(event: TouchEvent) {
    if (!this.touch) return;
    this.touchStartX = event.touches[0]?.clientX ?? 0;
    this.touchCurrentX = this.touchStartX;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.touch) return;
    this.touchCurrentX = event.touches[0]?.clientX ?? this.touchCurrentX;
  }

  onTouchEnd() {
    if (!this.touch) return;
    const distanceX = this.touchStartX - this.touchCurrentX;
    const width = this.elementRef.nativeElement.clientWidth || 1;
    if (Math.abs(distanceX) > 0.3 * width) {
      distanceX > 0 ? this.next() : this.prev();
    }
  }
}
