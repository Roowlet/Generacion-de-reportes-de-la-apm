/**
 * Proceso «Catálogo de subtipo de acción».
 *
 * Pantalla de solicitud (CREACIÓN) donde el creador registra subtipos de acción. La tarjeta «Registro del catálogo»
 * alterna entre un formulario (para capturar un subtipo) y la tabla con los subtipos ya aceptados; cada «Aceptar»
 * agrega una fila y muestra el aviso de éxito. Datos simulados: no hay backend.
 */

/** Nombre del proceso (hoja del árbol y migas de pan). */
export const PROCESO_NOMBRE = 'Catálogo de subtipo de acción';

/** Valor seleccionado desde un catálogo: su código y su nombre. */
export interface SeleccionCatalogo {
  codigo: string;
  nombre: string;
}

/** Una fila del «Registro del catálogo» (un subtipo de acción aceptado). */
export interface RegistroSubtipoAccion {
  /** Código del registro; se asigna al grabar la solicitud (en el taller se muestra «-»). */
  codigo: string;
  proceso: SeleccionCatalogo;
  rol: SeleccionCatalogo;
  perfil: SeleccionCatalogo;
  tipoAccion: SeleccionCatalogo;
  /** Nombre del subtipo de acción. */
  subtipo: string;
  /** Estado de vigencia: vigente («Si») o no. */
  estado: 'Si' | 'No';
  fechaDesde: string;
  fechaHasta: string;
}

/**
 * Selecciones iniciales del formulario (datos simulados que, con un backend real, vendrían de los catálogos de
 * proceso, rol, perfil y tipo de acción). Coinciden con la maqueta de Figma.
 */
export const SELECCION_INICIAL = {
  proceso: { codigo: '12', nombre: 'Clasificador Institucional' },
  rol: { codigo: '1', nombre: 'Creador' },
  perfil: { codigo: '1', nombre: 'Entidad' },
  tipoAccion: { codigo: '2', nombre: 'Modificación' },
} as const satisfies Record<string, SeleccionCatalogo>;

/** Muestra una selección como «código nombre» (p. ej. «12 Clasificador Institucional»). */
export function etiquetaSeleccion(seleccion: SeleccionCatalogo): string {
  return `${seleccion.codigo} ${seleccion.nombre}`;
}
