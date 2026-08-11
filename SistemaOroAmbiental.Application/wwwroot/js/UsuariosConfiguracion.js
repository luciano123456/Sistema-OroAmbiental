let timerError;

function authHeadersPerfil(json = true) {
    const h = {};
    if (json) h["Content-Type"] = "application/json;charset=utf-8";
    const token = localStorage.getItem("JwtToken");
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
}

function mostrarMensajePerfil(html, tipo) {
    const el = document.getElementById("msjerror");
    if (!el) return;
    el.classList.remove("d-none", "is-ok", "is-error");
    el.classList.add(tipo === "ok" ? "is-ok" : "is-error");
    el.innerHTML = html;
    if (timerError) clearTimeout(timerError);
    if (tipo !== "ok") {
        timerError = setTimeout(() => el.classList.add("d-none"), 7000);
    }
}

function ocultarMensajePerfil() {
    document.getElementById("msjerror")?.classList.add("d-none");
}

function inicialesPerfil(nombre, apellido) {
    const n = (nombre || "").trim().charAt(0);
    const a = (apellido || "").trim().charAt(0);
    const ini = (n + a).toUpperCase();
    return ini || "?";
}

function actualizarAvatarPerfil(nombre, apellido) {
    const avatar = document.getElementById("rpPerfilAvatar");
    if (avatar) avatar.textContent = inicialesPerfil(nombre, apellido);
}

function actualizarNombreNavbar(nombre, apellido) {
    const full = `${nombre || ""} ${apellido || ""}`.trim();
    if (full) {
        $("#userName").text(full);
        try {
            const raw = localStorage.getItem("userSession");
            if (raw) {
                const user = JSON.parse(raw);
                user.Nombre = nombre;
                user.Apellido = apellido;
                localStorage.setItem("userSession", JSON.stringify(user));
            }
        } catch { /* ignore */ }
    }
}

function syncPillsVistaPerfil(valor) {
    const select = document.getElementById("rpConfigViewMode");
    const pills = document.querySelectorAll(".rp-perfil-pill");
    const val = valor || select?.value || "auto";
    if (select) select.value = val;
    pills.forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.view === val);
    });
}

function initPillsVistaPerfil() {
    const select = document.getElementById("rpConfigViewMode");
    const pillsWrap = document.getElementById("rpPerfilViewPills");
    if (!select || !pillsWrap) return;

    let pref = "auto";
    if (window.RpGridView?.getPref) {
        pref = RpGridView.getPref();
    }
    syncPillsVistaPerfil(pref);

    pillsWrap.querySelectorAll(".rp-perfil-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.view || "auto";
            syncPillsVistaPerfil(val);
            if (window.RpGridView) {
                RpGridView.setPref(val, { skipAdjust: true });
            }
        });
    });
}

async function cargarPerfilUsuario() {
    const response = await fetch("/Usuarios/MiPerfil", {
        method: "GET",
        headers: authHeadersPerfil(false)
    });

    if (response.status === 401) {
        window.location.href = "/Login/";
        return;
    }

    if (!response.ok) {
        mostrarMensajePerfil("No se pudieron cargar tus datos.", "error");
        return;
    }

    const data = await response.json();
    document.getElementById("Id").value = data.Id || "";
    document.getElementById("Nombre").value = data.Nombre || "";
    document.getElementById("Apellido").value = data.Apellido || "";
    document.getElementById("DNI").value = data.Dni || "";
    document.getElementById("Telefono").value = data.Telefono || "";
    document.getElementById("Direccion").value = data.Direccion || "";
    document.getElementById("Correo").value = data.Correo || "";

    const badge = document.getElementById("rpPerfilUsuario");
    if (badge) badge.textContent = data.Usuario || "Usuario";

    actualizarAvatarPerfil(data.Nombre, data.Apellido);
}

document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("rp-perfil-body");
    if (window.RpGridView) {
        RpGridView.initConfigPanel();
    }
    initPillsVistaPerfil();
    cargarPerfilUsuario();
});

document.querySelector("#formularioActualizar")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    ocultarMensajePerfil();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    const pref = document.getElementById("rpConfigViewMode")?.value;
    if (pref && window.RpGridView) {
        RpGridView.setPref(pref, { skipAdjust: true });
    }

    const btnGuardar = document.getElementById("btnGuardar");
    if (btnGuardar) btnGuardar.disabled = true;

    try {
        const response = await fetch("/Usuarios/ActualizarPerfil", {
            method: "PUT",
            headers: authHeadersPerfil(true),
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            window.location.href = "/Login/";
            return;
        }

        const result = await response.json();

        if (result.valor === "Contrasena") {
            mostrarMensajePerfil('<i class="fa fa-exclamation-circle"></i> Contrasena actual incorrecta.', "error");
        } else if (result.valor === "Validacion") {
            mostrarMensajePerfil(`<i class="fa fa-exclamation-circle"></i> ${result.mensaje || "Complete los campos obligatorios."}`, "error");
        } else if (result.valor === "OK") {
            actualizarNombreNavbar(result.Nombre || data.Nombre, result.Apellido || data.Apellido);
            actualizarAvatarPerfil(result.Nombre || data.Nombre, result.Apellido || data.Apellido);
            document.getElementById("Contrasena").value = "";
            document.getElementById("ContrasenaNueva").value = "";
            mostrarMensajePerfil('<i class="fa fa-check-circle"></i> Datos guardados correctamente.', "ok");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            mostrarMensajePerfil('<i class="fa fa-exclamation-circle"></i> No se pudieron guardar los cambios.', "error");
        }
    } catch (err) {
        console.error(err);
        mostrarMensajePerfil('<i class="fa fa-exclamation-circle"></i> Ha ocurrido un error.', "error");
    } finally {
        if (btnGuardar) btnGuardar.disabled = false;
    }
});
