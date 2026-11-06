// The video engine exports run on the user's device (lib/deviceExport.ts): copied from the installed packages into
// public/ffmpeg on every install, so the 32 MB WebAssembly files stay out of the repository.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const out = "public/ffmpeg";
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ["index", "classes", "const", "errors", "types", "utils", "worker"]) await cp(`node_modules/@ffmpeg/ffmpeg/dist/esm/${f}.js`, `${out}/${f}.js`);
await cp("node_modules/@ffmpeg/core/dist/esm", `${out}/st`, { recursive: true });
await cp("node_modules/@ffmpeg/core-mt/dist/esm", `${out}/mt`, { recursive: true });
await writeFile(`${out}/NOTICE.txt`, `The video engine in this folder is FFmpeg with libx264 and libass, built for WebAssembly by ffmpeg.wasm.
It is licensed under the GNU General Public License, version 2 or later: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
Source: https://github.com/ffmpegwasm/ffmpeg.wasm and https://ffmpeg.org
`);
