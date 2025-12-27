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
      asar: true, // empacota tudo em app.asar
      prune: true,
      ignore: [/dist/, /node_modules/, /map-editor/, /server/],
      executableName: 'ChaosWar',
    });
    console.log('Build concluído! Executável gerado em:', appPaths);
    console.log('Recomendações de segurança:');
    console.log('- O código JS estará em resources/app.asar. Isso dificulta, mas não impede engenharia reversa.');
    console.log('- Para maior proteção, minifique e ofusque o código JS antes do build (ex: usando Terser, UglifyJS ou Webpack).');
    console.log('- Distribua apenas o .exe, DLLs e resources/app.asar. Não compartilhe o código-fonte nem assets soltos.');
    console.log('Build concluído! Executável gerado em:', appPaths);
  } catch (err) {
    console.error('Erro ao gerar o .exe:', err);
  }
}

build();
