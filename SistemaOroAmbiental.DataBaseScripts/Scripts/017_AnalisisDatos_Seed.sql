/*
  017 — Módulo Análisis de datos
  Inserta el módulo y otorga permisos genéricos (Ver/etc.) al rol admin (Id = 1)
  y a usuarios con ese rol. Idempotente.
*/

SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM Usuarios_Modulos WHERE Codigo = 'AnalisisDatos')
BEGIN
    INSERT INTO Usuarios_Modulos (Nombre, Codigo, Grupo, Orden, Activo)
    VALUES (N'Análisis de datos', 'AnalisisDatos', N'Extras', 90, 1);
END
GO

DECLARE @IdModulo int = (SELECT TOP 1 Id FROM Usuarios_Modulos WHERE Codigo = 'AnalisisDatos');
DECLARE @IdRolAdmin int = 1;

IF @IdModulo IS NOT NULL
BEGIN
    INSERT INTO Usuarios_RolesPermisos (IdRol, IdModulo, IdPermiso, Activo, FechaRegistra)
    SELECT @IdRolAdmin, @IdModulo, p.Id, 1, GETDATE()
    FROM Usuarios_Permisos p
    WHERE p.Activo = 1
      AND p.IdModulo IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM Usuarios_RolesPermisos rp
            WHERE rp.IdRol = @IdRolAdmin
              AND rp.IdModulo = @IdModulo
              AND rp.IdPermiso = p.Id
      );

    INSERT INTO Usuarios_PermisosUsuario (IdUsuario, IdModulo, IdPermiso, Activo, FechaRegistra)
    SELECT u.Id, @IdModulo, p.Id, 1, GETDATE()
    FROM Usuarios u
    CROSS JOIN Usuarios_Permisos p
    WHERE u.IdRol = @IdRolAdmin
      AND p.Activo = 1
      AND p.IdModulo IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM Usuarios_PermisosUsuario upu
            WHERE upu.IdUsuario = u.Id
              AND upu.IdModulo = @IdModulo
              AND upu.IdPermiso = p.Id
      );
END
GO
