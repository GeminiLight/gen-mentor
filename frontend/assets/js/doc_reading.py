doc_reading_auto_scroll_js ="""
<script>
(function() {
    function scrollToHeading(doc, headingText) {
        if (!headingText) return false;
        const sels = ['h1','h2','h3','h4','h5'];
        for (const s of sels) {
            const nodes = doc.querySelectorAll(s);
            for (const n of nodes) {
                try {
                    if (n.textContent && n.textContent.trim() === headingText) {
                        n.scrollIntoView({ behavior: 'auto', block: 'start' });
                        return true;
                    }
                } catch (e) {}
            }
        }
        return false;
    }
    function ensureTopAnchor(doc) {
        try {
            let anchor = doc.getElementById('gm-top-anchor');
            if (!anchor) {
                anchor = doc.createElement('div');
                anchor.id = 'gm-top-anchor';
                anchor.style.position = 'absolute';
                anchor.style.top = '0';
                if (doc.body && doc.body.firstChild) {
                    doc.body.insertBefore(anchor, doc.body.firstChild);
                } else if (doc.body) {
                    doc.body.appendChild(anchor);
                }
            }
            return anchor;
        } catch (e) { return null; }
    }
    function doScroll(doc) {
        try {
            const anchor = ensureTopAnchor(doc);
            if (anchor && typeof anchor.scrollIntoView === 'function') {
                anchor.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        } catch (e) {}
        try { doc.defaultView && doc.defaultView.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {}
        try { doc.documentElement && (doc.documentElement.scrollTop = 0); } catch (e) {}
        try { doc.body && (doc.body.scrollTop = 0); } catch (e) {}
        const selectors = [
            '[data-testid="stAppViewContainer"]',
            'section.main',
            'main.main',
            'div.block-container',
            '#root',
            '.stApp'
        ];
        for (const sel of selectors) {
            try {
                const el = doc.querySelector(sel);
                if (el) {
                    if (typeof el.scrollTo === 'function') {
                        el.scrollTo({ top: 0, behavior: 'auto' });
                    } else {
                        el.scrollTop = 0;
                    }
                }
            } catch (e) {}
        }
    }
    let tries = 0;
    function run() {
        const pendingAnchor = PENDING_ANCHOR_PLACEHOLDER;
        if (pendingAnchor) {
            // Try to scroll to specific heading
            let ok = scrollToHeading(document, pendingAnchor);
            try { if (!ok && window.parent && window.parent.document) ok = scrollToHeading(window.parent.document, pendingAnchor); } catch (e) {}
            if (!ok) {
                doScroll(document);
                try { if (window.parent && window.parent.document) doScroll(window.parent.document); } catch (e) {}
            }
        } else {
            doScroll(document);
            try { if (window.parent && window.parent.document) doScroll(window.parent.document); } catch (e) {}
        }
        if (++tries < 5) setTimeout(run, 60);
    }
    if (document.readyState === 'complete') {
        requestAnimationFrame(run);
        setTimeout(run, 0);
    } else {
        window.addEventListener('load', run);
        setTimeout(run, 0);
    }
})();
</script>
"""