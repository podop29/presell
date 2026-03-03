/**
 * Injects the Lucide icon library into served HTML so icons always render,
 * regardless of whether the AI included the script tags.
 *
 * Strategy:
 * 1. Strip any existing lucide <script> tags the AI may have added (avoid duplicates)
 * 2. Inject a pinned-version script with an onload callback + retry fallback
 */

const LUCIDE_SCRIPT = `
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js" onload="lucide.createIcons()"></script>
<script>
(function(){
  var attempts=0;
  function init(){
    if(typeof lucide!=='undefined'){lucide.createIcons();return}
    if(++attempts<20)setTimeout(init,300);
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

  // Inject before </body> if present, otherwise append
  if (cleaned.includes("</body>")) {
    return cleaned.replace("</body>", `${LUCIDE_SCRIPT}\n</body>`);
  }
  return cleaned + LUCIDE_SCRIPT;
}
