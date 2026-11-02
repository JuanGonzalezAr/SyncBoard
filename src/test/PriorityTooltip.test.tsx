import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from '../features/tasks/TaskCard';
import { getPriorityDescription } from '../lib/formatters';
import { Task, TaskPriority } from '../types/database.types';

const buildTask = (priority: TaskPriority): Task => ({
  id: `task-${priority}`,
  project_id: 'proj-1',
  title: `Tarea ${priority}`,
  description: null,
  status: 'pending',
  priority,
  assignee_id: null,
  created_by: 'user-1',
  due_date: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
});

const cases: Array<{ priority: TaskPriority; label: string; description: string }> = [
  { priority: 'high', label: 'Alta', description: 'Atención inmediata requerida' },
  { priority: 'medium', label: 'Media', description: 'Progreso regular del sprint' },
  { priority: 'low', label: 'Baja', description: 'Tarea complementaria o de baja urgencia' },
];

describe('Tooltip explicativo en badges de prioridad - Issue #47', () => {
  it.each(cases)('getPriorityDescription devuelve la guía para prioridad $priority', ({ priority, description }) => {
    expect(getPriorityDescription(priority)).toBe(description);
  });

  it.each(cases)(
    'el badge "$label" muestra el tooltip nativo y una descripción accesible',
    ({ priority, label, description }) => {
      render(
        <TaskCard
          task={buildTask(priority)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      const badge = screen.getByText(label);

      // Tooltip nativo (atributo title)
      expect(badge).toHaveAttribute('title', description);

      // Descripción extendida legible por lectores de pantalla (aria-describedby)
      expect(badge).toHaveAccessibleDescription(`Prioridad ${label}: ${description}`);
    }
  );
});
