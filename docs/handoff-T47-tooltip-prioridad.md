# Plantilla de Handoff — SyncBoard

## 1. Identificador y Objetivo de la Tarea
- **ID de Tarea**: T47 (Issue #47)
- **Título**: Tooltip explicativo en los badges de prioridad con guía de uso
- **Responsable/Agente**: Juan Sebastian Gonzalez Arcila (con asistencia de Claude)
- **Fecha**: 2026-11-02

---

## 2. Contexto Relevante
- `src/features/tasks/TaskCard.tsx` muestra un badge de color con la prioridad (Alta, Media, Baja), pero no explicaba qué nivel de atención implica cada una.

---

## 3. Estado Real del Repositorio al Comenzar
- **Rama base**: `main`
- **Último commit verificado**: `3e9a935`
- **Archivos sin confirmar preexistentes**: ninguno.

---

## 4. Trabajo Realizado
- Nueva función `getPriorityDescription(priority)` en `src/lib/formatters.ts` con la guía de cada nivel:
  - Alta: *Atención inmediata requerida*.
  - Media: *Progreso regular del sprint*.
  - Baja: *Tarea complementaria o de baja urgencia*.
- El badge de prioridad en `TaskCard` muestra la guía como tooltip nativo (atributo `title`) y cursor de ayuda.
- Para lectores de pantalla, el badge se enlaza con `aria-describedby` a un texto oculto visualmente (`sr-only`): *"Prioridad Alta: Atención inmediata requerida"*. El id se genera con `useId` para que sea único por tarjeta.

---

## 5. Archivos Creados / Modificados
- `src/lib/formatters.ts`: función `getPriorityDescription`.
- `src/features/tasks/TaskCard.tsx`: `title`, `aria-describedby` y descripción `sr-only` en el badge.
- `src/test/PriorityTooltip.test.tsx`: 6 pruebas (formateador y badge por cada prioridad).
- `docs/backlog.md`: T47 en revisión.
- `docs/handoff-T47-tooltip-prioridad.md`: este documento.

---

## 6. Decisiones Técnicas Tomadas
- Se usó el atributo `title` nativo (permitido por el criterio 2) para no añadir dependencias ni un componente de tooltip nuevo.
- El `title` por sí solo no es fiable en lectores de pantalla ni en dispositivos táctiles, por eso se añadió `aria-describedby` con texto `sr-only` (criterio 3).
- La guía vive en `formatters.ts` junto a `formatPriority` y `getPriorityBadgeClass`, siguiendo la convención existente.

---

## 7. Comandos y Verificaciones Ejecutados
| Comando | Propósito | Resultado Real |
|---|---|---|
| `npm run lint` | Chequeo de tipos TypeScript | Exitoso (código 0) |
| `npm run test` | Suite de pruebas Vitest | 27 pasaron / 0 fallaron |
| `npm run build` | Compilación de producción Vite | Exitoso (código 0) |

---

## 8. Problemas Encontrados y Soluciones
- Ninguno.

---

## 9. Limitaciones y Pendientes
- El tooltip nativo aparece con el retardo propio del navegador y no se muestra al tocar en móviles; la descripción accesible sí está disponible.

---

## 10. Rama, Commits y Pull Request
- **Rama de trabajo**: `feat/T47-tooltip-prioridad`
- **Commits asociados**: ver PR.
- **PR**: hacia `manolovillarreal/SyncBoard:main` (Refs #47).

---

## 11. Pasos Concretos para Continuar
1. Revisión del docente y merge del PR.
2. Al integrarse, marcar T47 como *Completada* en `docs/backlog.md`.
