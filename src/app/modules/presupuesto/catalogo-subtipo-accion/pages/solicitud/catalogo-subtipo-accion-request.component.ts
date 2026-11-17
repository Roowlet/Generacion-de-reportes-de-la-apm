import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { DateTimePickerComponent } from '../../../../../shared/ui/date-time-picker/date-time-picker.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { RadioComponent, RadioOption } from '../../../../../shared/ui/radio/radio.component';
import { SnackbarComponent } from '../../../../../shared/ui/snackbar/snackbar.component';
import { TextFieldComponent } from '../../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { PROCESO_NOMBRE, PROCESS_ID, PROCESS_ROUTE } from '../../config/catalogo-subtipo-accion.rutas';
import { RegistroSubtipoAccion, SELECCION_INICIAL, SeleccionCatalogo, etiquetaSeleccion } from '../../models/catalogo-subtipo-accion.model';

/** Claves de los campos de selección del formulario. */
type ClaveSeleccion = 'proceso' | 'rol' | 'perfil' | 'tipoAccion';

/**
 * Solicitud de subtipo de acción (CREACIÓN): pantalla única del proceso «Catálogo de subtipo de acción».
 *
 * La tarjeta «Registro del catálogo» alterna entre:
 * - **Formulario**: capta un subtipo (Código autoasignado, Proceso, Rol, Perfil, Tipo de acción, Subtipo y Vigencia).
 *   «Aceptar» se habilita al completar los campos obligatorios; al pulsarlo agrega la fila y muestra el aviso de éxito.
 * - **Tabla**: lista los subtipos ya aceptados; el botón «+» de la cabecera vuelve a abrir el formulario.
 *
 * Es una maqueta: sin backend, los datos viven en memoria y «Grabar»/«Verificar» son solo visuales.
 */
