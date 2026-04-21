/// <reference types="vite/client" />

declare module "*.{css,scss,less,sass}" {
  const content: string;
  export default content;
}
