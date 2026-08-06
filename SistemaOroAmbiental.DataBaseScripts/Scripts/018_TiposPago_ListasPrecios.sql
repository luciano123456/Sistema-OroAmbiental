/*
  018 — Tipos de pago + vínculo en Listas de Precio.
  - Tabla TiposPago (Efectivo / Transferencia)
  - ListasPrecios.IdTipoPago
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.TiposPago', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TiposPago
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TiposPago PRIMARY KEY,
        Nombre VARCHAR(100) NOT NULL,
        Codigo VARCHAR(30) NOT NULL,
        IdUsuarioRegistra INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica INT NULL,
        FechaUsuarioModifica DATETIME NULL
    );

    CREATE UNIQUE INDEX UX_TiposPago_Codigo ON dbo.TiposPago (Codigo);

    PRINT N'OK: tabla TiposPago creada.';
END
ELSE
    PRINT N'Skip: tabla TiposPago ya existe.';
GO

DECLARE @IdUser INT = (SELECT TOP 1 Id FROM dbo.Usuarios ORDER BY Id);
IF @IdUser IS NULL SET @IdUser = 1;

IF NOT EXISTS (SELECT 1 FROM dbo.TiposPago WHERE Codigo = N'Efectivo')
BEGIN
    INSERT INTO dbo.TiposPago (Nombre, Codigo, IdUsuarioRegistra, FechaUsuarioRegistra)
    VALUES (N'Efectivo', N'Efectivo', @IdUser, GETDATE());
    PRINT N'OK: seed TiposPago Efectivo.';
END

IF NOT EXISTS (SELECT 1 FROM dbo.TiposPago WHERE Codigo = N'Transferencia')
BEGIN
    INSERT INTO dbo.TiposPago (Nombre, Codigo, IdUsuarioRegistra, FechaUsuarioRegistra)
    VALUES (N'Transferencia', N'Transferencia', @IdUser, GETDATE());
    PRINT N'OK: seed TiposPago Transferencia.';
END
GO

IF COL_LENGTH(N'dbo.ListasPrecios', N'IdTipoPago') IS NULL
BEGIN
    ALTER TABLE dbo.ListasPrecios ADD IdTipoPago INT NULL;
    PRINT N'OK: ListasPrecios.IdTipoPago agregada.';
END
ELSE
    PRINT N'Skip: ListasPrecios.IdTipoPago ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_ListasPrecios_TiposPago'
      AND parent_object_id = OBJECT_ID(N'dbo.ListasPrecios')
)
BEGIN
    ALTER TABLE dbo.ListasPrecios WITH CHECK
    ADD CONSTRAINT FK_ListasPrecios_TiposPago
        FOREIGN KEY (IdTipoPago) REFERENCES dbo.TiposPago (Id);
    PRINT N'OK: FK ListasPrecios → TiposPago.';
END
ELSE
    PRINT N'Skip: FK ListasPrecios → TiposPago ya existe.';
GO

/* Backfill: listas cuyo nombre ya indica el tipo de pago */
UPDATE lp
SET lp.IdTipoPago = tp.Id
FROM dbo.ListasPrecios lp
INNER JOIN dbo.TiposPago tp ON tp.Codigo = N'Efectivo'
WHERE lp.IdTipoPago IS NULL
  AND (
        lp.Nombre LIKE N'%efect%'
     OR lp.Nombre LIKE N'%Efect%'
  );
GO

UPDATE lp
SET lp.IdTipoPago = tp.Id
FROM dbo.ListasPrecios lp
INNER JOIN dbo.TiposPago tp ON tp.Codigo = N'Transferencia'
WHERE lp.IdTipoPago IS NULL
  AND (
        lp.Nombre LIKE N'%transf%'
     OR lp.Nombre LIKE N'%Transf%'
     OR lp.Nombre LIKE N'%banco%'
     OR lp.Nombre LIKE N'%Banco%'
  );
GO

PRINT N'018_TiposPago_ListasPrecios finalizado.';
GO
