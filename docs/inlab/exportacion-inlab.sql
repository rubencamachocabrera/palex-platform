/*
  Exportación InLab para Inteligencia InLab (Palex) — FORMATO PLANO (A)
  ----------------------------------------------------------------------
  Ejecutar en el SQL Server de InLab del hospital (base de datos de InLab) y
  guardar el resultado como CSV con cabecera (SSMS: Resultados → clic derecho →
  "Guardar resultados como…" → CSV; o bcp/sqlcmd con separador coma).

  · Una fila por tubo/etiqueta impresa (dbo.LabOrder_Specimens), cruzada con el
    pedido (dbo.LabOrders) y los catálogos Cfg_*.
  · SIN datos de pacientes: no se usa dbo.LabPatients ni la columna HL7Received.
  · ~70 MB por año en un hospital como Gómez Ulla (frente a ~2 GB de la BD completa).
  · Ajustar @Desde/@Hasta al periodo a exportar. La plataforma acumula histórico y
    detecta solapes, así que se pueden enviar periodos mensuales o completos.

  Relaciones verificadas: LabOrder_Specimens.LabOrderNumber = LabOrders.Id.
  La impresora se aproxima con la impresora por defecto del puesto que validó el tubo.
*/
SET NOCOUNT ON;
DECLARE @Desde datetime = '2026-01-01';
DECLARE @Hasta datetime = '2026-09-01';

SELECT
  s.Id                                                         AS TuboId,
  o.Id                                                         AS PedidoId,
  wa.Code                                                      AS Area,
  ws.AliasNamePC                                               AS Puesto,
  pr.Code                                                      AS Impresora,
  CASE WHEN dup.n > 1 THEN t.SpecimenCode + ' ' + REPLACE(t.TubeCode, '^', '')
       ELSE t.SpecimenCode END                                 AS Consumible,
  s.InfoExtraPrint                                             AS Seccion,
  o.Priority                                                   AS Prioridad,          -- 1 normal, 2 urgente
  o.ReceivingUnit                                              AS UnidadReceptora,
  o.State                                                      AS EstadoPedido,
  s.State                                                      AS EstadoTubo,         -- 5 válido, -1 anulado
  s.NumPrinted                                                 AS Impresiones,        -- >1 = reimpresión
  oi.CodeIncidence                                             AS IncidenciaPedido,
  si.CodeIncidence                                             AS IncidenciaTubo,
  CONVERT(varchar(23), o.OrderDate, 121)                       AS FechaPeticion,
  CONVERT(varchar(23), o.DateTimePatientArrived, 121)          AS FechaLlegada,
  CONVERT(varchar(23), o.DateLabOrderNumber, 121)              AS FechaNumeracion,
  CONVERT(varchar(23), s.DatetimeCreated, 121)                 AS FechaImpresion,
  CONVERT(varchar(23), s.DatetimeValidated, 121)               AS FechaValidacionTubo,
  CONVERT(varchar(23), o.DateTimeValidated, 121)               AS FechaValidacionPedido,
  (SELECT COUNT(*) FROM dbo.LabOrder_Tests lt WHERE lt.LabOrderId = o.Id) AS NumPruebasPedido
FROM dbo.LabOrder_Specimens s
LEFT JOIN dbo.LabOrders o                          ON o.Id  = s.LabOrderNumber
LEFT JOIN dbo.Cfg_Center_WorkArea wa               ON wa.Id = o.CenterWorkAreaId
LEFT JOIN dbo.Cfg_Center_WorkArea_WorkStations ws  ON ws.Id = COALESCE(s.WorkStationIdValidated, s.WorkStationIdLastModify, s.WorkStationId)
LEFT JOIN dbo.Cfg_Center_WorkArea_Printers pr      ON pr.Id = ws.PrinterDefaultId
LEFT JOIN dbo.Cfg_Lab_Tubes t                      ON t.Id  = s.CfgLabTubesId
LEFT JOIN (SELECT SpecimenCode, COUNT(*) AS n FROM dbo.Cfg_Lab_Tubes GROUP BY SpecimenCode) dup ON dup.SpecimenCode = t.SpecimenCode
LEFT JOIN dbo.Cfg_Lab_Incidences oi                ON oi.Id = o.CfgLabIncidenceId
LEFT JOIN dbo.Cfg_Lab_Incidences si                ON si.Id = s.CfgLabIncidenceId
WHERE s.DatetimeCreated >= @Desde AND s.DatetimeCreated < @Hasta
ORDER BY s.DatetimeCreated;
