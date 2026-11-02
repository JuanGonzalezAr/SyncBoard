import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildCSVFileName,
  buildTasksCSV,
  escapeCSVField,
  exportTasksToCSV,
} from '../lib/csvExport';
import { ProjectMember, Task } from '../types/database.types';

const members: ProjectMember[] = [
  {
    project_id: 'proj-1',
    user_id: 'user-1',
    role: 'owner',
    joined_at: '2026-10-01T00:00:00Z',
    profiles: { id: 'user-1', display_name: 'Ana Pérez', created_at: '2026-10-01T00:00:00Z' },
  },
];

const baseTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Diseñar tablero',
  description: 'Primera versión',
  status: 'in_progress',
  priority: 'high',
  assignee_id: 'user-1',
  created_by: 'user-1',
  due_date: '2026-11-15',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

describe('Exportación de tareas a CSV - Issue #39', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera la cabecera y las columnas en español separadas por CRLF', () => {
    const csv = buildTasksCSV([baseTask], members);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Título,Descripción,Estado,Prioridad,Responsable,Fecha límite');
    expect(lines[1]).toBe('Diseñar tablero,Primera versión,En progreso,Alta,Ana Pérez,2026-11-15');
    expect(lines).toHaveLength(2);
  });

  it('usa "Sin asignar" y campos vacíos cuando faltan responsable, descripción o fecha', () => {
    const task: Task = {
      ...baseTask,
      status: 'pending',
      priority: 'low',
      assignee_id: null,
      description: null,
      due_date: null,
    };
    const lines = buildTasksCSV([task], members).split('\r\n');
    expect(lines[1]).toBe('Diseñar tablero,,Pendiente,Baja,Sin asignar,');
  });

  it('escapa comillas dobles, comas y saltos de línea según RFC 4180', () => {
    expect(escapeCSVField('simple')).toBe('simple');
    expect(escapeCSVField('a, b')).toBe('"a, b"');
    expect(escapeCSVField('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(escapeCSVField('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(escapeCSVField(null)).toBe('');

    const task: Task = {
      ...baseTask,
      title: 'Revisar "API", parte 2',
      description: 'Notas:\nok',
      status: 'completed',
      priority: 'medium',
    };
    const csv = buildTasksCSV([task], members);
    expect(csv).toContain('"Revisar ""API"", parte 2","Notas:\nok",Completada,Media,');
  });

  it('construye el nombre de archivo syncboard-<proyecto>.csv', () => {
    expect(buildCSVFileName('Proyecto Distribuidos')).toBe('syncboard-proyecto-distribuidos.csv');
    expect(buildCSVFileName('  Diseño & Pruebas! ')).toBe('syncboard-diseno-pruebas.csv');
    expect(buildCSVFileName('***')).toBe('syncboard-proyecto.csv');
  });

  it('crea un Blob CSV y dispara la descarga automática', async () => {
    let capturedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    let downloadName = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

    exportTasksToCSV([baseTask], members, 'Mi Proyecto');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe('syncboard-mi-proyecto.csv');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    expect(capturedBlob).not.toBeNull();
    const blob = capturedBlob as unknown as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });
    expect(text).toContain('Título,Descripción,Estado,Prioridad,Responsable,Fecha límite');
  });
});
