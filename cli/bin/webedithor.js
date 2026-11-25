#!/usr/bin/env node
// Punto de entrada de la CLI. Toda la lógica vive en ../src/cli.js.
import { main } from '../src/cli.js';

process.exitCode = await main(process.argv.slice(2));
