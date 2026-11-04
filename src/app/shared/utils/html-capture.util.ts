export interface CaptureOptions {
  /** Size of the element in CSS px. */
  width: number;
  height: number;
  /** Pixel density of the output (2 = twice the CSS size). */
  scale?: number;
  quality?: number;
  backgroundColor?: string;
}

/**
 * Rasterises an element to a JPEG with html2canvas.
 *
 * html2canvas renders from a private copy of the whole page, so the copy is cleaned up first:
 *  - While a dialog is open the CDK locks page scroll with `html { position: fixed; top: -<scrollY>px }`
 *    (class cdk-global-scrollblock). The clone inherits that, which pushes the element out of view and
 *    exports a blank image whenever the page was scrolled.
 *  - Fixed/sticky chrome (app toolbar, dialog backdrop) could paint over the top of the element.
 * So in the copy only, the element is lifted to the body at 0,0 and everything else is dropped.
 * The element may sit off-screen in the live page; it must not be `display:none`.
 *
 * Images must be same-origin or blob/data URLs — cross-origin images (the storage bucket sends no CORS
 * headers) are silently skipped, so load them through the API image proxy first.
 */
export async function renderElementToJpeg(el: HTMLElement, o: CaptureOptions): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  await document.fonts?.ready;

  const canvas = await html2canvas(el, {
    scale: o.scale ?? 2,
    useCORS: true,
    backgroundColor: o.backgroundColor ?? '#ffffff',
    logging: false,
    width: o.width,
    height: o.height,
    windowWidth: o.width,
    windowHeight: o.height,
    scrollX: 0,
    scrollY: 0,
    onclone: (doc, cloned) => {
      doc.documentElement.className = '';
      doc.body.className = '';
      doc.body.replaceChildren(cloned);
      Object.assign(doc.documentElement.style, {
        position: 'static', top: 'auto', left: 'auto', margin: '0', padding: '0',
        background: 'transparent', overflow: 'visible', width: `${o.width}px`, height: `${o.height}px`,
      });
      Object.assign(doc.body.style, {
        margin: '0', padding: '0', overflow: 'visible', position: 'relative',
        width: `${o.width}px`, height: `${o.height}px`,
      });
      Object.assign(cloned.style, { position: 'absolute', left: '0', top: '0', margin: '0', transform: 'none' });
    },
  });

  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', o.quality ?? 0.92));
  if (!blob) throw new Error('Could not create the image.');
  return blob;
}
