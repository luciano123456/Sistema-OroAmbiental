class UbicacionModal {

    constructor(root, options = {}) {

        this.root = root;
        this.opts = options;

        this.modal = root.querySelector("#modalUbicacion");

        this.fields = {
            Id: root.querySelector('[data-field="Id"]'),
            Descripcion: root.querySelector('[data-field="Descripcion"]'),
            Espacio: root.querySelector('[data-field="Espacio"]'),
            Direccion: root.querySelector('[data-field="Direccion"]')
        };

        this.btnGuardar = root.querySelector('[data-action="guardar"]');

        this.infoAuditoria = root.querySelector('[data-role="infoAuditoria"]');
        this.infoRegistro = root.querySelector('[data-role="infoRegistro"]');
        this.infoModificacion = root.querySelector('[data-role="infoModificacion"]');

        this.modo = "nuevo";

        this.bind();
    }

    /* =========================
       INIT
    ========================= */

    bind() {

        this.btnGuardar?.addEventListener("click", () => this.guardar());

        // 🔥 VALIDACIÓN EN VIVO (CLAVE)
        Object.entries(this.fields).forEach(([key, field]) => {

            if (!field || key === "Id") return;

            field.addEventListener("input", () => {
                this.validarCampo(field);
            });

            field.addEventListener("blur", () => {
                this.validarCampo(field);
            });

        });

        // 🔥 FIX SELECT2
        const selects = this.root.querySelectorAll("select");

        selects.forEach(sel => {

            if (window.jQuery) {

                const $el = $(sel);

                if ($el.data("select2"))
                    $el.select2("destroy");

                $el.select2({
                    dropdownParent: $(this.modal),
                    width: "100%"
                });
            }

        });
    }

    /* =========================
       MODOS
    ========================= */

    async abrirNuevo() {

        if (!Permisos.tiene("Ubicaciones", "Crear")) {
            errorModal("No tenés permisos.");
            return;
        }

        this.modo = "nuevo";

        this.limpiar();
        this.setTitulo("Nueva ubicación");
        this.setSoloLectura(false);
        this.setAuditoria(null);

        this.resetValidaciones();

        this.show();
    }

    async abrirEditar(id) {

        if (!Permisos.tiene("Ubicaciones", "Editar")) {
            errorModal("No tenés permisos.");
            return;
        }

        this.modo = "editar";

        const data = await this.fetchData(id);

        this.cargar(data);
        this.setTitulo("Editar ubicación");
        this.setSoloLectura(false);
        this.setAuditoria(data);

        this.resetValidaciones();

        this.show();
    }

    async abrirVer(id) {

        this.modo = "ver";

        const data = await this.fetchData(id);

        this.cargar(data);
        this.setTitulo("Ficha de ubicación");
        this.setSoloLectura(true);
        this.setAuditoria(data);

        this.show();
    }

    /* =========================
       DATA
    ========================= */

    async fetchData(id) {

        const r = await fetch(`/Ubicaciones/EditarInfo?id=${id}`, {
            headers: {
                'Authorization': 'Bearer ' + (this.opts.token || "")
            }
        });

        if (!r.ok)
            throw new Error("Error obteniendo ubicación");

        return await r.json();
    }

    cargar(data) {

        this.fields.Id.value = data.Id || "";
        this.fields.Descripcion.value = data.Descripcion || "";
        this.fields.Espacio.value = data.Espacio || "";
        this.fields.Direccion.value = data.Direccion || "";
    }

    limpiar() {

        Object.values(this.fields).forEach(f => {
            if (f) f.value = "";
        });
    }

    /* =========================
       VALIDACIONES PRO (como artistas)
    ========================= */

    validarCampo(field) {

        const val = (field.value || "").trim();

        const group = field.closest(".vn-field");

        let error = group?.querySelector(".vn-error-msg");

        if (!error) {
            error = document.createElement("div");
            error.className = "vn-error-msg";
            group?.appendChild(error);
        }

        if (!val) {

            field.classList.remove("is-valid");
            field.classList.add("is-invalid");

            error.textContent = "Campo obligatorio";
            error.style.display = "block";

            return false;

        } else {

            field.classList.remove("is-invalid");
            field.classList.add("is-valid");

            error.style.display = "none";

            return true;
        }
    }

    validar() {

        let ok = true;

        Object.entries(this.fields).forEach(([key, field]) => {

            if (key === "Id") return;

            if (!this.validarCampo(field))
                ok = false;

        });

        return ok;
    }

    resetValidaciones() {

        Object.values(this.fields).forEach(f => {

            if (!f) return;

            f.classList.remove("is-valid", "is-invalid");

            const group = f.closest(".vn-field");
            const error = group?.querySelector(".vn-error-msg");

            if (error) error.style.display = "none";

        });
    }

    /* =========================
       GUARDAR
    ========================= */

    async guardar() {

        if (this.modo === "ver") return;

        const id = Number(this.fields.Id.value || 0);
        const esNuevo = id === 0;

        // 🔥 PERMISOS
        const puedeCrear = Permisos.tiene("Ubicaciones", "Crear");
        const puedeEditar = Permisos.tiene("Ubicaciones", "Editar");

        if (esNuevo && !puedeCrear) {
            errorModal("No tenés permisos para crear ubicaciones.");
            return;
        }

        if (!esNuevo && !puedeEditar) {
            errorModal("No tenés permisos para editar ubicaciones.");
            return;
        }

        // 🔥 VALIDACIÓN
        if (!this.validar()) return;

        const modelo = {
            Id: id,
            Descripcion: this.fields.Descripcion.value,
            Espacio: this.fields.Espacio.value,
            Direccion: this.fields.Direccion.value
        };

        const r = await fetch(
            esNuevo ? "/Ubicaciones/Insertar" : "/Ubicaciones/Actualizar",
            {
                method: esNuevo ? "POST" : "PUT",
                headers: {
                    "Authorization": "Bearer " + (this.opts.token || ""),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(modelo)
            }
        );

        const data = await r.json();

        if (!data.valor) {
            errorModal(data.mensaje);
            return;
        }

        this.hide();

        if (this.opts.onSaved)
            this.opts.onSaved(data, modelo);

        exitoModal(data.mensaje || "Ubicación guardada");
    }

    /* =========================
       ELIMINAR
    ========================= */

    async eliminar(id) {

        if (!Permisos.tiene("Ubicaciones", "Eliminar")) {
            errorModal("No tenés permisos.");
            return;
        }


        const ok = await confirmarModal("¿Eliminar ubicación?");
        if (!ok) return;

        const r = await fetch(`/Ubicaciones/Eliminar?id=${id}`, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + (this.opts.token || "")
            }
        });

        const data = await r.json();

        if (!data.valor) {
            errorModal(data.mensaje);
            return;
        }

        if (this.opts.onDeleted)
            this.opts.onDeleted(id);

        exitoModal("Ubicación eliminada");
    }

    /* =========================
       UI
    ========================= */

    show() {
        $(this.modal).modal("show");
    }

    hide() {
        $(this.modal).modal("hide");
    }

    setTitulo(txt) {

        const t = this.root.querySelector('[data-field="titulo"]');
        if (t) t.textContent = txt;
    }

    setSoloLectura(flag) {

        Object.values(this.fields).forEach(f => {
            if (f) f.disabled = flag;
        });

        if (this.btnGuardar)
            this.btnGuardar.style.display = flag ? "none" : "inline-block";
    }

    /* =========================
       AUDITORIA
    ========================= */

    setAuditoria(data) {

        if (!this.infoAuditoria) return;

        if (!data || (!data.UsuarioRegistra && !data.UsuarioModifica)) {

            this.infoAuditoria.classList.add("d-none");
            return;
        }

        this.infoAuditoria.classList.remove("d-none");

        if (this.infoRegistro) {

            this.infoRegistro.innerHTML = data.UsuarioRegistra
                ? `Registrado por <b>${data.UsuarioRegistra}</b> • ${this.formatDate(data.FechaRegistra)}`
                : "";
        }

        if (this.infoModificacion) {

            this.infoModificacion.innerHTML = data.UsuarioModifica
                ? `Modificado por <b>${data.UsuarioModifica}</b> • ${this.formatDate(data.FechaModifica)}`
                : "";
        }
    }

    formatDate(f) {

        if (!f) return "";

        try {
            return new Date(f).toLocaleString("es-AR");
        } catch {
            return "";
        }
    }
}