declare module "qrcode-terminal" {
  const qrcode: {
    generate(input: string, options?: { small?: boolean }, cb?: (qrcode: string) => void): void;
  };
  export default qrcode;
}

