/**
 * Gestión de sesión JWT: duración, contador en navbar, expiración y redirección al login.
 */
(function (window) {
    "use strict";

    const STORAGE_TOKEN = "JwtToken";
    const STORAGE_USER = "userSession";
    const STORAGE_EXPIRES = "sessionExpiresAt";
    const KEY_SESION_EXPIRADA = "sesionExpirada";
    const KEY_LOGOUT_VOLUNTARIO = "logoutVoluntario";

    let countdownTimer = null;
    let expiredModalShown = false;
    let voluntaryLogout = false;

    function isLoginPage() {
        const path = (window.location.pathname || "").toLowerCase();
        return path.includes("/login");
    }

    function pad2(n) {
        return String(n).padStart(2, "0");
    }

    function decodeJwtExpMs(token) {
        if (!token || token.split(".").length < 2) return null;
        try {
            const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );
            const payload = JSON.parse(json);
            if (payload.exp) return payload.exp * 1000;
        } catch (e) {
            console.warn("SessionManager: no se pudo leer exp del token", e);
        }
        return null;
    }

    function getExpiresAtMs() {
        const stored = localStorage.getItem(STORAGE_EXPIRES);
        if (stored) {
            const n = parseInt(stored, 10);
            if (!Number.isNaN(n)) return n;
        }
        return decodeJwtExpMs(localStorage.getItem(STORAGE_TOKEN));
    }

    function getToken() {
        return localStorage.getItem(STORAGE_TOKEN);
    }

    function isSessionValid() {
        const token = getToken();
        if (!token) return false;
        const exp = getExpiresAtMs();
        if (!exp) return false;
        return Date.now() < exp;
    }

    function isSessionExpired() {
        const exp = getExpiresAtMs();
        return !!exp && Date.now() >= exp;
    }

    function stopCountdown() {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_EXPIRES);
        window.token = null;
    }

    function markSessionExpired() {
        sessionStorage.setItem(KEY_SESION_EXPIRADA, "1");
    }

    function clearExpiredFlag() {
        sessionStorage.removeItem(KEY_SESION_EXPIRADA);
    }

    function redirectToLogin(expired) {
        stopCountdown();
        clearSession();

        if (isLoginPage()) return;

        if (expired) {
            markSessionExpired();
        }

        window.location.replace("/Login/Index");
    }

    /** Cierre de sesión manual (navbar): sin mensaje de expiración. */
    function beginVoluntaryLogout() {
        voluntaryLogout = true;
        stopCountdown();
        clearExpiredFlag();
        sessionStorage.setItem(KEY_LOGOUT_VOLUNTARIO, "1");
        clearSession();
    }

    function formatRemaining(ms) {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    }

    function updateCountdownUi() {
        const wrap = document.getElementById("sessionCountdown");
        const text = document.getElementById("sessionCountdownText");
        if (!text) return true;

        if (!isSessionValid()) {
            text.textContent = "00:00:00";
            if (wrap) {
                wrap.classList.add("rp-session-expired");
                wrap.classList.remove("rp-session-warning");
            }
            return false;
        }

        const remaining = getExpiresAtMs() - Date.now();
        text.textContent = formatRemaining(remaining);

        if (wrap) {
            wrap.classList.remove("rp-session-expired");
            wrap.classList.toggle("rp-session-warning", remaining > 0 && remaining < 5 * 60 * 1000);
        }
        return true;
    }

    function showSessionExpiredModal() {
        if (expiredModalShown || isLoginPage() || voluntaryLogout) return;
        expiredModalShown = true;
        markSessionExpired();

        stopCountdown();

        const modalEl = document.getElementById("modalSessionExpirada");
        if (!modalEl || !window.bootstrap?.Modal) {
            redirectToLogin(true);
            return;
        }

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: "static",
            keyboard: false
        });

        const btn = document.getElementById("btnSessionExpiradaAceptar");
        if (btn) {
            btn.onclick = () => {
                modal.hide();
                redirectToLogin(true);
            };
        }

        modalEl.addEventListener("hidden.bs.modal", () => {
            redirectToLogin(true);
        }, { once: true });

        modal.show();
    }

    function handleSessionExpired() {
        if (voluntaryLogout || isLoginPage()) return;

        if (isSessionExpired() || sessionStorage.getItem(KEY_SESION_EXPIRADA) === "1") {
            markSessionExpired();
            showSessionExpiredModal();
            return;
        }

        redirectToLogin(false);
    }

    function startCountdown() {
        stopCountdown();

        if (!updateCountdownUi()) {
            handleSessionExpired();
            return;
        }

        countdownTimer = setInterval(() => {
            if (voluntaryLogout) return;
            if (!updateCountdownUi()) {
                handleSessionExpired();
            }
        }, 1000);
    }

    function installFetchInterceptor() {
        if (window.__fetchSessionPatched) return;
        window.__fetchSessionPatched = true;

        const originalFetch = window.fetch.bind(window);
        window.fetch = async function (input, init) {
            if (voluntaryLogout || isLoginPage()) {
                return originalFetch(input, init);
            }

            if (!isSessionValid()) {
                handleSessionExpired();
                return new Response(null, { status: 401, statusText: "Session expired" });
            }

            const response = await originalFetch(input, init);

            if (response.status === 401 && !voluntaryLogout) {
                handleSessionExpired();
            }

            return response;
        };
    }

    function setSession(token, user, expiresAtMs) {
        if (!token) return;

        voluntaryLogout = false;
        clearExpiredFlag();
        sessionStorage.removeItem(KEY_LOGOUT_VOLUNTARIO);

        let exp = expiresAtMs;
        if (!exp) exp = decodeJwtExpMs(token);

        localStorage.setItem(STORAGE_TOKEN, token);
        if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
        if (exp) localStorage.setItem(STORAGE_EXPIRES, String(exp));

        window.token = token;
        expiredModalShown = false;
    }

    function guardPage() {
        if (isLoginPage()) {
            const logoutVoluntario = sessionStorage.getItem(KEY_LOGOUT_VOLUNTARIO) === "1";
            sessionStorage.removeItem(KEY_LOGOUT_VOLUNTARIO);

            if (logoutVoluntario) {
                clearExpiredFlag();
            }

            if (isSessionValid()) {
                window.location.replace("/Usuarios");
            } else {
                clearSession();
            }
            return;
        }

        if (!isSessionValid()) {
            if (voluntaryLogout || sessionStorage.getItem(KEY_LOGOUT_VOLUNTARIO) === "1") {
                redirectToLogin(false);
                return;
            }

            if (isSessionExpired()) {
                handleSessionExpired();
            } else {
                redirectToLogin(false);
            }
            return;
        }

        window.token = getToken();
        installFetchInterceptor();
        startCountdown();
    }

    function shouldShowExpiredMessageOnLogin() {
        if (sessionStorage.getItem(KEY_LOGOUT_VOLUNTARIO) === "1") {
            return false;
        }
        return sessionStorage.getItem(KEY_SESION_EXPIRADA) === "1";
    }

    function consumeExpiredMessageOnLogin() {
        const show = shouldShowExpiredMessageOnLogin();
        clearExpiredFlag();
        sessionStorage.removeItem(KEY_LOGOUT_VOLUNTARIO);
        return show;
    }

    function init() {
        if (window.__sessionManagerInitialized) return;
        window.__sessionManagerInitialized = true;

        guardPage();

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && !isLoginPage() && !voluntaryLogout) {
                if (!isSessionValid()) handleSessionExpired();
                else updateCountdownUi();
            }
        });
    }

    window.SessionManager = {
        setSession,
        clearSession,
        beginVoluntaryLogout,
        getToken,
        isSessionValid,
        getExpiresAtMs,
        decodeJwtExpMs,
        redirectToLogin,
        handleSessionExpired,
        startCountdown,
        stopCountdown,
        guardPage,
        formatRemaining,
        shouldShowExpiredMessageOnLogin,
        consumeExpiredMessageOnLogin
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(window);
