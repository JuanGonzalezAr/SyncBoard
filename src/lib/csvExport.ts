import { ProjectMember, Task } from '../types/database.types';
import { formatPriority, formatStatus } from './formatters';

export const CSV_HEADERS = [
  'Título',
  'Descripción',
  'Estado',
  'Prioridad',
  'Responsable',
  'Fecha límite',
] as const;

/**
 * Escapa un campo según RFC 4180: si contiene comas, comillas dobles o saltos
 * de línea se encierra entre comillas y las comillas internas se duplican.
 */
export const escapeCSVField = (value: string | null | undefined): string => {
  const text = value ?? '';
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

/** Convierte el nombre del proyecto en un nombre de archivo seguro. */
export const buildCSVFileName = (projectName: string): string => {
  const slug = projectName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `syncboard-${slug || 'proyecto'}.csv`;
};

/** Genera el contenido CSV (sin BOM) con una fila por tarea, separado por CRLF. */
export const buildTasksCSV = (tasks: Task[], members: ProjectMember[]): string => {
  const memberNames = new Map(
    members.map((m) => [m.user_id, m.profiles?.display_name || 'Usuario'])
  );

  const rows = tasks.map((task) => [
    task.title,
    task.description ?? '',
    formatStatus(task.status),
    formatPriority(task.priority),
    task.assignee_id ? memberNames.get(task.assignee_id) ?? 'Usuario' : 'Sin asignar',
    task.due_date ?? '',
  ]);

  return [CSV_HEADERS as readonly string[], ...rows]
    .map((row) => row.map(escapeCSVField).join(','))
    .join('\r\n');
};

/**
 * Genera el CSV de tareas del proyecto y dispara su descarga en el navegador
 * como `syncboard-<proyecto>.csv`.
 */
export const exportTasksToCSV = (
  tasks: Task[],
  members: ProjectMember[],
  projectName: string
): void => {
  // BOM UTF-8 para que Excel muestre correctamente tildes y eñes.
  const csv = '﻿' + buildTasksCSV(tasks, members);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = buildCSVFileName(projectName);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
