import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectSettingsModal } from '../features/projects/ProjectSettingsModal';
import { Project } from '../types/database.types';

const membersData = [
  {
    project_id: 'proj-1',
    user_id: 'user-1',
    role: 'owner',
    joined_at: '2026-10-01T00:00:00Z',
    profiles: { id: 'user-1', display_name: 'Ana Owner' },
  },
  {
    project_id: 'proj-1',
    user_id: 'user-2',
    role: 'member',
    joined_at: '2026-10-02T00:00:00Z',
    profiles: { id: 'user-2', display_name: 'Beto Miembro' },
  },
];

const activityData = [
  { actor_id: 'user-2', details: { email: 'beto@syncboard.edu' } },
];

// Supabase mock: project_members -> select().eq(); activity_log -> select().eq().eq()
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'activity_log') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: activityData, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: membersData, error: null }),
        }),
      };
    },
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'ana@syncboard.edu' },
    profile: null,
    session: null,
    loading: false,
  }),
}));

const project: Project = {
  id: 'proj-1',
  name: 'Proyecto Demo',
  description: null,
  owner_id: 'user-1',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  deleted_at: null,
};

const renderModal = () =>
  render(
    <ProjectSettingsModal
      project={project}
      isOpen
      onClose={vi.fn()}
      onProjectUpdated={vi.fn()}
      onProjectDeleted={vi.fn()}
      onOpenInviteMember={vi.fn()}
    />
  );

describe('Copiar correo de integrantes en ProjectSettingsModal - Issue #35', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el correo conocido de cada integrante con un botón accesible', async () => {
    renderModal();

    expect(await screen.findByText('beto@syncboard.edu')).toBeInTheDocument();
    expect(screen.getByText('ana@syncboard.edu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar correo de Ana Owner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar correo de Beto Miembro' })).toBeInTheDocument();
  });

  it('copia el correo con navigator.clipboard.writeText y muestra "¡Copiado!" durante 1.5 s', async () => {
    renderModal();
    const copyButton = await screen.findByRole('button', { name: 'Copiar correo de Beto Miembro' });

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith('beto@syncboard.edu');
    expect(screen.getByRole('status')).toHaveTextContent('¡Copiado!');

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(screen.getByText('¡Copiado!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument();
  });

  it('muestra un error si el portapapeles no está disponible', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    renderModal();
    const copyButton = await screen.findByRole('button', { name: 'Copiar correo de Ana Owner' });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('No se pudo copiar el correo al portapapeles.')).toBeInTheDocument();
    });
    expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument();
  });
});
