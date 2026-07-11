/**
 * Type shim for mermaid's self-contained ESM bundle (no .d.ts ships
 * next to it). The API is identical to the package root export.
 */
declare module "mermaid/dist/mermaid.esm.min.mjs" {
  import mermaid from "mermaid";
  export default mermaid;
}
