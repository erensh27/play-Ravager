# Play Ravager

A complete browser interface for **Ravager 2**, Abhinav Tiwari's hybrid NNUE chess engine in C. The engine is compiled to WebAssembly and its 640-hidden-unit Leorik-format NNUE is packaged with the build, so gameplay happens entirely on-device.

**Live:** https://erensh27.github.io/play-Ravager/

## What ships

- Actual Ravager 2 search and NNUE evaluation compiled from C to WebAssembly
- Legal move handling, castling, en passant, promotion, checkmate, draws and PGN export
- Play as White or Black, flip the board, choose engine think time and undo a full turn
- Responsive desktop and mobile interface
- No backend, API, analytics or game upload

## Build locally

The deployed files are in `web/`. To rebuild the engine, install the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html), then:

```bash
EMSDK=/path/to/emsdk ./scripts/build-wasm.sh
python3 -m http.server 8080 -d web
```

Open `http://localhost:8080`. WebAssembly workers require HTTP; opening `index.html` directly from disk will not work.

## Architecture

The UI uses a vendored ES module build of chess.js for browser-side game rules. A Web Worker owns the WebAssembly module so Ravager's synchronous search never blocks the interface. `src/web_api.c` is the small bridge into the original engine, and `src/tb_syzygy_web.c` disables optional file-based Syzygy probes for the browser target. The NNUE remains included and mandatory.

## Upstream

Engine source: [erensh27/Ravager](https://github.com/erensh27/Ravager), latest Ravager 2 default-branch source at project creation.

## License

MIT. See [LICENSE](LICENSE). chess.js is BSD-2-Clause licensed.
