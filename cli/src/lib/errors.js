/** Error esperado (mal uso, archivo que no existe...): se muestra como mensaje limpio, sin traza. code = código de salida. */
export class CliError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}
