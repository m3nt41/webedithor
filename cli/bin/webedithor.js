#!/usr/bin/env node
// Punto de entrada de la CLI.
//  - Desde un clon del repo existe ../src y se usa tal cual (sin compilar nada).
//  - En el paquete de npm solo viaja ../dist/cli.js (el bundle), que ya trae adentro el código del editor.
import { existsSync } from 'node:fs';

const DESDE_FUENTE = new URL('../src/cli.js', import.meta.url);
const BUNDLE = new URL('../dist/cli.js', import.meta.url);
const { main } = await import(existsSync(DESDE_FUENTE) ? DESDE_FUENTE.href : BUNDLE.href);

process.exitCode = await main(process.argv.slice(2));
