-- Control mensual por establecimiento (visita / abonos scoped)
-- Ejecutar en la base del sistema.

IF COL_LENGTH('dbo.ClientesControlMensual', 'IdEstablecimiento') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesControlMensual
        ADD IdEstablecimiento INT NULL;

    ALTER TABLE dbo.ClientesControlMensual
        ADD CONSTRAINT FK_ClientesControlMensual_Establecimiento
            FOREIGN KEY (IdEstablecimiento) REFERENCES dbo.ClientesEstablecimientos(Id);
END
GO

-- Reemplazar UQ (IdCliente, Anio, Mes) por índices filtrados cliente / establecimiento
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_ClientesControlMensual'
      AND object_id = OBJECT_ID(N'dbo.ClientesControlMensual')
)
BEGIN
    ALTER TABLE dbo.ClientesControlMensual DROP CONSTRAINT UQ_ClientesControlMensual;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ClientesControlMensual_IdCliente_Anio_Mes'
      AND object_id = OBJECT_ID(N'dbo.ClientesControlMensual')
)
BEGIN
    DROP INDEX IX_ClientesControlMensual_IdCliente_Anio_Mes ON dbo.ClientesControlMensual;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_ClientesControlMensual_Cliente'
      AND object_id = OBJECT_ID(N'dbo.ClientesControlMensual')
)
BEGIN
    CREATE UNIQUE INDEX UQ_ClientesControlMensual_Cliente
        ON dbo.ClientesControlMensual (IdCliente, Anio, Mes)
        WHERE IdEstablecimiento IS NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_ClientesControlMensual_Establecimiento'
      AND object_id = OBJECT_ID(N'dbo.ClientesControlMensual')
)
BEGIN
    CREATE UNIQUE INDEX UQ_ClientesControlMensual_Establecimiento
        ON dbo.ClientesControlMensual (IdCliente, Anio, Mes, IdEstablecimiento)
        WHERE IdEstablecimiento IS NOT NULL;
END
GO
