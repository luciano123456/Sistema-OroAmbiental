/*
  023 — Contador del último número de manifiesto por hoja de ruta
        (unidad + semana + día). El siguiente manifiesto parte de UltimoNumero + 1
        y se puede pisar a mano al exportar.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.RecorridosManifiestosContador', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosManifiestosContador (
        Id                   INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCamion             INT NOT NULL,
        IdSemana             INT NOT NULL,
        IdDia                INT NOT NULL,
        UltimoNumero         INT NOT NULL,
        IdUsuarioModifica    INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT UQ_RecorridosManifiestosContador UNIQUE (IdCamion, IdSemana, IdDia),
        CONSTRAINT FK_RecorridosManifiestosContador_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id),
        CONSTRAINT FK_RecorridosManifiestosContador_Semanas FOREIGN KEY (IdSemana) REFERENCES dbo.Semanas(Id),
        CONSTRAINT FK_RecorridosManifiestosContador_Dias FOREIGN KEY (IdDia) REFERENCES dbo.Dias(Id),
        CONSTRAINT FK_RecorridosManifiestosContador_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
    CREATE INDEX IX_RecorridosManifiestosContador_Camion
        ON dbo.RecorridosManifiestosContador(IdCamion);
    PRINT N'OK: RecorridosManifiestosContador creada.';
END
ELSE
    PRINT N'Skip: RecorridosManifiestosContador ya existe.';
GO

PRINT N'023_RecorridosManifiestosContador finalizado.';
GO
