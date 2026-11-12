import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../../shared/components/page-shell/page-shell.component';
import { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { DataTableColumn, DataTableRow } from '../../../../../shared/components/data-table/data-table.component';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { MessageBoxComponent } from '../../../../../shared/ui/message-box/message-box.component';
import { TableComponent } from '../../../../../shared/ui/table/table.component';
import { TabItem, TabsComponent } from '../../../../../shared/ui/tabs/tabs.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { PROCESO_NOMBRE, PROCESS_ID, PROCESS_ROUTE } from '../../config/generacion-reporte-apm.rutas';
import { ApmCargaMasivaSideNavComponent } from './carga-masiva-side-nav.component';

/** Estado de validación de un archivo cargado en una sección de la estructura. */
type EstadoArchivo = 'validando' | 'validado' | 'error';

interface ArchivoApm {
  id: string;
  nombre: string;
  estado: EstadoArchivo;
  /** Fecha/hora en que terminó la validación (solo si quedó «validado»). */
  validadoEn?: string;
}

/** Fila base de las cadenas de la APM (datos de ejemplo mientras no hay backend). */
interface CadenaApm {
  entidad: string;
  fuente: string;
  categoria: string;
  generica: string;
}

/**
 * Pantalla principal del proceso «Generación de reporte APM» (Catálogo de Versiones).
 *
 * Versión activa, pestañas del flujo (Importación · Pendientes · Procesados) y, dentro de Importación,
 * el navegador de secciones (Gastos, Anexos, Pie de página) con el panel de «Registro de estructura».
 *
 * Carga de archivos: al subir y aceptar un archivo la tarjeta entra «validando» (reloj); tras la
 * validación interna (simulada) queda «validado» (check) o con «error» (ícono rojo). Cuando la sección
 * tiene archivos con resultado, debajo aparecen las «Cadenas de la APM» (banner + tabla) y el «Detalle»
 * (registros erróneos / correctos / total y el estado Fallido o Procesado).
 *
 * La validación es simulada por nombre: un archivo cuyo nombre contenga «error» deja la sección Fallida.
 */
@Component({
  selector: 'siaf-generacion-reporte-apm',
  standalone: true,
  imports: [
    PageShellComponent,
    PageHeaderComponent,
    TabsComponent,
    ButtonComponent,
    IconComponent,
    MessageBoxComponent,
    AlertComponent,
    TableComponent,
    ApmCargaMasivaSideNavComponent,
  ],
  template: `
    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <div pageHeader>
        <siaf-page-header title="Generación de reportes de la APM" />
        <siaf-tabs
          class="block px-siaf-lg"
          ariaLabel="Etapas de la generación de reporte"
          [tabs]="tabsPrincipales"
          [activeId]="tabPrincipal()"
          [border]="false"
          (activeIdChange)="tabPrincipal.set($any($event))"
        />
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-y-auto">
        <!-- Tarjeta de la versión activa (en las tres pestañas) -->
        <section class="flex flex-col gap-siaf-sm">
          <h2 class="m-0 text-base font-bold text-[var(--sys-color-text-neutral-high)]">VERSIÓN</h2>
          <div
            class="relative flex items-center justify-between gap-siaf-md overflow-hidden rounded-siaf-md border border-[var(--sys-color-divider-default)] bg-surface px-siaf-lg py-siaf-md shadow-siaf-elevation-1"
          >
            <!-- Acento azul corto en el lateral izquierdo (no un borde completo). -->
            <span class="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sys-color-bg-brand-primary)]" aria-hidden="true"></span>
            <dl class="m-0 grid flex-1 grid-cols-2 gap-x-siaf-xl gap-y-siaf-sm sm:grid-cols-3">
              @for (campo of version; track campo.label) {
                <div class="flex flex-col gap-siaf-xxs">
                  <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">{{ campo.label }}</dt>
                  <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ campo.value }}</dd>
                </div>
              }
            </dl>
            <siaf-button variant="text" size="md" [iconOnly]="true" icon="more_vert" ariaLabel="Opciones de la versión" />
          </div>
        </section>

        @switch (tabPrincipal()) {
          @case ('importacion') {
          <!-- Navegador de secciones + panel de registro, dentro de una tarjeta blanca de alto completo -->
          <div class="flex min-h-0 flex-1 flex-col rounded-siaf-md bg-surface p-siaf-md shadow-siaf-elevation-1">
          <div class="grid min-h-0 flex-1 grid-cols-1 gap-siaf-md lg:grid-cols-[280px_minmax(0,1fr)]">
            <!-- Navegador de secciones (gap de 8px); la sección activa se expande y muestra sus archivos -->
            <nav class="flex flex-col gap-siaf-xs" aria-label="Secciones de la estructura">
              @for (s of secciones; track s.id) {
                <div
                  class="overflow-hidden rounded-siaf-sm border"
                  [class.border-[var(--sys-color-border-states-enabled)]]="seccion() !== s.id"
                  [class.border-[var(--sys-color-bg-brand-primary)]]="seccion() === s.id"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-siaf-sm px-siaf-md py-siaf-sm text-left text-sm transition"
                    [class.hover:bg-[var(--sys-color-bg-states-light-hover)]]="seccion() !== s.id"
                    [class.bg-[var(--sys-color-bg-states-light-selected)]]="seccion() === s.id"
                    (click)="seccion.set(s.id)"
                  >
                    <siaf-icon
                      name="arrow_right"
                      [size]="20"
                      class="shrink-0 transition-transform duration-150"
                      [class.rotate-90]="seccion() === s.id"
                      [class.text-[var(--sys-color-text-neutral-medium)]]="seccion() !== s.id"
                      [class.text-[var(--sys-color-text-brand-primary)]]="seccion() === s.id"
                    />
                    <span
                      class="flex-1"
                      [class.font-normal]="seccion() !== s.id"
                      [class.text-[var(--sys-color-text-neutral-medium)]]="seccion() !== s.id"
                      [class.font-bold]="seccion() === s.id"
                      [class.text-[var(--sys-color-text-brand-primary)]]="seccion() === s.id"
                    >{{ s.title }}</span>
                  </button>

                  @if (seccion() === s.id && archivosSeccion().length) {
                    <ul class="m-0 flex list-none flex-col p-0">
                      @for (a of archivosSeccion(); track a.id) {
                        <li class="flex items-center gap-siaf-sm py-siaf-xs pl-9 pr-siaf-md">
                          <span class="min-w-0 flex-1 truncate text-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.nombre }}</span>
                          @switch (a.estado) {
                            @case ('validando') {
                              <siaf-icon name="history" [size]="20" class="shrink-0 text-[var(--sys-color-text-neutral-medium)]" ariaLabel="Validando internamente la estructura" />
                            }
                            @case ('validado') {
                              <siaf-icon name="check_circle" [size]="20" class="shrink-0 text-[var(--sys-color-text-feedback-success)]" ariaLabel="Estructura válida" />
                            }
                            @case ('error') {
                              <siaf-icon name="error" [size]="20" class="shrink-0 text-[var(--sys-color-text-feedback-danger)]" ariaLabel="La estructura tiene errores" />
                            }
                          }
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </nav>

            <section class="flex flex-col gap-siaf-md lg:border-l lg:border-[var(--sys-color-divider-default)] lg:pl-siaf-lg">
              <header class="flex items-start justify-between gap-siaf-md">
                <h2 class="m-0 text-base font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
                  {{ tituloRegistro() }}
                </h2>
                <siaf-button
                  variant="accent"
                  size="md"
                  [iconOnly]="true"
                  icon="file_upload"
                  ariaLabel="Subir archivo"
                  (click)="cargaPanelAbierto.set(true)"
                />
              </header>

              @if (archivosSeccion().length === 0) {
                <message-box text="No se han adjuntado archivos. Por favor, haga clic en el botón para subir un archivo." />
              } @else {
                @if (!estadoProceso()) {
                  <message-box text="Validando la estructura de los archivos cargados…" />
                }

                <!-- Cadenas de la APM: aparece cuando la sección tiene archivos con resultado -->
                @if (estadoProceso(); as estado) {
                  <section class="flex flex-col gap-siaf-md">
                    <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
                      {{ tituloCadenas() }}
                    </h3>

                    @if (estado === 'fallido') {
                      <siaf-alert tone="error" title="Registros erróneos" [description]="descripcionBanner()" />
                    } @else {
                      <siaf-alert
                        tone="success"
                        title="Archivo procesado"
                        description="El archivo se procesó correctamente. No se encontraron inconsistencias."
                      />
                    }

                    <siaf-table [columns]="columnasCadenas" [rows]="cadenasRows()" idKey="linea" />

                    <!-- Detalle -->
                    <div class="flex flex-col gap-siaf-sm">
                      <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">Detalle</h3>
                      <dl class="m-0 grid grid-cols-2 gap-siaf-md sm:grid-cols-4">
                        <div class="flex flex-col gap-siaf-xxs">
                          <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">Registros erróneos</dt>
                          <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ detalle().erroneos }} Items</dd>
                        </div>
                        <div class="flex flex-col gap-siaf-xxs">
                          <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">Registros correctos</dt>
                          <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ detalle().correctos }} Items</dd>
                        </div>
                        <div class="flex flex-col gap-siaf-xxs">
                          <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">Total de registros</dt>
                          <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ detalle().total }} Items</dd>
                        </div>
                        <div class="flex flex-col gap-siaf-xxs">
                          <dt class="text-xs text-[var(--sys-color-text-neutral-medium)]">Estado</dt>
                          <dd class="m-0">
                            <span
                              class="inline-flex items-center rounded-siaf-sm px-siaf-sm py-siaf-xxs text-xs font-bold"
                              [class.bg-[var(--sys-color-bg-feedback-light-danger)]]="estado === 'fallido'"
                              [class.text-[var(--sys-color-text-feedback-danger)]]="estado === 'fallido'"
                              [class.bg-[var(--sys-color-bg-feedback-light-success)]]="estado === 'procesado'"
                              [class.text-[var(--sys-color-text-feedback-success)]]="estado === 'procesado'"
                            >{{ estado === 'fallido' ? 'Fallido' : 'Procesado' }}</span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </section>
                }
              }
            </section>
          </div>
          </div>
          }

          @case ('pendientes') {
            <section class="flex flex-col gap-siaf-md rounded-siaf-md bg-surface p-siaf-lg">
              <siaf-tabs
                ariaLabel="Secciones pendientes"
                [tabs]="subTabs"
                [activeId]="subTab()"
                [border]="false"
                (activeIdChange)="subTab.set($any($event))"
              />
              <siaf-table [columns]="columnasPendientes" [rows]="pendientesRows" idKey="codigo" />
            </section>
          }

          @case ('procesados') {
            <section class="flex flex-col gap-siaf-md rounded-siaf-md bg-surface p-siaf-lg">
              <div class="flex items-center justify-between gap-siaf-md">
                <siaf-tabs
                  class="min-w-0 flex-1"
                  ariaLabel="Secciones procesadas"
                  [tabs]="subTabs"
                  [activeId]="subTab()"
                  [border]="false"
                  (activeIdChange)="subTab.set($any($event))"
                />
                <siaf-button variant="accent" size="md" icon="picture_as_pdf" (click)="generarPdf()">Generar PDF</siaf-button>
              </div>
              <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
                Registro de estructura de {{ subTabLabel() }}
              </h3>
              <siaf-table [columns]="columnasProcesados" [rows]="procesadosRows" idKey="linea" />
            </section>
          }
        }
      </div>

      <!-- Panel «Carga masiva»: lo abre el botón de subir de la sección activa -->
      <siaf-apm-carga-masiva-side-nav
        [open]="cargaPanelAbierto()"
        (closed)="cargaPanelAbierto.set(false)"
        (confirmed)="onCargaConfirmada($event)"
      />
    </siaf-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneracionReporteApmComponent {
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, PROCESO_NOMBRE);

  // ── Versión activa (datos de ejemplo mientras no hay backend) ──
  readonly version: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Año', value: '2026' },
    { label: 'Código', value: '1' },
    { label: 'Nombre', value: 'Versión Nro 1' },
  ];

  // ── Pestañas del flujo ──
  readonly tabsPrincipales: TabItem[] = [
    { id: 'importacion', label: 'Importación' },
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'procesados', label: 'Procesados' },
  ];
  readonly tabPrincipal = signal('importacion');

  // ── Navegador de secciones (izquierda) ──
  readonly secciones: ReadonlyArray<{ id: string; title: string }> = [
    { id: 'gastos', title: 'Gastos' },
    { id: 'anexo-1', title: 'Anexo 1' },
    { id: 'anexo-2', title: 'Anexo 2' },
    { id: 'pie', title: 'Pié de página' },
  ];
  readonly seccion = signal('gastos');

  /** Panel «Carga masiva» abierto. */
  readonly cargaPanelAbierto = signal(false);

  /** Archivos cargados por sección. */
  private readonly archivos = signal<Record<string, ArchivoApm[]>>({});

  /** Archivos de la sección elegida. */
  readonly archivosSeccion = computed<ArchivoApm[]>(() => this.archivos()[this.seccion()] ?? []);

  /** Nombre de la sección elegida (p. ej. «Gastos»). */
  private readonly nombreSeccion = computed(() => this.secciones.find((s) => s.id === this.seccion())?.title ?? '');

  /** Título del panel de registro según la sección elegida. */
  readonly tituloRegistro = computed(() => `Registro de estructura de ${this.nombreSeccion()}`);
  readonly tituloCadenas = computed(() => `Cadenas de la APM de ${this.nombreSeccion()}`);

  // ── Cadenas de la APM (datos de ejemplo) ──
  readonly columnasCadenas: DataTableColumn[] = [
    { key: 'linea', label: 'Línea' },
    { key: 'entidad', label: 'Entidad / Pliego' },
    { key: 'fuente', label: 'Fuente de financiamiento' },
    { key: 'categoria', label: 'Categoría de gasto' },
    { key: 'generica', label: 'Genérica' },
  ];

  private readonly CADENAS_BASE: CadenaApm[] = [
    { entidad: '037. Ministerio de vivienda, construcción y saneamiento', fuente: '1. Recursos ordinarios', categoria: '5. Gastos corrientes', generica: '2.1 Personal y obligaciones sociales' },
    { entidad: '037. Ministerio de vivienda, construcción y saneamiento', fuente: '1. Recursos ordinarios', categoria: '5. Gastos corrientes', generica: '2.3 Bienes y servicios' },
    { entidad: '037. Ministerio de vivienda, construcción y saneamiento', fuente: '1. Recursos ordinarios', categoria: '6. Gastos de capital', generica: '2.6 Adquisición de activos no financieros' },
    { entidad: '037. Ministerio de vivienda, construcción y saneamiento', fuente: '1. Recursos ordinarios', categoria: '6. Gastos de capital', generica: '2.4 Donaciones y transferencias' },
    { entidad: '037. Ministerio de vivienda, construcción y saneamiento', fuente: '1. Recursos ordinarios', categoria: '5. Gastos corrientes', generica: '2.5 Otros gastos' },
  ];

  /** Índices (base 0) de las filas con error cuando la sección queda Fallida (coincide con el Figma: filas 3 y 4). */
  private readonly FILAS_ERRONEAS = [2, 3];

  /** Estado agregado de la sección: null (sin resultados), «fallido» o «procesado». */
  readonly estadoProceso = computed<'fallido' | 'procesado' | null>(() => {
    const conResultado = this.archivosSeccion().filter((a) => a.estado !== 'validando');
    if (conResultado.length === 0) return null;
    return conResultado.some((a) => a.estado === 'error') ? 'fallido' : 'procesado';
  });

  readonly cadenasRows = computed<DataTableRow[]>(() => {
    const fallido = this.estadoProceso() === 'fallido';
    return this.CADENAS_BASE.map((c, i) => {
      const errada = fallido && this.FILAS_ERRONEAS.includes(i);
      return { linea: errada ? `${i + 1} ⚠` : `${i + 1}`, entidad: c.entidad, fuente: c.fuente, categoria: c.categoria, generica: c.generica };
    });
  });

  readonly detalle = computed(() => {
    const total = this.CADENAS_BASE.length;
    const erroneos = this.estadoProceso() === 'fallido' ? this.FILAS_ERRONEAS.length : 0;
    return { total, erroneos, correctos: total - erroneos };
  });

  readonly descripcionBanner = computed(
    () =>
      `El archivo no puede procesarse porque presenta ${this.detalle().erroneos} registros erróneos. ` +
      'Corrige la data y vuelve a cargarla; para continuar, todas las inconsistencias deben estar resueltas.',
  );

  // ── Pestañas Pendientes / Procesados ──
  readonly subTabs: TabItem[] = [
    { id: 'gastos', label: 'Gastos' },
    { id: 'anexos', label: 'Anexos' },
    { id: 'pie', label: 'Pie de página' },
  ];
  readonly subTab = signal('gastos');
  readonly subTabLabel = computed(() => this.subTabs.find((t) => t.id === this.subTab())?.label ?? '');

  /** Pendientes: cadenas aún sin procesar (datos de ejemplo). */
  readonly columnasPendientes: DataTableColumn[] = [
    { key: 'codigo', label: 'Código clasificador' },
    { key: 'subgrupo', label: 'Subgrupo' },
    { key: 'entidad', label: 'Entidad / Pliego' },
  ];
  readonly pendientesRows: DataTableRow[] = [
    { codigo: '1.1.1.1.0011.011', subgrupo: 'Gobierno Nacional', entidad: 'MINISTERIO DE SALUD' },
    { codigo: '1.1.1.1.0011.012', subgrupo: 'Gobierno Nacional', entidad: 'MINISTERIO DE VIVIENDA, CONSTRUCCIÓN Y SANEAMIENTO' },
  ];

  /** Procesados: estructura consolidada lista para el reporte (datos de ejemplo). */
  readonly columnasProcesados: DataTableColumn[] = [
    { key: 'linea', label: 'Línea' },
    { key: 'entidad', label: 'Entidad / Pliego' },
    { key: 'fuente', label: 'Fuente de financiamiento' },
    { key: 'subfuente', label: 'Subfuente de financiamiento' },
  ];
  readonly procesadosRows: DataTableRow[] = this.CADENAS_BASE.map((c, i) => ({
    linea: `${i + 1}`,
    entidad: c.entidad,
    fuente: c.fuente,
    subfuente: '19. Recursos por operaciones oficiales de crédito',
  }));

  /** Pendiente: generar el PDF del reporte procesado. */
  generarPdf(): void {
    // Placeholder hasta conectar la generación real del PDF.
  }

  subtitulo(archivo: ArchivoApm): string {
    switch (archivo.estado) {
      case 'validando':
        return 'Validando estructura…';
      case 'error':
        return 'Se encontraron errores en la estructura.';
      default:
        return `Validado el ${archivo.validadoEn}`;
    }
  }

  /**
   * Confirmación del panel «Carga masiva»: coloca los archivos en la sección activa en estado
   * «validando» (ícono de reloj) y lanza la validación interna simulada de cada uno.
   */
  onCargaConfirmada(archivos: File[]): void {
    const seccionId = this.seccion();
    for (const archivo of archivos) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.agregar(seccionId, { id, nombre: archivo.name, estado: 'validando' });
      this.validarEstructura(seccionId, id, archivo.name);
    }
    this.cargaPanelAbierto.set(false);
  }

  quitarArchivo(id: string): void {
    const seccionId = this.seccion();
    this.archivos.update((mapa) => ({
      ...mapa,
      [seccionId]: (mapa[seccionId] ?? []).filter((a) => a.id !== id),
    }));
  }

  private agregar(seccionId: string, archivo: ArchivoApm): void {
    this.archivos.update((mapa) => ({ ...mapa, [seccionId]: [...(mapa[seccionId] ?? []), archivo] }));
  }

  /** Validación interna simulada: un nombre con «error» falla; el resto se valida. */
  private validarEstructura(seccionId: string, id: string, nombre: string): void {
    const falla = /error|invalid|fallo/i.test(nombre);
    setTimeout(() => {
      this.archivos.update((mapa) => ({
        ...mapa,
        [seccionId]: (mapa[seccionId] ?? []).map((a) =>
          a.id === id
            ? { ...a, estado: falla ? 'error' : 'validado', validadoEn: falla ? undefined : this.ahora() }
            : a,
        ),
      }));
    }, 2200);
  }

  private ahora(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
}
