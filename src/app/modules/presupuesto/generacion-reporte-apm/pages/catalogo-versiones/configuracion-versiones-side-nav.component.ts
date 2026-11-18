import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { MessageBoxComponent } from '../../../../../shared/ui/message-box/message-box.component';
import { TextFieldComponent, TextFieldOption } from '../../../../../shared/ui/text-field/text-field.component';

/** Campo etiqueta/valor de los parámetros de la versión actual. */
export interface CampoVersion {
  label: string;
  value: string;
}

/**
 * Panel lateral «CONFIGURACIÓN DE VERSIONES» del proceso «Generación de reporte APM».
 *
 * Abre un drawer a la derecha con el fondo plomo sobre el área de trabajo; se cierra con la «X» o al
 * hacer clic afuera. Muestra los parámetros de la versión actual (solo lectura) y, debajo, un selector
 * para «Copiar desde una versión»: al elegir una versión y pulsar «Aplicar» emite el valor elegido para
 * que la pantalla copie los registros procesados de esa versión a la actual.
 */
@Component({
  selector: 'siaf-apm-configuracion-versiones-side-nav',
  standalone: true,
  imports: [ButtonComponent, IconComponent, MessageBoxComponent, TextFieldComponent],
  template: `
    @if (open) {
      <section
        class="fixed inset-0 z-50 bg-black/55 lg:pl-[65px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apm-config-versiones-title"
        (click)="closed.emit()"
      >
        <aside
          class="absolute bottom-0 right-0 top-0 flex w-full max-w-[480px] flex-col overflow-hidden bg-surface shadow-siaf-lg"
          (click)="$event.stopPropagation()"
        >
          <header class="flex h-14 shrink-0 items-center gap-siaf-xs border-b border-[var(--sys-color-divider-default)] px-siaf-md">
            <h2 id="apm-config-versiones-title" class="m-0 flex-1 text-base font-bold uppercase tracking-[0.02px] text-text">
              Configuración de versiones
            </h2>
            <button
              class="inline-flex size-10 items-center justify-center rounded-siaf-md text-text transition hover:bg-surface-muted active:bg-[var(--sys-color-bg-states-light-pressed)]"
              type="button"
              aria-label="Cerrar"
              (click)="closed.emit()"
            >
              <siaf-icon name="close" [size]="24" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-siaf-xl py-siaf-lg">
            <div class="flex flex-col gap-siaf-lg">
              <!-- Parámetros de la versión actual (solo lectura) -->
              <section class="flex flex-col gap-siaf-md">
                <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
                  Parámetros de la versión actual
                </h3>
                <dl class="m-0 flex flex-col gap-siaf-md">
                  @for (campo of version; track campo.label) {
                    <div class="flex flex-col gap-siaf-xxs">
                      <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">{{ campo.label }}</dt>
                      <dd class="m-0 text-sm text-[var(--sys-color-text-neutral-high)]">{{ campo.value }}</dd>
                    </div>
                  }
                </dl>
              </section>

              <hr class="m-0 border-0 border-t border-[var(--sys-color-divider-default)]" />

              <!-- Copiar desde una versión -->
              <section class="flex flex-col gap-siaf-md">
                <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
                  Copiar desde una versión
                </h3>
                <message-box text="Selecciona una versión para reutilizar sus datos procesados en la actual." />
                <siaf-input
                  label="Nombre de versión"
                  type="select"
                  placeholder="Nombre de versión"
                  [options]="opcionesVersiones"
                  [value]="versionElegida()"
                  (valueChange)="versionElegida.set($any($event))"
                />
              </section>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-end gap-siaf-xs border-t border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm">
            <button
              class="inline-flex min-h-10 items-center justify-center rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] px-siaf-md py-siaf-xs text-sm font-medium text-text transition hover:bg-surface-muted active:bg-[var(--sys-color-bg-states-light-pressed)]"
              type="button"
              (click)="closed.emit()"
            >
              Cancelar
            </button>
            <siaf-button variant="primary" size="md" [disabled]="!versionElegida()" (click)="aplicar()">
              Aplicar
            </siaf-button>
          </div>
        </aside>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApmConfiguracionVersionesSideNavComponent {
  /** Parámetros de la versión actual (los mismos que muestra la tarjeta de versión). */
  @Input() version: ReadonlyArray<CampoVersion> = [];

  @Input()
  set open(value: boolean) {
    this._open = value;
    // Al abrir, el selector arranca sin elegir (y el botón Aplicar deshabilitado).
    if (value) this.versionElegida.set('');
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  @Output() closed = new EventEmitter<void>();
  @Output() aplicada = new EventEmitter<string>();

  /** Versiones disponibles para copiar (datos de ejemplo: todas traen la misma data procesada). */
  readonly opcionesVersiones: TextFieldOption[] = [
    { label: 'Versión Nro 2', value: 'v2' },
    { label: 'Versión Nro 3', value: 'v3' },
    { label: 'Versión Nro 4', value: 'v4' },
    { label: 'Versión Nro 5', value: 'v5' },
  ];

  /** Versión elegida en el selector (vacío mientras no se elige ninguna). */
  readonly versionElegida = signal('');

  aplicar(): void {
    if (this.versionElegida()) this.aplicada.emit(this.versionElegida());
  }
}
