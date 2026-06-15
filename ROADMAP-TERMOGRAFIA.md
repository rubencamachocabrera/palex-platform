# Roadmap — Cadena de frío / termografía como core del negocio

> Análisis estratégico generado el 2026-06-12. Guardado para continuar en próxima sesión.
> No implica cambios de código todavía — ver sección 6 (preguntas abiertas) antes de planificar.

## Idea central

Palex tiene hoy 3 islas de datos sobre el mismo viaje de una muestra biológica, nunca unidas:

1. **Termografía** (sistema propio ya en producción, BD propia): rutas, paradas/pueblos, neveras,
   temperatura de llegada, tiempos de transporte.
2. **InLab Platform** (este repo): visita técnica, score de complejidad, PreProyecto, hardware
   instalado, consumo de tubos (hoy mock en `/datos`).
3. **Laboratorio del cliente** (LIS): incidencias preanalíticas (hemólisis, coagulación, volumen
   insuficiente, etiquetado, TAT).

Cerrar el círculo entre las 3 (ej. "la muestra que llegó tarde y fuera de rango desde el centro X es
la misma que dio hemólisis el martes") convierte a Palex de proveedor de tubos a proveedor de
**trazabilidad y calidad preanalítica end-to-end** — relevante para acreditación ISO 15189 y para
venta consultiva.

## Arquitectura propuesta (resumen)

- **No migrar de golpe el sistema de termografía** — federar primero (read-only).
- Modelos espejo en `prisma/schema.prisma`: `RutaTermo`, `ParadaRuta`, `NeveraTermo`,
  `LecturaTemperatura`, poblados por un job de sincronización periódico que lee de la BD de
  termografía (Palex la controla, acceso de lectura viable).
- Nuevo módulo `/termografia` con mapa de rutas (reusa Leaflet de `/mapa`): vista interna primero,
  vista cliente después (panel único a largo plazo, según dirección estratégica de Ruben).
- Correlaciones termografía ↔ incidencias ↔ consumo: construir la arquitectura ya con datos mock
  (como `/datos`), lista para "encenderse" cuando haya feed real de LIS.

## Roadmap por fases

| Fase | Qué | Depende de |
|---|---|---|
| 0 | Responder preguntas abiertas (abajo) | — |
| 1 | Job de sincronización read-only + modelos espejo | Acceso lectura BD termografía |
| 2 | Mapa de rutas interno `/termografia` | Fase 1 |
| 3 | KPIs termografía por hospital + alertas excursión temperatura | Fase 1-2 |
| 4 | Vista cliente (panel único parcial) | Fase 3 + decidir auth cliente |
| 5 | Correlaciones termo ↔ incidencias/consumo (datos mock) | En paralelo |
| 6 | Feed real incidencias/consumo desde LIS cliente | Fuera de este repo |
| 7 | Evaluar deprecar dashboard termografía original | Fase 4-5 maduras |

## Preguntas abiertas (resolver antes de planificar implementación)

1. ¿Motor de BD de termografía (Postgres/MySQL/otro) y dónde está alojada? ¿Accesible desde Railway?
2. Esquema real: tablas/columnas de rutas, paradas, neveras, lecturas de temperatura, umbrales de
   alarma ya configurados.
3. Volumen de datos (rutas/lecturas por día) — define frecuencia del cron de sync.
4. ¿Los hospitales/clientes tienen cuenta de usuario en InLab platform hoy, o acceso sería vía
   `shareToken` sin login (como `mapaToken` en PreProyecto)?
5. ¿Identificador común entre Hospital (InLab) y cliente/lab en sistema de termografía (nombre, ID,
   NIF) para enlazar `RutaTermo.hospitalId`?
6. Umbrales de temperatura: ¿por tipo de tubo/muestra o un único rango general por nevera?

## Quick wins independientes (no bloqueados por lo anterior)

- **A1**: Mostrar score de complejidad/riesgos de visita técnica (`lib/visita-analysis.ts`) en la
  ficha de `Oportunidad` y Kanban de pipeline.
- **A2**: Calculadora automática de hardware de termografía desde campos `s_termo` del formulario de
  visita (nº rutas, nº neveras, infraestructura) → genera `LineaMaterial` en PreProyecto.
- **A3**: Alertas de garantía/mantenimiento de `HardwareUnidad` → generar oportunidades de renovación.
- Otros del análisis general: módulo catálogo/pedidos de consumibles (tubos), puente
  Oportunidad(GANADO)→PreProyecto, Customer Health Score por hospital, simulador ROI InLab,
  comparador de hospitales, asistente de presupuesto automático.

## Próximo paso

Ruben responde las preguntas abiertas (especialmente 1, 2 y 4) → siguiente sesión se convierte
Fase 1-3 en propuesta de implementación concreta (PROPUESTA/Qué/Cómo/Archivos/Complejidad/¿Procedo?).
Si se quiere progreso visible mientras tanto, empezar por A1 o A2.
