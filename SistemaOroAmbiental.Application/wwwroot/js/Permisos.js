const Permisos = (() => {

    let user = null;
    let permisos = [];

    function init() {
        try {
            user = JSON.parse(localStorage.getItem("userSession"));
            permisos = user?.Permisos || [];
        } catch {
            permisos = [];
        }
    }

    function getModulo(modulo) {

        const mod = (modulo || "").toString().trim().toLowerCase();

        return permisos.find(x => {

            const nombre = (x.Modulo || "").toString().trim().toLowerCase();
            const codigo = (x.CodigoModulo || "").toString().trim().toLowerCase();

            return nombre === mod || codigo === mod;
        });
    }
    // 🔥 NUEVA LÓGICA
    function tiene(modulo, accion) {

        const m = getModulo(modulo);


        if (!m || !m.Permisos) return false;

        const permiso = m.Permisos.find(p =>
            (p.Codigo || "").toLowerCase() === (accion || "").toLowerCase()
        );

        return !!permiso?.Activo;
    }

    function selectorPermiso(modulo, perm) {

        return $(`[data-permiso="${perm}"]`).filter(function () {
            const modEl = ($(this).attr("data-modulo") || "").toLowerCase();
            return modEl === (modulo || "").toLowerCase();
        });
    }

    function aplicarUI(modulo) {

        // 🔥 CREAR
        if (!tiene(modulo, "CREAR")) {
            selectorPermiso(modulo, "crear").remove();
        }

        // 🔥 EDITAR
        if (!tiene(modulo, "EDITAR")) {
            selectorPermiso(modulo, "editar").remove();
        }

        // 🔥 ELIMINAR
        if (!tiene(modulo, "ELIMINAR")) {
            selectorPermiso(modulo, "eliminar").remove();
        }

        // 🔥 EXPORTAR
        if (!tiene(modulo, "EXPORTAR")) {
            selectorPermiso(modulo, "exportar").remove();
        }

        // 🔥 VER → BLOQUEO TOTAL
        if (!tiene(modulo, "VER")) {

            document.body.innerHTML = `
            <div class="no-access-wrapper">
                <div class="no-access-card">

                    <div class="no-access-icon">
                        <i class="fa fa-lock"></i>
                    </div>

                    <div class="no-access-title">
                        Acceso restringido
                    </div>

                    <div class="no-access-text">
                        No tenés permisos para acceder a este módulo.
                    </div>

                    <button class="no-access-btn" onclick="window.history.back()">
                        ← Volver
                    </button>

                </div>
            </div>
            `;

            return;
        }
    }

    return {
        init,
        tiene,
        aplicarUI
    };

})();