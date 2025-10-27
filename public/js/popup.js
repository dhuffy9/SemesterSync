(function () {
    const STORAGE_KEY = "disclaimerDismissed";
  
    function isDismissed() {
      try {
        return localStorage.getItem(STORAGE_KEY) === "true";
      } catch (e) {
        return false;
      }
    }
  
    function setDismissed(val) {
      try {
        localStorage.setItem(STORAGE_KEY, val ? "true" : "false");
      } catch (e) {
        // ignore storage errors
      }
    }
  
    function trapFocus(modal) {
      const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(modal.querySelectorAll(focusableSelector)).filter(
        el => !el.hasAttribute('disabled')
      );
      if (!nodes.length) return () => {};
  
      let first = nodes[0];
      let last = nodes[nodes.length - 1];
  
      function handleKey(e) {
        if (e.key !== "Tab") return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  
    function showModal() {
      const overlay = document.getElementById("disclaimer-overlay");
      const modal = document.getElementById("disclaimer-modal");
      const closeBtn = document.getElementById("disclaimer-close");
      const actionBtn = document.getElementById("disclaimer-action");
      const noShow = document.getElementById("disclaimer-no-show");
  
      if (!overlay || !modal || !closeBtn) return;
  
      // remember previously focused element
      const previousFocus = document.activeElement;
  
      overlay.classList.remove("hidden");
      modal.classList.remove("hidden");
      overlay.setAttribute("aria-hidden", "false");
      modal.setAttribute("aria-hidden", "false");
      modal.setAttribute("tabindex", "-1");
  
      // focus management
      closeBtn.focus();
      const releaseFocusTrap = trapFocus(modal);
  
      function close(cleanSave = true) {
        overlay.classList.add("hidden");
        modal.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        modal.setAttribute("aria-hidden", "true");
        if (cleanSave && noShow && noShow.checked) setDismissed(true);
        releaseHandlers();
        if (typeof previousFocus?.focus === "function") previousFocus.focus();
        releaseFocusTrap();
      }
  
      function onOverlayClick(e) {
        if (e.target === overlay) close();
      }
      function onEsc(e) {
        if (e.key === "Escape") close();
      }
      function onAction() {
        // Example action: just close (could be wired to "Got it" action)
        close();
      }
  
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onEsc);
      closeBtn.addEventListener("click", () => close());
      if (actionBtn) actionBtn.addEventListener("click", onAction);
  
      function releaseHandlers() {
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onEsc);
        closeBtn.removeEventListener("click", () => close());
        if (actionBtn) actionBtn.removeEventListener("click", onAction);
      }
    }
  
    function init() {
      if (isDismissed()) return;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showModal);
      } else {
        showModal();
      }
    }
  
    // Expose for testing if needed
    window.__disclaimer = { init, showModal, setDismissed };
  
    init();
  })();