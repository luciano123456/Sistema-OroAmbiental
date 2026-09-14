/*
  026 — Índices para acelerar Recorridos (listado por unidad/semana/día,
        sugeridos por programación y productos del establecimiento).
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClientesRecorridos_CamionSemanaDia' AND object_id = OBJECT_ID(N'dbo.ClientesRecorridos'))
    CREATE INDEX IX_ClientesRecorridos_CamionSemanaDia
        ON dbo.ClientesRecorridos (IdCamion, IdSemana, IdDia)
        INCLUDE (Posicion, IdCliente, IdEstablecimiento, Activo, Reprogramado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClientesRecorridos_Establecimiento' AND object_id = OBJECT_ID(N'dbo.ClientesRecorridos'))
    CREATE INDEX IX_ClientesRecorridos_Establecimiento
        ON dbo.ClientesRecorridos (IdEstablecimiento)
        WHERE IdEstablecimiento IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClientesEstablecimientos_Cliente' AND object_id = OBJECT_ID(N'dbo.ClientesEstablecimientos'))
    CREATE INDEX IX_ClientesEstablecimientos_Cliente
        ON dbo.ClientesEstablecimientos (IdCliente);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClientesEstablecimientos_Recoleccion' AND object_id = OBJECT_ID(N'dbo.ClientesEstablecimientos'))
    CREATE INDEX IX_ClientesEstablecimientos_Recoleccion
        ON dbo.ClientesEstablecimientos (IdSemanaRecoleccion, IdDiaRecoleccion, IdCamion)
        INCLUDE (IdCliente, Nombre);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ClientesEstablecimientosProductos_Establecimiento' AND object_id = OBJECT_ID(N'dbo.ClientesEstablecimientosProductos'))
    CREATE INDEX IX_ClientesEstablecimientosProductos_Establecimiento
        ON dbo.ClientesEstablecimientosProductos (IdEstablecimiento)
        INCLUDE (IdProducto, IdListaPrecio, Cantidad, PrecioVenta);
GO

PRINT '026_RecorridosIndices.sql ejecutado correctamente.';
GO