@Component({
  selector: 'siaf-catalogo-subtipo-accion-request',
  standalone: true,
  imports: [
    ButtonComponent,
    CheckboxComponent,
    DateTimePickerComponent,
    IconComponent,
    RadioComponent,
    SnackbarComponent,
    SolicitudeFormCardComponent,
    SolicitudeInfoCardComponent,
    SolicitudePageLayoutComponent,
    TextFieldComponent,
  ],
  template: `
    <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)] text-text">
      <siaf-solicitude-page-layout
        [breadcrumbs]="breadcrumbs"
        role="creator"
        state="new"
        [heading]="heading"
        secondaryText="Creación"
        [showReturn]="true"
        [saveDisabled]="!hayRegistros()"
        [verifyDisabled]="!hayRegistros()"
        (returned)="regresar()"
        (canceled)="regresar()"
        (saved)="onGrabar()"
        (verified)="onVerificar()"
      >
        <siaf-solicitude-info-card [fields]="camposEntidad" [captureOpenDate]="true" />

        <siaf-solicitude-form-card title="Registro del catálogo">
          <div card-actions class="flex items-center gap-siaf-sm">
            @if (modo() === 'formulario') {
              <siaf-button variant="outline" size="md" (click)="cancelarFormulario()">Cancelar</siaf-button>
              <siaf-button variant="filled" size="md" [disabled]="!formValido()" (click)="aceptar()">Aceptar</siaf-button>
            } @else {
              <siaf-button variant="accent" size="md" [iconOnly]="true" icon="add" ariaLabel="Agregar subtipo de acción" (click)="nuevoRegistro()" />
            }
          </div>

          @if (modo() === 'formulario') {
            <!-- ── Formulario ── -->
            <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">Detalles del catálogo</h3>

            <siaf-input class="block w-full" label="Código" [required]="true" [disabled]="true" hint="Se asignará cuando se grabe la solicitud." [value]="''" />

            <div class="grid gap-siaf-lg md:grid-cols-2">
              @for (campo of camposSeleccion; track campo.clave) {
                <div class="flex flex-col gap-siaf-xs">
                  <div class="flex min-h-10 items-center justify-between gap-siaf-md">
                    <h4 class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">
                      {{ campo.label }} <span class="text-[var(--sys-color-text-brand-accent)]">*</span>
                    </h4>
                    <button
                      type="button"
                      class="inline-flex size-10 shrink-0 items-center justify-center rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] text-[var(--sys-color-text-neutral-low)] disabled:opacity-50"
                      [attr.aria-label]="'Buscar ' + campo.label"
                      disabled
                    >
                      <siaf-icon name="search" [size]="20" />
                    </button>
                  </div>

                  @if (seleccion()[campo.clave]; as valor) {
                    <div class="flex items-center gap-siaf-md rounded-siaf-md border-l-4 border-[var(--sys-color-bg-brand-primary)] bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm">
                      <div class="min-w-[90px]">
                        <p class="m-0 text-[11px] uppercase tracking-[0.5px] text-[var(--sys-color-text-neutral-low)]">Código {{ campo.sufijo }}</p>
                        <p class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ valor.codigo }}</p>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="m-0 text-[11px] uppercase tracking-[0.5px] text-[var(--sys-color-text-neutral-low)]">Nombre {{ campo.sufijo }}</p>
                        <p class="m-0 truncate text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ valor.nombre }}</p>
                      </div>
                      <button type="button" class="shrink-0 text-[var(--sys-color-text-neutral-low)]" [attr.aria-label]="'Quitar ' + campo.label" (click)="quitarSeleccion(campo.clave)">
                        <siaf-icon name="close" [size]="20" />
                      </button>
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="flex min-h-[57px] items-center rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-left text-sm text-[var(--sys-color-text-neutral-medium)]"
                      (click)="restaurarSeleccion(campo.clave)"
                    >
                      Sin selección. Use el buscador.
                    </button>
                  }
                </div>
              }
            </div>

            <siaf-input
              class="block w-full md:max-w-[50%]"
              label="Subtipo de acción"
              placeholder="Nombre"
              [required]="true"
              [value]="subtipo()"
              (valueChange)="subtipo.set($any($event))"
            />

            <!-- ── Vigencia ── -->
            <div class="flex flex-col gap-siaf-md pt-siaf-sm">
              <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">Vigencia</h3>
              <div class="grid items-start gap-siaf-lg md:grid-cols-[auto_1fr_1fr]">
                <siaf-radio-group
                  label="Estado"
                  name="vigencia-estado"
                  [inline]="true"
                  [options]="opcionesEstado"
                  [value]="estado()"
                  (valueChange)="estado.set($any($event))"
                />
                <siaf-date-time-picker label="Fecha desde" [defaultToToday]="false" [value]="fechaDesde()" (valueChange)="fechaDesde.set($event)" />
                <siaf-date-time-picker label="Fecha hasta" [defaultToToday]="false" [minDate]="fechaDesde()" [value]="fechaHasta()" (valueChange)="fechaHasta.set($event)" />
              </div>
              <p class="m-0 text-xs text-[var(--sys-color-text-neutral-medium)]">Será asignada cuando se acepte el requerimiento de solicitud.</p>
            </div>
          } @else {
            <!-- ── Tabla de subtipos aceptados ── -->
            <div class="flex items-center justify-between gap-siaf-md">
              <siaf-checkbox [checked]="false" [disabled]="true" />
              <div class="flex items-center gap-siaf-sm text-sm text-[var(--sys-color-text-neutral-medium)]">
                <span>1-{{ registros().length }} de {{ registros().length }}</span>
                <button type="button" class="inline-flex size-8 items-center justify-center rounded-siaf-md text-[var(--sys-color-text-neutral-low)] disabled:opacity-40" aria-label="Anterior" disabled>
                  <siaf-icon name="chevron_left" [size]="20" />
                </button>
                <button type="button" class="inline-flex size-8 items-center justify-center rounded-siaf-md text-[var(--sys-color-text-neutral-low)] disabled:opacity-40" aria-label="Siguiente" disabled>
                  <siaf-icon name="chevron_right" [size]="20" />
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-10 border-b border-[var(--sys-color-divider-default)] px-siaf-sm py-siaf-sm"></th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Código</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Proceso</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Rol</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Perfil</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Tipo de acción</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Subtipo de acción</th>
                    <th class="border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-xs font-bold uppercase tracking-[0.02px]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of registros(); track $index) {
                    <tr class="border-b border-[var(--sys-color-divider-default)]">
                      <td class="px-siaf-sm py-siaf-sm align-middle"><siaf-checkbox [checked]="false" /></td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ r.codigo }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ etiqueta(r.proceso) }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ etiqueta(r.rol) }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ etiqueta(r.perfil) }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ etiqueta(r.tipoAccion) }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ r.subtipo }}</td>
                      <td class="px-siaf-md py-siaf-sm align-middle text-[var(--sys-color-text-neutral-high)]">{{ r.estado }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between gap-siaf-md pt-siaf-xs text-sm text-[var(--sys-color-text-neutral-medium)]">
              <div class="flex items-center gap-siaf-sm">
                <span>Filas por página:</span>
                <span class="inline-flex items-center gap-siaf-xs rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] px-siaf-sm py-siaf-xxs text-[var(--sys-color-text-neutral-high)]">25 <siaf-icon name="expand_more" [size]="18" /></span>
              </div>
              <span>1-{{ registros().length }} de {{ registros().length }}</span>
            </div>
          }
        </siaf-solicitude-form-card>
      </siaf-solicitude-page-layout>

      <!-- Aviso de éxito (toast flotante) -->
      <div class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-siaf-md">
        <div class="pointer-events-auto">
          <siaf-snackbar [open]="avisoAbierto()" tone="success" message="El registro se ha realizado con éxito" (closed)="avisoAbierto.set(false)" />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoSubtipoAccionRequestComponent {
  private readonly router = inject(Router);

  readonly heading = 'Solicitud de subtipo de acción';
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, PROCESO_NOMBRE);

  readonly camposEntidad: SolicitudeInfoField[] = [
    { label: 'Fecha', value: '' },
    { label: 'Órgano rector', value: 'DIRECCIÓN GENERAL DE PRESUPUESTO PÚBLICO' },
  ];

  /** Campos de selección del formulario (buscador + chip con código y nombre). */
  readonly camposSeleccion: ReadonlyArray<{ clave: ClaveSeleccion; label: string; sufijo: string }> = [
    { clave: 'proceso', label: 'Proceso', sufijo: 'proceso' },
    { clave: 'rol', label: 'Rol', sufijo: 'rol' },
    { clave: 'perfil', label: 'Perfil', sufijo: 'perfil' },
    { clave: 'tipoAccion', label: 'Tipo de acción', sufijo: 'tipo de acción' },
  ];

  readonly opcionesEstado: RadioOption[] = [
    { label: 'Si', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

  // ── Estado de la pantalla ──
  readonly modo = signal<'formulario' | 'tabla'>('formulario');
  readonly registros = signal<RegistroSubtipoAccion[]>([]);
  readonly hayRegistros = computed(() => this.registros().length > 0);
  readonly avisoAbierto = signal(false);
  private avisoTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Formulario ──
  readonly seleccion = signal<Record<ClaveSeleccion, SeleccionCatalogo | null>>({ ...SELECCION_INICIAL });
  readonly subtipo = signal('');
  readonly estado = signal<'Si' | 'No'>('Si');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  readonly formValido = computed(() => {
    const s = this.seleccion();
    return !!s.proceso && !!s.rol && !!s.perfil && !!s.tipoAccion && !!this.subtipo().trim();
  });

  etiqueta(seleccion: SeleccionCatalogo): string {
    return etiquetaSeleccion(seleccion);
  }

  quitarSeleccion(clave: ClaveSeleccion): void {
    this.seleccion.update((m) => ({ ...m, [clave]: null }));
  }

  /** En el taller no hay buscador: restaura el valor de ejemplo del catálogo. */
  restaurarSeleccion(clave: ClaveSeleccion): void {
    this.seleccion.update((m) => ({ ...m, [clave]: { ...SELECCION_INICIAL[clave] } }));
  }

  /** «Aceptar»: agrega la fila al registro, muestra el aviso y pasa a la vista de tabla. */
  aceptar(): void {
    const s = this.seleccion();
    if (!this.formValido() || !s.proceso || !s.rol || !s.perfil || !s.tipoAccion) return;

    this.registros.update((lista) => [
      ...lista,
      {
        codigo: '-',
        proceso: s.proceso!,
        rol: s.rol!,
        perfil: s.perfil!,
        tipoAccion: s.tipoAccion!,
        subtipo: this.subtipo().trim(),
        estado: this.estado(),
        fechaDesde: this.fechaDesde(),
        fechaHasta: this.fechaHasta(),
      },
    ]);

    this.modo.set('tabla');
    this.mostrarAviso();
  }

  cancelarFormulario(): void {
    if (this.hayRegistros()) {
      this.resetFormulario();
      this.modo.set('tabla');
      return;
    }
    this.regresar();
  }

  /** «+» de la tabla: abre un formulario nuevo con los valores de catálogo por defecto. */
  nuevoRegistro(): void {
    this.resetFormulario();
    this.modo.set('formulario');
  }

  private resetFormulario(): void {
    this.seleccion.set({ ...SELECCION_INICIAL });
    this.subtipo.set('');
    this.estado.set('Si');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
  }

  private mostrarAviso(): void {
    this.avisoAbierto.set(true);
    if (this.avisoTimeout) clearTimeout(this.avisoTimeout);
    this.avisoTimeout = setTimeout(() => this.avisoAbierto.set(false), 4000);
  }

  onGrabar(): void {
    // Maqueta: sin backend. El flujo real grabaría los subtipos registrados.
  }

  onVerificar(): void {
    // Maqueta: sin backend.
  }

  regresar(): void {
    void this.router.navigate(['/panel']);
  }
}
