import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Project, ProjectMember } from '../../types/database.types';
import { useAuth } from '../auth/AuthContext';
import { X, Settings, Users, Trash2, AlertTriangle, UserMinus, Copy, Check } from 'lucide-react';
import { sanitizeTitle } from '../../lib/validators';

interface ProjectSettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: (updated: Partial<Project>) => void;
  onProjectDeleted: (projectId: string) => void;
  onOpenInviteMember: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  project,
  isOpen,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
  onOpenInviteMember,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = user?.id === project.owner_id;

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          user_id,
          role,
          joined_at,
          profiles (id, display_name)
        `)
        .eq('project_id', project.id);

      if (!error && data) {
        setMembers(data as any);
      } else {
        // Fallback: fetch separately
        const { data: simpleMem } = await supabase
          .from('project_members')
          .select('project_id, user_id, role, joined_at')
          .eq('project_id', project.id);

        if (simpleMem && simpleMem.length > 0) {
          const userIds = simpleMem.map((m: any) => m.user_id);
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds);

          const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          setMembers(
            simpleMem.map((m: any) => ({
              ...m,
              profiles: profMap.get(m.user_id) || { id: m.user_id, display_name: 'Usuario' },
            })) as any
          );
        }
      }
    } catch (err) {
      console.error('Error cargando integrantes:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Correos conocidos de los integrantes (T35).
  // profiles no guarda correos; se obtienen del correo de la sesión actual y de
  // los eventos 'member_joined' del historial, que registran el correo con el
  // que cada integrante aceptó su invitación.
  const fetchMemberEmails = async () => {
    const emails: Record<string, string> = {};
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('actor_id, details')
        .eq('project_id', project.id)
        .eq('action', 'member_joined');

      if (!error && data) {
        for (const log of data as any[]) {
          const email = log?.details?.email;
          if (log?.actor_id && typeof email === 'string' && email) {
            emails[log.actor_id] = email;
          }
        }
      }
    } catch (err) {
      console.error('Error cargando correos de integrantes:', err);
    }

    if (user?.id && user.email) {
      emails[user.id] = user.email;
    }
    setMemberEmails(emails);
  };

  const handleCopyEmail = async (targetUserId: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedUserId(targetUserId);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedUserId(null), 1500);
    } catch (err) {
      setErrorMsg('No se pudo copiar el correo al portapapeles.');
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description || '');
      setConfirmDelete(false);
      setErrorMsg(null);
      setCopiedUserId(null);
      fetchMembers();
      fetchMemberEmails();
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = sanitizeTitle(name);
    if (!sanitizedName) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: sanitizedName,
          description: description.trim() || null,
        })
        .eq('id', project.id);

      if (error) throw error;

      onProjectUpdated({ name: sanitizedName, description: description.trim() || null });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el proyecto.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!window.confirm(`¿Estás seguro de retirar a ${memberName} del proyecto?`)) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', targetUserId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo retirar al integrante.');
    }
  };

  const handleSoftDelete = async () => {
    setDeleting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.rpc('soft_delete_project', {
        p_project_id: project.id,
      });

      if (error) throw error;

      onProjectDeleted(project.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el proyecto.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Settings className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-semibold">Configuración del Proyecto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Información General */}
        <form onSubmit={handleSaveDetails} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              required
              disabled={!isOwner}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              disabled={!isOwner}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          {isOwner && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Actualizar Información'}
              </button>
            </div>
          )}
        </form>

        {/* Sección de Integrantes */}
        <div className="pt-4 border-t border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Integrantes del Equipo ({members.length})</span>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInviteMember();
                }}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                + Invitar Integrante
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {loadingMembers ? (
              <p className="text-xs text-slate-500 italic py-2">Cargando integrantes...</p>
            ) : (
              members.map((m) => {
                const displayName = (m.profiles as any)?.display_name || 'Usuario';
                const isMemberOwner = m.role === 'owner';
                const memberEmail = memberEmails[m.user_id];
                const isCopied = copiedUserId === m.user_id;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800">{displayName}</span>
                        {m.user_id === user?.id && (
                          <span className="ml-1 text-[11px] text-slate-400">(Tú)</span>
                        )}
                        {memberEmail && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 truncate max-w-[180px]">{memberEmail}</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(m.user_id, memberEmail)}
                                className="p-0.5 text-slate-400 hover:text-teal-600 rounded transition"
                                title="Copiar correo"
                                aria-label={`Copiar correo de ${displayName}`}
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {isCopied && (
                                <span
                                  role="status"
                                  aria-live="polite"
                                  className="absolute z-10 left-full ml-1 top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-semibold text-white bg-slate-800 rounded shadow"
                                >
                                  ¡Copiado!
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isMemberOwner
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isMemberOwner ? 'Propietario' : 'Integrante'}
                      </span>

                      {isOwner && !isMemberOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.user_id, displayName)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          title="Retirar del proyecto"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Zona de Peligro: Eliminación Lógica */}
        {isOwner && (
          <div className="pt-4 border-t border-red-200 bg-red-50/50 p-4 rounded-xl border">
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              Zona de Peligro: Eliminación de Proyecto
            </h4>
            <p className="text-xs text-red-600 mb-3">
              Esta acción retirará el proyecto de las listas activas e invalidará las invitaciones pendientes. Los datos históricos se conservan por motivos de integridad académica.
            </p>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Eliminar este proyecto
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSoftDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg transition disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Confirmar: Sí, eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg border border-slate-300"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
