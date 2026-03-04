/**
 * Injects the Lucide icon library into served HTML so icons always render,
 * regardless of whether the AI included the script tags.
 *
 * Strategy:
 * 1. Strip any existing lucide <script> tags the AI may have added (avoid duplicates)
 * 2. Inject CDN link in <head> for early loading
 * 3. Inject createIcons() call + retry fallback before </body>
 */

const LUCIDE_CDN = `<script src="https://unpkg.com/lucide@0.473.0/dist/umd/lucide.min.js"></script>`;

const LUCIDE_INIT = `
<script>
(function(){
  var attempts=0;
  function init(){
    if(typeof lucide!=='undefined'){
      lucide.createIcons();
      // Re-run on any new elements added to the DOM (dynamic content)
      new MutationObserver(function(){ lucide.createIcons(); })
        .observe(document.body,{childList:true,subtree:true});
      return;
    }
    if(++attempts<30)setTimeout(init,300);
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}
  else{init()}
})();
</script>`;

export function injectLucide(html: string): string {
  // Remove any existing lucide script tags the AI may have inserted
  let cleaned = html.replace(
    /<script[^>]*lucide[^>]*>[\s\S]*?<\/script>/gi,
    ""
  );

  // Also remove standalone createIcons calls that might be orphaned
  cleaned = cleaned.replace(
    /<script>[^<]*lucide\.createIcons\(\)[^<]*<\/script>/gi,
    ""
  );

  // Inject CDN link in <head> for early loading
  if (cleaned.includes("</head>")) {
    cleaned = cleaned.replace("</head>", `${LUCIDE_CDN}\n</head>`);
  }

  // Inject init script before </body>
  if (cleaned.includes("</body>")) {
    return cleaned.replace("</body>", `${LUCIDE_INIT}\n</body>`);
  }

  // Fallback: append both if no proper HTML structure
  return cleaned + LUCIDE_CDN + LUCIDE_INIT;
}
