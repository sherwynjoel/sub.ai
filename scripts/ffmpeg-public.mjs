// The video engine exports run on the user's device (lib/deviceExport.ts): copied from the installed packages into
// public/ffmpeg on every install, so the 32 MB WebAssembly files stay out of the repository.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const out = "public/ffmpeg";
const { version: core } = JSON.parse(await readFile("node_modules/@ffmpeg/core/package.json", "utf8"));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ["index", "classes", "const", "errors", "types", "utils", "worker"]) await cp(`node_modules/@ffmpeg/ffmpeg/dist/esm/${f}.js`, `${out}/${f}.js`);
await cp("node_modules/@ffmpeg/core/dist/esm", `${out}/st`, { recursive: true });
await cp("node_modules/@ffmpeg/core-mt/dist/esm", `${out}/mt`, { recursive: true });
await writeFile(`${out}/NOTICE.txt`, `The video engine in this folder is FFmpeg 5.1.4 with libx264, libx265, libass and other libraries, built for WebAssembly
by ffmpeg.wasm (@ffmpeg/core ${core}). Vasanamm has not changed it.
It is licensed under the GNU General Public License, version 2 or later: see GPL-2.0.txt beside this file.
It comes with no warranty. The loader (@ffmpeg/ffmpeg) is under the MIT licence.
The full list of parts, their licences and the complete source code: the /licences page of the Vasanamm website.
`);
await cp("public/licences/GPL-2.0.txt", `${out}/GPL-2.0.txt`);
