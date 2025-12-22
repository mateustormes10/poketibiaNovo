// build-exe.mjs
// Script para empacotar o projeto Electron em um .exe usando ES module

import { packager } from '@electron/packager';

async function build() {
  try {
    const appPaths = await packager({
      dir: '.',
      out: 'dist',
      overwrite: true,
      platform: 'win32',
      arch: 'x64',
      icon: 'client/assets/icon.ico',
      asar: false,
      prune: true,
      ignore: [/dist/, /node_modules/, /map-editor/, /server/],
      executableName: 'PoketibiaMenu',
    });
    console.log('Build concluído! Executável gerado em:', appPaths);
  } catch (err) {
    console.error('Erro ao gerar o .exe:', err);
  }
}

build();
