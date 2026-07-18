// CSS type declarations for the web side of the Expo template (global.css +
// *.module.css imports). Without these, `tsc --noEmit` fails on the template's
// own files; Metro/webpack handle the actual loading.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
