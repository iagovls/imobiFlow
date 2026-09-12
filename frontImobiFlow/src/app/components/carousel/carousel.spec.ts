import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Carousel } from './carousel';

describe('Carousel', () => {
  let component: Carousel;
  let fixture: ComponentFixture<Carousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Carousel],
    }).compileComponents();

    fixture = TestBed.createComponent(Carousel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps every slide image mounted so both directions can animate', async () => {
    fixture.componentRef.setInput('images', [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll('.carousel-item');
    const imgs = fixture.nativeElement.querySelectorAll('.carousel-item img');
    expect(items.length).toBe(3);
    expect(imgs.length).toBe(3);
    expect(items[0].classList.contains('active')).toBe(true);

    component.next();
    fixture.detectChanges();

    expect(items.length).toBe(fixture.nativeElement.querySelectorAll('.carousel-item').length);
    expect(fixture.nativeElement.querySelectorAll('.carousel-item img').length).toBe(3);
    expect(items[0].classList.contains('active')).toBe(false);
    expect(items[1].classList.contains('active')).toBe(true);

    component.prev();
    fixture.detectChanges();
    expect(items[0].classList.contains('active')).toBe(true);
  });
});
