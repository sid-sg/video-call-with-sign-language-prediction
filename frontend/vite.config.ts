import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.{wasm,mjs}',
          dest: 'onnx-wasm'
        }
      ]
    })
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import tailwindcss from '@tailwindcss/vite';
// import { viteStaticCopy } from 'vite-plugin-static-copy';

// export default defineConfig({
//   plugins: [
//     react(),
//     tailwindcss(),
//     viteStaticCopy({
//       targets: [
//         { src: 'node_modules/onnxruntime-web/dist/*.{wasm,mjs}', dest: 'onnx-wasm' },
//         { src: 'node_modules/@mediapipe/hands/*.{wasm,js,data,tflite,binarypb}', dest: 'mediapipe/hands' }
//       ]
//     })
//   ],
//   worker: {
//     format: 'es'
//   },
//   optimizeDeps: {
//     exclude: ['onnxruntime-web', '@mediapipe/hands', '@mediapipe/camera_utils'],
//   },

//   build: {
//     rollupOptions: {
//       output: {
//         manualChunks: undefined
//       }
//     }
//   }
// });
