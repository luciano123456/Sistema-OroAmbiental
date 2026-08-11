-- Módulo actual del usuario (presencia por pantalla).
-- Ejecutar en la base del sistema.

IF COL_LENGTH('dbo.Usuarios', 'UltimoModulo') IS NULL
BEGIN
    ALTER TABLE dbo.Usuarios
        ADD UltimoModulo NVARCHAR(40) NULL;
END
GO
