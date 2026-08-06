-- Entregas imputadas a establecimiento (no al contrato).
-- Ejecutar en la base del sistema.

IF COL_LENGTH('dbo.ClientesEntregas', 'IdEstablecimiento') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEntregas
        ADD IdEstablecimiento INT NULL;
END
GO

-- Backfill desde contrato
UPDATE e
SET e.IdEstablecimiento = c.IdEstablecimiento
FROM dbo.ClientesEntregas e
INNER JOIN dbo.Contratos c ON c.Id = e.IdContrato
WHERE e.IdEstablecimiento IS NULL
  AND e.IdContrato IS NOT NULL
  AND c.IdEstablecimiento > 0;
GO

-- Si el cliente tiene un solo establecimiento, imputar entregas huérfanas
UPDATE e
SET e.IdEstablecimiento = u.IdEstablecimiento
FROM dbo.ClientesEntregas e
INNER JOIN (
    SELECT IdCliente, MIN(Id) AS IdEstablecimiento
    FROM dbo.ClientesEstablecimientos
    GROUP BY IdCliente
    HAVING COUNT(*) = 1
) u ON u.IdCliente = e.IdCliente
WHERE e.IdEstablecimiento IS NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_ClientesEntregas_ClientesEstablecimientos'
)
BEGIN
    ALTER TABLE dbo.ClientesEntregas
        ADD CONSTRAINT FK_ClientesEntregas_ClientesEstablecimientos
            FOREIGN KEY (IdEstablecimiento) REFERENCES dbo.ClientesEstablecimientos(Id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ClientesEntregas_IdEstablecimiento'
      AND object_id = OBJECT_ID(N'dbo.ClientesEntregas')
)
BEGIN
    CREATE INDEX IX_ClientesEntregas_IdEstablecimiento
        ON dbo.ClientesEntregas (IdEstablecimiento);
END
GO
