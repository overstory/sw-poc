/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { ForceComponent } from './force.component';

describe('ForceComponent', () => {
  let component: ForceComponent;
  let fixture: ComponentFixture<ForceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ForceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ForceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
