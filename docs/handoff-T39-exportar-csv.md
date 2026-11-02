# Plantilla de Handoff — SyncBoard

## 1. Identificador y Objetivo de la Tarea
- **ID de Tarea**: T39 (Issue #39)
- **Título**: Exportar tareas del proyecto a formato CSV descargable
- **Responsable/Agente**: Juan Sebastian Gonzalez Arcila (con asistencia de Claude)
- **Fecha**: 2026-11-02

---

## 2. Contexto Relevante
- Los integrantes no tenían forma de sacar las tareas del proyecto de SyncBoard (para informes o seguimiento externo). Se pidió una exportación a CSV desde la configuración del proyecto.

---

## 3. Estado Real del Repositorio al Comenzar
- **Rama base**: `main`
- **Último commit verificado**: `3e9a935`
- **Archivos sin confirmar preexistentes**: ninguno.

---

## 4. Trabajo Realizado
- Nueva utilidad `src/lib/csvExport.ts`:
  - `exportTasksToCSV(tasks: Task[], members: ProjectMember[], projectName: string): void` (firma pedida en el Issue).
  - Columnas: Título, Descripción, Estado (en español), Prioridad (en español), Responsable y Fecha límite.
  - Escape RFC 4180: los campos con comas, comillas o saltos de línea se encierran entre comillas y las comillas internas se duplican; filas separadas por CRLF.
  - Genera un `Blob` `text/csv` con BOM UTF-8 y dispara la descarga como `syncboard-<proyecto>.csv`.
- Botón **Exportar CSV** en `ProjectSettingsModal`, visible para todos los integrantes. Consulta las tareas del proyecto (misma consulta que `KanbanBoard`, respetando RLS) y reutiliza la lista de integrantes ya cargada para resolver el responsable.

---

## 5. Archivos Creados / Modificados
- `src/lib/csvExport.ts`: generador CSV, escape, nombre de archivo y descarga.
- `src/features/projects/ProjectSettingsModal.tsx`: sección y botón de exportación con estado *Exportando...* y manejo de errores.
- `src/test/csvExport.test.ts`: 5 pruebas unitarias.
- `docs/backlog.md`: T39 en revisión.
- `docs/handoff-T39-exportar-csv.md`: este documento.

---

## 6. Decisiones Técnicas Tomadas
- La generación del texto (`buildTasksCSV`, `escapeCSVField`, `buildCSVFileName`) está separada de la descarga para poder probarla sin navegador.
- Se añade BOM UTF-8 para que Excel muestre bien tildes y eñes.
- El nombre del proyecto se normaliza (sin tildes, minúsculas, guiones) para un nombre de archivo válido en cualquier sistema.
- La fecha límite se exporta en formato ISO (`YYYY-MM-DD`) para que las hojas de cálculo la ordenen correctamente.
- Las tareas se consultan al pulsar el botón para exportar siempre el estado actual, sin cambiar las props del modal.

---

## 7. Comandos y Verificaciones Ejecutados
| Comando | Propósito | Resultado Real |
|---|---|---|
| `npm run lint` | Chequeo de tipos TypeScript | Exitoso (código 0) |
| `npm run test` | Suite de pruebas Vitest | 26 pasaron / 0 fallaron |
| `npm run build` | Compilación de producción Vite | Exitoso (código 0) |

---

## 8. Problemas Encontrados y Soluciones
- El `Blob` de jsdom no implementa `blob.text()`; en la prueba se lee el contenido con `FileReader`.

---

## 9. Limitaciones y Pendientes
- El responsable se muestra con su `display_name`; si una tarea apunta a alguien que ya no es integrante, aparece como *Usuario*.

---

## 10. Rama, Commits y Pull Request
- **Rama de trabajo**: `feat/T39-exportar-csv`
- **Commits asociados**: ver PR.
- **PR**: hacia `manolovillarreal/SyncBoard:main` (Refs #39).

---

## 11. Pasos Concretos para Continuar
1. Revisión del docente y merge del PR.
2. Al integrarse, marcar T39 como *Completada* en `docs/backlog.md`.
